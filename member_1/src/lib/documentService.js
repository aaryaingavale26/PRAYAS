/**
 * Document Hub Service
 * Manages applicant resumes, cover letters, and project portfolios
 * Coordinates with FastAPI backend (Member 2) and provides local storage fallback
 */

const STORAGE_KEY = "prayas_uploaded_documents";
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

// Standard allowed file extensions and maximum size (10MB)
export const ALLOWED_EXTENSIONS = [".pdf", ".docx", ".doc", ".txt"];
export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

export const DEFAULT_SAMPLE_DOCS = [
  {
    id: "doc-sample-1",
    name: "Rahul_Sharma_Frontend_Resume.pdf",
    category: "resume",
    sizeBytes: 1024 * 340, // 340 KB
    uploadedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    status: "indexed", // "indexed" | "processing" | "ready"
    summary: "Senior Frontend Engineer with 4+ years of experience in React, Next.js, WCAG 2.2 accessibility, and Tailwind CSS. Specializes in building accessible web applications.",
    skills: ["React", "Next.js", "WCAG 2.2", "Tailwind CSS", "JavaScript", "ARIA Standards"],
  },
  {
    id: "doc-sample-2",
    name: "Accessibility_Cover_Letter.docx",
    category: "cover_letter",
    sizeBytes: 1024 * 85, // 85 KB
    uploadedAt: new Date(Date.now() - 86400000).toISOString(),
    status: "indexed",
    summary: "Personalized statement highlighting passion for inclusive web technologies, cross-functional collaboration, and accessibility-first engineering principles.",
    skills: ["Inclusive Design", "Team Leadership", "Assistive Tech Integration"],
  },
];

/**
 * Fetch list of all uploaded documents
 */
export async function getDocuments() {
  if (typeof window === "undefined") return DEFAULT_SAMPLE_DOCS;

  // Try reading from localStorage first
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (e) {
      console.error("Failed to parse stored documents", e);
    }
  }

  // Initialize with sample documents if empty
  localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_SAMPLE_DOCS));
  return DEFAULT_SAMPLE_DOCS;
}

/**
 * Upload a new applicant document
 */
export async function uploadDocument(file, category = "resume", onProgress) {
  // 1. Client-side validation
  const ext = "." + file.name.split(".").pop().toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    throw new Error(`Unsupported file type: ${ext}. Please upload a PDF, DOCX, DOC, or TXT file.`);
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error(`File is too large (${(file.size / (1024 * 1024)).toFixed(1)}MB). Maximum allowed size is 10MB.`);
  }

  // 2. Try FastAPI Backend if available
  let backendResponse = null;
  try {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("category", category);

    const res = await fetch(`${API_BASE_URL}/api/documents/upload`, {
      method: "POST",
      body: formData,
      // Note: Do not set Content-Type header manually when sending FormData
    });

    if (res.ok) {
      backendResponse = await res.json();
    }
  } catch (backendError) {
    console.info("FastAPI backend not reachable at localhost:8000. Storing document locally for hackathon demo.", backendError.message);
  }

  // 3. Create document record
  const newDoc = {
    id: backendResponse?.id || `doc-${Date.now()}`,
    name: file.name,
    category,
    sizeBytes: file.size,
    uploadedAt: new Date().toISOString(),
    status: "indexed",
    summary: backendResponse?.summary || `Uploaded document (${file.name}) indexed by PRAYAS RAG engine. Available for automatic form answer generation.`,
    skills: backendResponse?.skills || ["Extracted by PRAYAS AI Engine"],
  };

  // 4. Save to local storage
  const currentDocs = await getDocuments();
  const updatedDocs = [newDoc, ...currentDocs];
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedDocs));
    window.dispatchEvent(new CustomEvent("prayas-documents-updated", { detail: updatedDocs }));
  }

  return newDoc;
}

/**
 * Delete a document by ID
 */
export async function deleteDocument(docId) {
  // Try backend delete
  try {
    await fetch(`${API_BASE_URL}/api/documents/${docId}`, {
      method: "DELETE",
    });
  } catch (e) {
    console.info("FastAPI backend delete skipped (offline/demo mode).");
  }

  // Update local storage
  const currentDocs = await getDocuments();
  const updatedDocs = currentDocs.filter((d) => d.id !== docId);
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedDocs));
    window.dispatchEvent(new CustomEvent("prayas-documents-updated", { detail: updatedDocs }));
  }

  return updatedDocs;
}

/**
 * Format bytes into human readable size
 */
export function formatBytes(bytes) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}
