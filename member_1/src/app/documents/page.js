"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  getDocuments,
  uploadDocument,
  deleteDocument,
  formatBytes,
} from "@/lib/documentService";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import {
  FileText,
  UploadCloud,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Eye,
  Sparkles,
  RefreshCw,
  FolderOpen,
  ArrowRight,
  Plus
} from "lucide-react";

export default function DocumentHubPage() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [category, setCategory] = useState("resume");
  const [isDragging, setIsDragging] = useState(false);

  // Alerts
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Preview / AI Insights Modal state
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Delete confirmation modal state
  const [docToDelete, setDocToDelete] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const fileInputRef = useRef(null);

  // Load documents
  useEffect(() => {
    async function loadDocs() {
      try {
        setLoading(true);
        const docs = await getDocuments();
        setDocuments(docs);
      } catch (err) {
        setErrorMessage("Failed to load documents.");
      } finally {
        setLoading(false);
      }
    }
    loadDocs();
  }, []);

  // Handle file selection
  const handleFileProcess = async (file) => {
    setErrorMessage("");
    setSuccessMessage("");

    if (!file) return;

    try {
      setUploading(true);
      setUploadProgress(25);

      const timer1 = setTimeout(() => setUploadProgress(65), 300);
      const timer2 = setTimeout(() => setUploadProgress(90), 600);

      await uploadDocument(file, category);
      
      clearTimeout(timer1);
      clearTimeout(timer2);
      setUploadProgress(100);

      // Refresh list
      const updated = await getDocuments();
      setDocuments(updated);
      setSuccessMessage(`"${file.name}" uploaded & parsed for AI answer drafting!`);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (err) {
      setErrorMessage(err.message || "Failed to upload document.");
    } finally {
      setTimeout(() => {
        setUploading(false);
        setUploadProgress(0);
      }, 500);
    }
  };

  const handleFileInputChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileProcess(file);
    }
  };

  // Drag and drop handlers
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileProcess(file);
    }
  };

  // Handle delete execution
  const confirmDelete = async () => {
    if (!docToDelete) return;
    try {
      const updated = await deleteDocument(docToDelete.id);
      setDocuments(updated);
      setSuccessMessage(`Document "${docToDelete.name}" removed.`);
    } catch (err) {
      setErrorMessage("Could not delete the document.");
    } finally {
      setIsDeleteModalOpen(false);
      setDocToDelete(null);
    }
  };

  const getCategoryBadge = (cat) => {
    switch (cat) {
      case "resume":
        return <Badge variant="primary">Resume / CV</Badge>;
      case "cover_letter":
        return <Badge variant="blue">Cover Letter</Badge>;
      case "portfolio":
        return <Badge variant="warning">Portfolio / Projects</Badge>;
      default:
        return <Badge variant="default">General Document</Badge>;
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10 w-full space-y-8">
      
      {/* 1. IMAGE 1 FOLDER-TAB SECTION HEADER */}
      <div className="flex items-center justify-between">
        <div className="folder-tab-header">
          <span>DOCUMENT HUB</span>
          <ArrowRight className="h-4 w-4" />
        </div>
        <div className="text-xs font-bold text-[#646672] uppercase tracking-wider">
          AI KNOWLEDGE BASE
        </div>
      </div>

      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-[#E2E2D4]">
        <div>
          <h1 className="font-display text-3xl sm:text-4xl font-black text-[#18191D] tracking-tight">
            Document Intelligence &amp; Resume RAG
          </h1>
          <p className="mt-1 text-[#4B4D56] text-sm sm:text-base max-w-2xl leading-relaxed">
            Upload your resumes, cover letters, and portfolio write-ups. PRAYAS creates grounded, truthful answers when you encounter open-ended application questions.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Badge variant="blue" className="px-3 py-1.5 text-xs font-bold">
            <CheckCircle2 className="h-3.5 w-3.5 text-[#0284C7]" />
            <span>RAG Engine Active</span>
          </Badge>
        </div>
      </div>

      {/* Global Alerts */}
      {successMessage && (
        <div
          role="status"
          className="p-4 rounded-2xl bg-[#D1FAE5] border-2 border-[#A7F3D0] text-[#065F46] text-sm flex items-center justify-between shadow-xs animate-in fade-in duration-150"
        >
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-[#059669] shrink-0" aria-hidden="true" />
            <span className="font-bold">{successMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessMessage("")}
            suppressHydrationWarning
            className="text-xs font-bold text-[#065F46] hover:underline p-1 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {errorMessage && (
        <div
          role="alert"
          className="p-4 rounded-2xl bg-[#FEE2E2] border-2 border-[#FECACA] text-[#991B1B] text-sm flex items-center justify-between shadow-xs animate-in fade-in duration-150"
        >
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-[#DC2626] shrink-0" aria-hidden="true" />
            <span className="font-bold">{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage("")}
            suppressHydrationWarning
            className="text-xs font-bold text-[#991B1B] hover:underline p-1 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* 2. UPLOAD INTERFACE IN BROWSER-WINDOW FRAME */}
      <div className="browser-window-frame">
        <div className="browser-window-header justify-between">
          <div className="flex items-center gap-2">
            <span className="browser-window-dot bg-[#FF5F56]"></span>
            <span className="browser-window-dot bg-[#FFBD2E]"></span>
            <span className="browser-window-dot bg-[#27C93F]"></span>
            <span className="text-xs font-bold text-[#646672] ml-2">Upload Application Document</span>
          </div>

          <div className="flex items-center gap-2">
            <label htmlFor="doc-category" className="text-xs font-bold text-[#646672] whitespace-nowrap">
              Category:
            </label>
            <select
              id="doc-category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="bg-white border-2 border-[#D5D5C8] rounded-xl px-3 py-1 text-xs font-bold text-[#18191D] focus:border-[#1F5FBF]"
            >
              <option value="resume">Resume / CV</option>
              <option value="cover_letter">Cover Letter</option>
              <option value="portfolio">Project Summary / Portfolio</option>
            </select>
          </div>
        </div>

        <div className="p-6">
          {/* Drag and Drop Zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                fileInputRef.current?.click();
              }
            }}
            tabIndex={0}
            role="button"
            aria-label="Upload document file drop zone. Press enter to choose a file"
            className={`border-2 border-dashed rounded-3xl p-8 text-center transition-all cursor-pointer flex flex-col items-center justify-center min-h-[190px] ${
              isDragging
                ? "border-[#1F5FBF] bg-[#D4F1FE] scale-[0.99]"
                : "border-[#D5D5C8] hover:border-[#1F5FBF] hover:bg-[#F3F3E3] bg-[#FBFBEF]"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx,.doc,.txt"
              className="sr-only"
              onChange={handleFileInputChange}
            />

            <div className="h-14 w-14 rounded-2xl bg-[#E0F2FE] border border-[#BAE6FD] text-[#0284C7] flex items-center justify-center mb-3 shadow-xs">
              <UploadCloud className="h-7 w-7" aria-hidden="true" />
            </div>

            <p className="font-display text-base font-extrabold text-[#18191D]">
              {isDragging ? "Drop your resume or document here" : "Click to select or drag and drop your document here"}
            </p>
            <p className="text-xs text-[#646672] mt-1">
              Supports PDF, DOCX, TXT (up to 10MB). Text is parsed and scoped privately to your account.
            </p>
          </div>

          {/* Upload Progress Bar */}
          {uploading && (
            <div className="mt-6 p-4 rounded-2xl bg-[#FBFBEF] border border-[#E2E2D4] space-y-2 animate-in fade-in duration-150">
              <div className="flex items-center justify-between text-xs font-bold text-[#18191D]">
                <span className="flex items-center gap-1.5 text-[#0284C7]">
                  <Sparkles className="h-4 w-4 animate-spin" />
                  <span>Parsing Text &amp; Generating Embeddings...</span>
                </span>
                <span>{uploadProgress}%</span>
              </div>
              <div
                className="w-full bg-[#E2E2D4] rounded-full h-3 overflow-hidden"
                role="progressbar"
                aria-valuenow={uploadProgress}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Document upload progress"
              >
                <div
                  className="bg-[#2F9BE0] h-3 rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 3. UPLOADED DOCUMENTS LIST */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-xl font-extrabold text-[#18191D] flex items-center gap-2">
            <FolderOpen className="h-5 w-5 text-[#2F9BE0]" />
            <span>Indexed Application Documents ({documents.length})</span>
          </h2>
          <span className="text-xs text-[#646672] font-bold">
            Available across all browser job forms
          </span>
        </div>

        {loading ? (
          <div className="p-12 text-center bg-white rounded-2xl border border-[#E2E2D4]">
            <RefreshCw className="h-6 w-6 animate-spin mx-auto text-[#1F5FBF] mb-2" />
            <p className="text-sm font-bold text-[#18191D]">Loading your indexed documents...</p>
          </div>
        ) : documents.length === 0 ? (
          <div className="p-12 text-center border-dashed border-2 border-[#D5D5C8] rounded-3xl bg-[#FBFBEF]">
            <div className="h-12 w-12 rounded-full bg-[#E8E8DC] flex items-center justify-center mx-auto text-[#646672] mb-3">
              <FileText className="h-6 w-6" />
            </div>
            <h3 className="font-display text-lg font-bold text-[#18191D]">No Documents Uploaded Yet</h3>
            <p className="text-sm text-[#4B4D56] mt-1 max-w-sm mx-auto">
              Upload your resume or past application answers above so PRAYAS can draft answers for you.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="bg-white rounded-2xl border border-[#E2E2D4] p-5 hover:border-[#2F9BE0] hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-10 w-10 rounded-xl bg-[#18191D] text-[#2F9BE0] flex items-center justify-center shrink-0">
                        <FileText className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-base font-bold text-[#18191D] truncate" title={doc.name}>
                          {doc.name}
                        </h3>
                        <p className="text-xs text-[#646672] mt-0.5">
                          {formatBytes(doc.sizeBytes)} • {new Date(doc.uploadedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    {getCategoryBadge(doc.category)}
                  </div>

                  {/* AI Summary Excerpt */}
                  <div className="p-3 rounded-xl bg-[#FBFBEF] border border-[#E2E2D4] text-xs text-[#4B4D56] leading-relaxed mb-4">
                    <p className="line-clamp-2">{doc.summary}</p>
                  </div>
                </div>

                <div className="pt-3 border-t border-[#E2E2D4] flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#065F46]">
                    <CheckCircle2 className="h-4 w-4 text-[#059669]" />
                    <span>AI Indexed &amp; Active</span>
                  </span>

                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedDoc(doc);
                        setIsModalOpen(true);
                      }}
                      leftIcon={<Eye className="h-4 w-4 text-[#646672]" />}
                      className="text-xs font-bold text-[#18191D]"
                      title="View AI Extracted Insights"
                    >
                      AI Summary
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setDocToDelete(doc);
                        setIsDeleteModalOpen(true);
                      }}
                      className="text-xs font-bold text-rose-600 hover:text-rose-800 hover:bg-rose-50 p-2"
                      title="Delete document"
                      aria-label={`Delete ${doc.name}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 4. AI SUMMARY PREVIEW MODAL */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={selectedDoc?.name || "Document Overview"}
        description="AI-synthesized context extracted from your document for automated question answering."
        maxWidth="max-w-xl"
      >
        {selectedDoc && (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs text-[#646672] pb-3 border-b border-[#E2E2D4]">
              <span>Category: <strong>{selectedDoc.category.replace("_", " ").toUpperCase()}</strong></span>
              <span>Size: <strong>{formatBytes(selectedDoc.sizeBytes)}</strong></span>
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#646672] mb-1.5 flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-[#2F9BE0]" />
                <span>AI Synthesized Profile Summary</span>
              </h4>
              <p className="text-sm text-[#18191D] bg-[#FBFBEF] p-4 rounded-2xl border border-[#E2E2D4] leading-relaxed">
                {selectedDoc.summary}
              </p>
            </div>

            {selectedDoc.skills && selectedDoc.skills.length > 0 && (
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#646672] mb-1.5">
                  Extracted Core Skills &amp; Keywords
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {selectedDoc.skills.map((skill, i) => (
                    <span
                      key={i}
                      className="px-2.5 py-1 rounded-lg bg-[#CEEEFD] border border-[#BAE6FD] text-[#0284C7] text-xs font-bold"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-4 border-t border-[#E2E2D4] flex justify-end">
              <Button
                variant="primary"
                size="md"
                onClick={() => setIsModalOpen(false)}
              >
                Close Preview
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* 5. DELETE CONFIRMATION MODAL */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Remove Document?"
        description={`Are you sure you want to delete "${docToDelete?.name}" from your AI knowledge base?`}
      >
        <div className="space-y-4">
          <p className="text-sm text-[#4B4D56]">
            This action will remove the document context from automated application answer generation. You can always re-upload it later.
          </p>
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              variant="outline"
              size="md"
              onClick={() => setIsDeleteModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              size="md"
              onClick={confirmDelete}
            >
              Confirm Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
