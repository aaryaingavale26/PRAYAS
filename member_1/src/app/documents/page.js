"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  getDocuments,
  uploadDocument,
  deleteDocument,
  reindexDocument,
  validateFile,
  formatBytes,
  DOC_TYPES,
} from "@/lib/documentService";
import { confirmCvDetails, uploadCv } from "@/lib/apiClient";
import { cachePassport } from "@/lib/passportStorage";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { CvReviewPanel } from "@/components/CvReviewPanel";
import {
  FileText,
  UploadCloud,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  RefreshCw,
  FolderOpen,
  ArrowRight,
  Loader2,
} from "lucide-react";

const STATUS = {
  indexed: { label: "Indexed & active", cls: "text-[#065F46]" },
  indexing: { label: "Indexing…", cls: "text-[#1E40AF]" },
  pending: { label: "Pending", cls: "text-[#374151]" },
  failed: { label: "Indexing failed", cls: "text-[#991B1B]" },
  empty: { label: "No readable text", cls: "text-[#92400E]" },
};

export default function DocumentHubPage() {
  const { user } = useAuth();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [phase, setPhase] = useState("uploading");
  const [category, setCategory] = useState("resume");
  const [isDragging, setIsDragging] = useState(false);

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [docToDelete, setDocToDelete] = useState(null);
  const [busyId, setBusyId] = useState(null);

  // Re-uploaded CV: diff of what would change in the passport
  const [cvResult, setCvResult] = useState(null);
  const [applying, setApplying] = useState(false);

  const fileInputRef = useRef(null);

  const refresh = useCallback(async () => {
    try {
      const docs = await getDocuments();
      setDocuments(docs.filter((d) => !d.isProfile));
    } catch (err) {
      setErrorMessage(err.message || "Failed to load documents.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleFileProcess = async (file) => {
    setErrorMessage("");
    setSuccessMessage("");
    if (!file) return;
    const problem = validateFile(file);
    if (problem) {
      setErrorMessage(problem);
      return;
    }
    try {
      setUploading(true);
      setUploadProgress(0);
      setPhase("uploading");
      const onProgress = (pct, ph) => {
        setUploadProgress(pct);
        setPhase(ph);
      };

      if (category === "resume") {
        // Resume: index it AND compare it with the current passport
        const res = await uploadCv(file, onProgress);
        await refresh();
        if (res.extraction_failed) {
          setSuccessMessage(`"${file.name}" uploaded and indexed. We couldn't read your details automatically.`);
        } else if ((res.diff || []).length > 0) {
          setCvResult(res);
          setSuccessMessage(`"${file.name}" uploaded. Review what would change in your passport.`);
        } else {
          setSuccessMessage(`"${file.name}" uploaded. Your passport already matches it.`);
        }
      } else {
        await uploadDocument(file, category, onProgress);
        await refresh();
        setSuccessMessage(`"${file.name}" uploaded and indexed for your assistant.`);
      }
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      setErrorMessage(err.message || "Failed to upload document.");
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const applyCvChanges = async ({ fields, overwriteFields }) => {
    setApplying(true);
    try {
      const res = await confirmCvDetails({
        fields,
        overwriteFields,
        documentId: cvResult?.document_id,
        extractedProfile: cvResult?.extracted_profile,
      });
      cachePassport(res.passport, user?.id);
      setSuccessMessage(`Passport updated (${res.applied.length} field${res.applied.length === 1 ? "" : "s"}).`);
      setCvResult(null);
    } catch (err) {
      setErrorMessage(err.message || "Could not update your passport.");
    } finally {
      setApplying(false);
    }
  };

  const confirmDelete = async () => {
    if (!docToDelete) return;
    try {
      await deleteDocument(docToDelete.id);
      await refresh();
      setSuccessMessage(`"${docToDelete.name}" removed. The assistant no longer uses it.`);
    } catch (err) {
      setErrorMessage(err.message || "Could not delete the document.");
    } finally {
      setDocToDelete(null);
    }
  };

  const onReindex = async (doc) => {
    setBusyId(doc.id);
    try {
      await reindexDocument(doc.id);
      setSuccessMessage(`"${doc.name}" re-indexed.`);
    } catch (err) {
      setErrorMessage(err.message || "Re-index failed.");
    } finally {
      setBusyId(null);
      refresh();
    }
  };

  const typeLabel = (v) => DOC_TYPES.find((t) => t.value === v)?.label || "Other";

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10 w-full space-y-8">
      <div className="flex items-center justify-between">
        <div className="folder-tab-header">
          <span>DOCUMENT HUB</span>
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </div>
        <div className="text-xs font-bold text-[#646672] uppercase tracking-wider">AI KNOWLEDGE BASE</div>
      </div>

      <div className="pb-4 border-b border-[#E2E2D4]">
        <h1 className="font-display text-3xl sm:text-4xl font-black text-[#18191D] tracking-tight">
          Your documents, your answers
        </h1>
        <p className="mt-1 text-[#4B4D56] text-sm sm:text-base max-w-2xl leading-relaxed">
          Upload your CV, cover letters, project documents and certificates. The assistant answers only from these.
        </p>
      </div>

      <div className="sr-only" aria-live="polite" role="status">{successMessage}</div>
      {successMessage && (
        <div className="p-4 rounded-2xl bg-[#D1FAE5] border-2 border-[#A7F3D0] text-[#065F46] text-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 shrink-0" aria-hidden="true" />
            <span className="font-bold">{successMessage}</span>
          </div>
          <button type="button" onClick={() => setSuccessMessage("")} className="text-xs font-bold hover:underline p-1 cursor-pointer">Dismiss</button>
        </div>
      )}
      {errorMessage && (
        <div role="alert" className="p-4 rounded-2xl bg-[#FEE2E2] border-2 border-[#FECACA] text-[#991B1B] text-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 shrink-0" aria-hidden="true" />
            <span className="font-bold">{errorMessage}</span>
          </div>
          <button type="button" onClick={() => setErrorMessage("")} className="text-xs font-bold hover:underline p-1 cursor-pointer">Dismiss</button>
        </div>
      )}

      {/* UPLOAD */}
      <div className="browser-window-frame">
        <div className="browser-window-header justify-between">
          <div className="flex items-center gap-2">
            <span className="browser-window-dot bg-[#FF5F56]"></span>
            <span className="browser-window-dot bg-[#FFBD2E]"></span>
            <span className="browser-window-dot bg-[#27C93F]"></span>
            <span className="text-xs font-bold text-[#646672] ml-2">Upload document</span>
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="doc-category" className="text-xs font-bold text-[#646672] whitespace-nowrap">Type:</label>
            <select
              id="doc-category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="bg-white border-2 border-[#D5D5C8] rounded-xl px-3 py-1 text-xs font-bold text-[#18191D] focus:border-[#1F5FBF]"
            >
              {DOC_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="p-6">
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              handleFileProcess(e.dataTransfer.files?.[0]);
            }}
            onClick={() => fileInputRef.current?.click()}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                fileInputRef.current?.click();
              }
            }}
            tabIndex={0}
            role="button"
            aria-label="Upload document drop zone. Press enter to choose a file"
            className={`border-2 border-dashed rounded-3xl p-8 text-center transition-all cursor-pointer flex flex-col items-center justify-center min-h-[190px] ${
              isDragging ? "border-[#1F5FBF] bg-[#D4F1FE] scale-[0.99]" : "border-[#D5D5C8] hover:border-[#1F5FBF] hover:bg-[#F3F3E3] bg-[#FBFBEF]"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx,.txt"
              className="sr-only"
              tabIndex={-1}
              onChange={(e) => handleFileProcess(e.target.files?.[0])}
            />
            <div className="h-14 w-14 rounded-2xl bg-[#E0F2FE] border border-[#BAE6FD] text-[#0284C7] flex items-center justify-center mb-3">
              <UploadCloud className="h-7 w-7" aria-hidden="true" />
            </div>
            <p className="font-display text-base font-extrabold text-[#18191D]">
              {isDragging ? "Drop your document here" : "Click to select or drag and drop a document"}
            </p>
            <p className="text-xs text-[#646672] mt-1">PDF, DOCX or TXT · up to 10 MB · private to your account</p>
          </div>

          {uploading && (
            <div className="mt-6 p-4 rounded-2xl bg-[#FBFBEF] border border-[#E2E2D4] space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-[#18191D]">
                <span className="flex items-center gap-1.5 text-[#0284C7]">
                  <Sparkles className="h-4 w-4 animate-spin" aria-hidden="true" />
                  <span>{phase === "processing" ? "Reading & indexing your document…" : "Uploading…"}</span>
                </span>
                <span>{phase === "processing" ? "" : `${uploadProgress}%`}</span>
              </div>
              <div
                className="w-full bg-[#E2E2D4] rounded-full h-3 overflow-hidden"
                role="progressbar"
                aria-valuenow={phase === "processing" ? 100 : uploadProgress}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Document upload progress"
              >
                <div
                  className={`bg-[#2F9BE0] h-3 rounded-full transition-all duration-300 ${phase === "processing" ? "animate-pulse" : ""}`}
                  style={{ width: `${phase === "processing" ? 100 : uploadProgress}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* LIST */}
      <div>
        <h2 className="font-display text-xl font-extrabold text-[#18191D] flex items-center gap-2 mb-4">
          <FolderOpen className="h-5 w-5 text-[#2F9BE0]" aria-hidden="true" />
          <span>Your documents ({documents.length})</span>
        </h2>

        {loading ? (
          <div className="p-12 text-center bg-white rounded-2xl border border-[#E2E2D4]">
            <RefreshCw className="h-6 w-6 animate-spin mx-auto text-[#1F5FBF] mb-2" aria-hidden="true" />
            <p className="text-sm font-bold text-[#18191D]">Loading your documents…</p>
          </div>
        ) : documents.length === 0 ? (
          <div className="p-12 text-center border-dashed border-2 border-[#D5D5C8] rounded-3xl bg-[#FBFBEF]">
            <div className="h-12 w-12 rounded-full bg-[#E8E8DC] flex items-center justify-center mx-auto text-[#646672] mb-3">
              <FileText className="h-6 w-6" aria-hidden="true" />
            </div>
            <h3 className="font-display text-lg font-bold text-[#18191D]">No documents uploaded yet</h3>
            <p className="text-sm text-[#4B4D56] mt-1 max-w-sm mx-auto">Upload your CV above so PRAYAS can answer from your real experience.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {documents.map((doc) => {
              const st = STATUS[doc.status] || STATUS.pending;
              return (
                <div key={doc.id} className="bg-white rounded-2xl border border-[#E2E2D4] p-5 hover:border-[#2F9BE0] hover:shadow-md transition-all flex flex-col justify-between">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-10 w-10 rounded-xl bg-[#18191D] text-[#2F9BE0] flex items-center justify-center shrink-0">
                        <FileText className="h-5 w-5" aria-hidden="true" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-base font-bold text-[#18191D] truncate" title={doc.name}>{doc.name}</h3>
                        <p className="text-xs text-[#646672] mt-0.5">
                          {formatBytes(doc.sizeBytes)} • {doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleDateString() : ""}
                        </p>
                      </div>
                    </div>
                    <Badge variant={doc.category === "resume" ? "primary" : "blue"}>{typeLabel(doc.category)}</Badge>
                  </div>
                  {doc.error && <p className="text-xs text-[#991B1B] mb-2">{doc.error}</p>}
                  <div className="pt-3 border-t border-[#E2E2D4] flex items-center justify-between">
                    <span className={`inline-flex items-center gap-1.5 text-xs font-bold ${st.cls}`}>
                      <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                      <span>{st.label}{doc.chunkCount ? ` · ${doc.chunkCount} chunks` : ""}</span>
                    </span>
                    <div className="flex items-center gap-1.5">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onReindex(doc)}
                        disabled={busyId === doc.id}
                        leftIcon={busyId === doc.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                        className="text-xs"
                        aria-label={`Re-index ${doc.name}`}
                      >
                        Re-index
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDocToDelete(doc)}
                        className="text-xs font-bold text-rose-600 hover:text-rose-800 hover:bg-rose-50 p-2"
                        aria-label={`Delete ${doc.name}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Passport update diff (new CV) */}
      <Modal
        isOpen={Boolean(cvResult)}
        onClose={() => setCvResult(null)}
        title="Update your passport from this CV?"
        description="Pick which values to apply. Your existing values stay unless you choose to replace them."
        maxWidth="max-w-2xl"
      >
        {cvResult && (
          <CvReviewPanel result={cvResult} mode="update" saving={applying} onConfirm={applyCvChanges} onCancel={() => setCvResult(null)} />
        )}
      </Modal>

      {/* Delete confirmation */}
      <Modal
        isOpen={Boolean(docToDelete)}
        onClose={() => setDocToDelete(null)}
        title="Remove document?"
        description={`Delete "${docToDelete?.name}" from your knowledge base?`}
      >
        <div className="space-y-4">
          <p className="text-sm text-[#4B4D56]">
            The file, its indexed text and embeddings are removed, and the assistant will stop using it. You can re-upload it later.
          </p>
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button variant="outline" size="md" onClick={() => setDocToDelete(null)}>Cancel</Button>
            <Button variant="danger" size="md" onClick={confirmDelete}>Confirm delete</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
