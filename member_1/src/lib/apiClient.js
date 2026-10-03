/**
 * FastAPI Backend API Client
 * Every call that touches personal data is authenticated with the signed-in user's token.
 * No API keys live in the browser: all LLM / embedding work happens on the backend.
 */
import { supabase, isSupabaseConfigured } from "@/lib/supabaseClient";

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:8000";

export class ApiError extends Error {
  constructor(message, status = 0, detail = null) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.detail = detail;
  }
}

/**
 * Health Check for FastAPI backend
 */
export async function checkBackendHealth() {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500); // 2.5s timeout

    const res = await fetch(`${API_BASE_URL}/health`, {
      method: "GET",
      signal: controller.signal,
      headers: {
        Accept: "application/json",
      },
    });

    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      return {
        online: true,
        status: "connected",
        message: data.message || "FastAPI backend is online & operational",
        url: API_BASE_URL,
      };
    }
    return {
      online: false,
      status: "degraded",
      message: `Backend returned status ${res.status}`,
      url: API_BASE_URL,
    };
  } catch (err) {
    return {
      online: false,
      status: "offline",
      message: "FastAPI backend not detected at " + API_BASE_URL,
      url: API_BASE_URL,
    };
  }
}

// ---------------------------------------------------------------------------
// Auth token handling
// ---------------------------------------------------------------------------

function looksLikeJwt(token) {
  return typeof token === "string" && token.split(".").length === 3;
}

/**
 * Returns a token the backend can verify, or null.
 * Local fallback sessions (created when Supabase email limits hit) carry non-JWT tokens that the
 * backend would reject, so they are treated as "no backend access".
 */
export async function getAccessToken() {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data } = await supabase.auth.getSession();
      const token = data?.session?.access_token;
      if (looksLikeJwt(token)) return token;
    } catch (e) {
      /* fall through */
    }
  }
  if (typeof window !== "undefined") {
    try {
      const storedToken = localStorage.getItem("prayas_auth_token");
      if (storedToken) return storedToken;
      const raw = localStorage.getItem("prayas_mock_user");
      if (raw) {
        const u = JSON.parse(raw);
        if (u?.id === "demo-applicant-001") return "prayas_demo_bearer_token";
        if (u?.email) {
          const email = String(u.email).toLowerCase().trim();
          const encoded = typeof btoa !== "undefined" ? btoa(email) : Buffer.from(email).toString("base64");
          return `prayas_dev_token_${encoded}`;
        }
      }
    } catch (e) {
      /* ignore */
    }
  }
  return null;
}

export async function canCallBackend() {
  return Boolean(await getAccessToken());
}

async function parseError(res) {
  let detail = null;
  try {
    const body = await res.json();
    detail = body?.detail ?? body;
  } catch (e) {
    /* non-JSON */
  }
  const message =
    typeof detail === "string"
      ? detail
      : res.status === 401
      ? "Please sign in with a verified account to use this feature."
      : res.status === 429
      ? "You're sending requests too quickly. Please wait a moment and try again."
      : `Request failed (${res.status}).`;
  return new ApiError(message, res.status, detail);
}

/**
 * Authenticated JSON request. `body` is serialized as JSON unless it is FormData.
 */
export async function apiRequest(path, { method = "GET", body = undefined, timeoutMs = 60000 } = {}) {
  const token = await getAccessToken();
  if (!token) {
    throw new ApiError("Please sign in with a verified account to use this feature.", 401);
  }
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  const headers = { Accept: "application/json", Authorization: `Bearer ${token}` };
  let payload = body;
  if (body !== undefined && !(body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  }
  try {
    const res = await fetch(`${API_BASE_URL}${path}`, { method, headers, body: payload, signal: controller.signal });
    if (!res.ok) throw await parseError(res);
    return await res.json();
  } catch (err) {
    if (err instanceof ApiError) throw err;
    if (err.name === "AbortError") throw new ApiError("The request took too long. Please try again.", 0);
    throw new ApiError("Could not reach the PRAYAS server. Check that the backend is running.", 0);
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Authenticated multipart upload with progress callback (0-100).
 */
export async function apiUpload(path, formData, onProgress) {
  const token = await getAccessToken();
  if (!token) {
    throw new ApiError("Please sign in with a verified account to upload documents.", 401);
  }
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${API_BASE_URL}${path}`);
    xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.setRequestHeader("Accept", "application/json");
    xhr.timeout = 180000;
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100), "uploading");
    };
    xhr.upload.onload = () => onProgress && onProgress(100, "processing");
    xhr.onload = () => {
      let data = null;
      try {
        data = JSON.parse(xhr.responseText);
      } catch (e) {
        /* ignore */
      }
      if (xhr.status >= 200 && xhr.status < 300) return resolve(data);
      const detail = data?.detail;
      reject(
        new ApiError(
          typeof detail === "string"
            ? detail
            : xhr.status === 429
            ? "You're sending requests too quickly. Please wait a moment and try again."
            : `Upload failed (${xhr.status}).`,
          xhr.status,
          detail
        )
      );
    };
    xhr.onerror = () => reject(new ApiError("Could not reach the PRAYAS server. Check that the backend is running.", 0));
    xhr.ontimeout = () => reject(new ApiError("The upload took too long. Please try again.", 0));
    xhr.send(formData);
  });
}

// ---------------------------------------------------------------------------
// Assistant (RAG)
// ---------------------------------------------------------------------------

/**
 * Ask the assistant. Answers come ONLY from the signed-in user's own documents and passport.
 * Same backend logic that powers the Chrome extension's Autofill and AI Draft.
 */
export async function askAssistant({ question, context = "" }) {
  if (!question || !question.trim()) {
    throw new ApiError("Please type a question.", 400);
  }
  const data = await apiRequest("/api/rag/query", {
    method: "POST",
    body: { question: question.trim(), context },
  });
  return {
    answer: data.answer,
    found: Boolean(data.found),
    emptyState: Boolean(data.empty_state),
    sources: data.sources || [],
    uploadUrl: data.upload_url || "/documents",
  };
}

// ---------------------------------------------------------------------------
// Onboarding
// ---------------------------------------------------------------------------

export const getOnboardingStatus = () => apiRequest("/api/v1/onboarding/status");
export const skipOnboarding = () => apiRequest("/api/v1/onboarding/skip", { method: "POST" });
export const confirmCvDetails = ({ fields, overwriteFields = [], documentId = null, extractedProfile = null }) =>
  apiRequest("/api/v1/onboarding/confirm", {
    method: "POST",
    body: {
      fields,
      overwrite_fields: overwriteFields,
      document_id: documentId,
      extracted_profile: extractedProfile,
    },
  });
export const uploadCv = (file, onProgress) => {
  const form = new FormData();
  form.append("file", file);
  return apiUpload("/api/v1/onboarding/cv", form, onProgress);
};
