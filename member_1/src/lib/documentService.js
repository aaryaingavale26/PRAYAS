/**
 * Document Hub Service (knowledge sources)
 * All documents live on the backend, scoped to the signed-in user. Nothing is stored in
 * localStorage and there are no sample/fake documents.
 */
import { apiRequest, apiUpload } from "@/lib/apiClient";

// Standard allowed file extensions and maximum size (10MB). Matches server-side validation.
export const ALLOWED_EXTENSIONS = [".pdf", ".docx", ".txt"];
export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

export const DOC_TYPES = [
  { value: "resume", label: "Resume / CV" },
  { value: "cover_letter", label: "Cover letter" },
  { value: "project", label: "Project document" },
  { value: "certificate", label: "Certificate" },
  { value: "other", label: "Other" },
];

/** Client-side pre-check (the server validates again). Returns an error string or null. */
export function validateFile(file) {
  if (!file) return "Please choose a file.";
  const ext = "." + (file.name.split(".").pop() || "").toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return `Unsupported file type (${ext}). Please upload a PDF, DOCX or TXT file.`;
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return `This file is too large (${(file.size / (1024 * 1024)).toFixed(1)} MB). The maximum is 10 MB.`;
  }
  if (file.size === 0) return "This file is empty.";
  return null;
}

function notify(docs) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("prayas-documents-updated", { detail: docs }));
  }
}

function normalize(d) {
  return {
    id: d.id,
    name: d.name,
    category: d.doc_type,
    sizeBytes: d.size_bytes || 0,
    uploadedAt: d.uploaded_at,
    status: d.index_status, // pending | indexing | indexed | failed | empty
    error: d.index_error,
    chunkCount: d.chunk_count || 0,
    isProfile: Boolean(d.is_profile),
  };
}

/** List the signed-in user's knowledge sources (including the profile pseudo-document). */
export async function getDocuments() {
  const data = await apiRequest("/api/v1/documents");
  return (data.documents || []).map(normalize);
}

/** Upload a document as a given type. Returns the backend upload response. */
export async function uploadDocument(file, category = "other", onProgress) {
  const problem = validateFile(file);
  if (problem) throw new Error(problem);
  const form = new FormData();
  form.append("file", file);
  form.append("doc_type", category);
  const res = await apiUpload("/api/v1/documents/upload", form, onProgress);
  notify(null);
  return res;
}

export async function deleteDocument(docId) {
  await apiRequest(`/api/v1/documents/${encodeURIComponent(docId)}`, { method: "DELETE" });
  notify(null);
}

export async function reindexDocument(docId) {
  const res = await apiRequest(`/api/v1/documents/${encodeURIComponent(docId)}/reindex`, { method: "POST" });
  notify(null);
  return res;
}

export async function reindexProfile() {
  return apiRequest("/api/v1/documents/profile/reindex", { method: "POST" });
}

/** Short-lived signed URL for viewing a private file. */
export async function getDocumentUrl(docId) {
  const res = await apiRequest(`/api/v1/documents/${encodeURIComponent(docId)}/url`);
  return res.url;
}

/**
 * Format bytes into human readable size
 */
export function formatBytes(bytes) {
  if (!bytes) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}
