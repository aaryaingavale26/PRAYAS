"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  getDocuments,
  uploadDocument,
  deleteDocument,
  formatBytes,
  ALLOWED_EXTENSIONS,
  MAX_FILE_SIZE_BYTES,
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
  FileCheck,
  Sparkles,
  Bot,
  Plus,
  RefreshCw,
  FolderOpen
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

      // Simulate step progress for user feedback
      const timer1 = setTimeout(() => setUploadProgress(65), 300);
      const timer2 = setTimeout(() => setUploadProgress(90), 600);

      const newDoc = await uploadDocument(file, category);
      
      clearTimeout(timer1);
      clearTimeout(timer2);
      setUploadProgress(100);

      // Refresh list
      const updated = await getDocuments();
      setDocuments(updated);
      setSuccessMessage(`"${file.name}" uploaded & indexed successfully for AI answer generation!`);

      // Reset file input
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
        return <Badge variant="teal">Cover Letter</Badge>;
      case "portfolio":
        return <Badge variant="warning">Portfolio / Projects</Badge>;
      default:
        return <Badge variant="default">General Document</Badge>;
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      {/* Title & Hub Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8 pb-6 border-b border-slate-200">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-50 border border-teal-200 text-teal-800 text-xs font-bold mb-2">
            <Bot className="h-3.5 w-3.5 text-teal-700" />
            <span>PRAYAS RAG Intelligence</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
            Document Hub
          </h1>
          <p className="mt-1 text-slate-600 text-base max-w-2xl leading-relaxed">
            Upload your resumes, cover letters, and project summaries. PRAYAS synthesizes accurate, accessible answers when filling tedious job application questionnaires.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Badge variant="teal" className="px-3 py-1.5 text-xs font-semibold">
            <CheckCircle2 className="h-3.5 w-3.5 text-teal-700" />
            <span>RAG Engine Ready</span>
          </Badge>
        </div>
      </div>

      {/* Global Alerts */}
      {successMessage && (
        <div
          role="status"
          className="mb-8 p-4 rounded-xl bg-emerald-50 border-2 border-emerald-300 text-emerald-900 text-base flex items-center justify-between shadow-sm animate-in fade-in duration-150"
        >
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" aria-hidden="true" />
            <span className="font-semibold">{successMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessMessage("")}
            className="text-xs font-bold text-emerald-800 hover:text-emerald-950 p-1 rounded"
          >
            Dismiss
          </button>
        </div>
      )}

      {errorMessage && (
        <div
          role="alert"
          className="mb-8 p-4 rounded-xl bg-rose-50 border-2 border-rose-300 text-rose-900 text-base flex items-center justify-between shadow-sm animate-in fade-in duration-150"
        >
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-rose-600 shrink-0" aria-hidden="true" />
            <span className="font-semibold">{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage("")}
            className="text-xs font-bold text-rose-800 hover:text-rose-950 p-1 rounded"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* 1. UPLOAD INTERFACE CARD */}
      <Card className="mb-10 border-slate-200 shadow-sm overflow-hidden">
        <CardHeader className="bg-slate-50/70 border-b border-slate-100">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="text-xl font-bold flex items-center gap-2">
                <UploadCloud className="h-5 w-5 text-teal-700" />
                <span>Upload New Document</span>
              </CardTitle>
              <CardDescription>
                Supported Formats: PDF, DOCX, DOC, TXT (Max 10MB)
              </CardDescription>
            </div>

            {/* Document Category Selector */}
            <div className="flex items-center gap-2">
              <label htmlFor="doc-category" className="text-xs font-bold text-slate-700 whitespace-nowrap">
                Document Type:
              </label>
              <select
                id="doc-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="bg-white border-2 border-slate-300 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-800 focus:border-teal-600"
              >
                <option value="resume">Resume / CV</option>
                <option value="cover_letter">Cover Letter</option>
                <option value="portfolio">Project Summary / Portfolio</option>
              </select>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6">
          {/* Drag and Drop Box */}
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
            className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer flex flex-col items-center justify-center min-h-[190px] ${
              isDragging
                ? "border-teal-600 bg-teal-50/80 scale-[0.99]"
                : "border-slate-300 hover:border-teal-600 hover:bg-slate-50/80 bg-white"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx,.doc,.txt"
              className="sr-only"
              onChange={handleFileInputChange}
            />

            <div className="h-14 w-14 rounded-2xl bg-teal-50 border border-teal-200 text-teal-700 flex items-center justify-center mb-3">
              <UploadCloud className="h-7 w-7" aria-hidden="true" />
            </div>

            <p className="text-base font-bold text-slate-900">
              {isDragging ? "Drop your file here" : "Click to browse or drag and drop your document here"}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              PRAYAS will automatically parse your skills and achievements for one-click form completion.
            </p>
          </div>

          {/* Upload Progress Bar */}
          {uploading && (
            <div className="mt-6 p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 animate-in fade-in duration-150">
              <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                <span className="flex items-center gap-1.5 text-teal-700">
                  <Sparkles className="h-4 w-4 animate-spin" />
                  <span>Processing &amp; Indexing Document...</span>
                </span>
                <span>{uploadProgress}%</span>
              </div>
              <div
                className="w-full bg-slate-200 rounded-full h-3 overflow-hidden"
                role="progressbar"
                aria-valuenow={uploadProgress}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Document upload progress"
              >
                <div
                  className="bg-teal-600 h-3 rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 2. UPLOADED DOCUMENTS LIST */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <FolderOpen className="h-5 w-5 text-teal-700" />
            <span>Indexed Application Documents ({documents.length})</span>
          </h2>
          <span className="text-xs text-slate-500 font-medium">
            Available across all browser job forms
          </span>
        </div>

        {loading ? (
          <div className="p-12 text-center bg-white rounded-xl border border-slate-200">
            <RefreshCw className="h-6 w-6 animate-spin mx-auto text-teal-600 mb-2" />
            <p className="text-sm font-semibold text-slate-600">Loading your indexed documents...</p>
          </div>
        ) : documents.length === 0 ? (
          <Card className="p-12 text-center border-dashed border-2 border-slate-300">
            <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400 mb-3">
              <FileText className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-800">No Documents Uploaded Yet</h3>
            <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
              Upload your resume or past application answers above so PRAYAS can answer questions for you.
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {documents.map((doc) => (
              <Card
                key={doc.id}
                className="border-slate-200 hover:border-teal-500 hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-10 w-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0">
                        <FileText className="h-5 w-5 text-teal-400" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-base font-bold text-slate-900 truncate" title={doc.name}>
                          {doc.name}
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {formatBytes(doc.sizeBytes)} • {new Date(doc.uploadedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    {getCategoryBadge(doc.category)}
                  </div>

                  {/* AI Summary Excerpt */}
                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-100 text-xs text-slate-700 leading-relaxed mb-4">
                    <p className="line-clamp-2">{doc.summary}</p>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-800">
                    <CheckCircle2 className="h-4 w-4 text-teal-600" />
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
                      leftIcon={<Eye className="h-4 w-4 text-slate-600" />}
                      className="text-xs font-semibold text-slate-700 hover:text-slate-950"
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
                      className="text-xs font-semibold text-rose-600 hover:text-rose-800 hover:bg-rose-50 p-2"
                      title="Delete document"
                      aria-label={`Delete ${doc.name}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* 3. AI SUMMARY PREVIEW MODAL */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={selectedDoc?.name || "Document Overview"}
        description="AI-synthesized context extracted from your document for automated question answering."
        maxWidth="max-w-xl"
      >
        {selectedDoc && (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs text-slate-500 pb-3 border-b border-slate-100">
              <span>Category: <strong>{selectedDoc.category.replace("_", " ").toUpperCase()}</strong></span>
              <span>Size: <strong>{formatBytes(selectedDoc.sizeBytes)}</strong></span>
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5 flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-teal-600" />
                <span>AI Synthesized Profile Summary</span>
              </h4>
              <p className="text-sm text-slate-800 bg-slate-50 p-3.5 rounded-xl border border-slate-200 leading-relaxed">
                {selectedDoc.summary}
              </p>
            </div>

            {selectedDoc.skills && selectedDoc.skills.length > 0 && (
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Extracted Core Skills &amp; Keywords
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {selectedDoc.skills.map((skill, i) => (
                    <span
                      key={i}
                      className="px-2.5 py-1 rounded-md bg-teal-50 border border-teal-200 text-teal-800 text-xs font-semibold"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <Button
                variant="primary"
                size="md"
                onClick={() => setIsModalOpen(false)}
                className="bg-slate-900"
              >
                Close Preview
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* 4. DELETE CONFIRMATION MODAL */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Remove Document?"
        description={`Are you sure you want to delete "${docToDelete?.name}" from your AI knowledge base?`}
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
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
