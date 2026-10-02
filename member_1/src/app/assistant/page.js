"use client";

import React, { useState, useEffect } from "react";
import { checkBackendHealth, generateJobAnswer, API_BASE_URL } from "@/lib/apiClient";
import { getPassport } from "@/lib/passportStorage";
import { getDocuments } from "@/lib/documentService";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
  Bot,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  RefreshCw,
  Code,
  ArrowRight
} from "lucide-react";

export default function AIAssistantPage() {
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  // Backend connection status
  const [backendHealth, setBackendHealth] = useState({ online: false, status: "checking", message: "Connecting to FastAPI backend...", url: API_BASE_URL });
  const [checkingHealth, setCheckingHealth] = useState(false);

  // User preferences & docs
  const [passport, setPassport] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [useSimplified, setUseSimplified] = useState(false);

  const checkStatus = async () => {
    setCheckingHealth(true);
    const health = await checkBackendHealth();
    setBackendHealth(health);
    setCheckingHealth(false);
  };

  useEffect(() => {
    checkStatus();
    async function loadData() {
      const p = await getPassport();
      const docs = await getDocuments();
      setPassport(p);
      setDocuments(docs);
      if (p?.simplifiedLanguage) {
        setUseSimplified(true);
      }
    }
    loadData();
  }, []);

  const samplePrompts = [
    "Why are you the ideal candidate for this Frontend role?",
    "Describe a challenging technical project you successfully delivered.",
    "What accessibility accommodations do you require for daily work?",
    "How do you handle tight deadlines and ambiguous requirements?",
  ];

  const handleGenerate = async (e) => {
    if (e) e.preventDefault();
    if (!question.trim()) {
      setError("Please enter or select a job application question.");
      return;
    }

    setError("");
    setLoading(true);
    setResult(null);

    try {
      const res = await generateJobAnswer({
        question: question.trim(),
        context: documents.map((d) => d.summary).join("\n"),
        passportPreferences: {
          ...passport,
          simplifiedLanguage: useSimplified,
        },
      });
      setResult(res);
    } catch (err) {
      setError(err.message || "Failed to generate answer. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!result?.answer) return;
    navigator.clipboard.writeText(result.answer);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10 w-full space-y-8">
      
      {/* 1. IMAGE 1 FOLDER-TAB SECTION HEADER */}
      <div className="flex items-center justify-between">
        <div className="folder-tab-header">
          <span>AI APPLICATION ASSISTANT</span>
          <ArrowRight className="h-4 w-4" />
        </div>
        <div className="text-xs font-bold text-[#646672] uppercase tracking-wider">
          RAG FORM WRITER
        </div>
      </div>

      {/* Header & Backend Status */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-[#E2E2D4]">
        <div>
          <h1 className="font-display text-3xl sm:text-4xl font-black text-[#18191D] tracking-tight">
            Grounded Application Drafting
          </h1>
          <p className="mt-1 text-[#4B4D56] text-sm sm:text-base max-w-2xl leading-relaxed">
            Test AI answer generation powered by FastAPI RAG backend using your uploaded resume context and accessibility preferences.
          </p>
        </div>

        {/* Backend Health Badge */}
        <div className="p-3 rounded-2xl bg-white border border-[#E2E2D4] shadow-xs flex items-center gap-3">
          <div
            className={`h-3 w-3 rounded-full ${
              backendHealth.online ? "bg-emerald-500 animate-pulse" : "bg-amber-400"
            }`}
          />
          <div className="text-xs">
            <p className="font-bold text-[#18191D]">
              {backendHealth.online ? "FastAPI Online" : "Demo Mode (Mock RAG Active)"}
            </p>
            <p className="text-[#646672] font-mono text-[11px]">{backendHealth.url}</p>
          </div>
          <button
            type="button"
            onClick={checkStatus}
            disabled={checkingHealth}
            suppressHydrationWarning
            className="p-1.5 text-[#646672] hover:text-[#18191D] hover:bg-[#F3F3E3] rounded-xl focus-visible:ring-2 focus-visible:ring-[#2F9BE0] cursor-pointer"
            title="Recheck FastAPI connection"
            aria-label="Recheck backend health"
          >
            <RefreshCw className={`h-4 w-4 ${checkingHealth ? "animate-spin text-[#1F5FBF]" : ""}`} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFT 2 COLUMNS: AI Generator Form & Output */}
        <div className="lg:col-span-2 space-y-6">
          
          <div className="browser-window-frame">
            <div className="browser-window-header justify-between">
              <div className="flex items-center gap-2">
                <span className="browser-window-dot bg-[#FF5F56]"></span>
                <span className="browser-window-dot bg-[#FFBD2E]"></span>
                <span className="browser-window-dot bg-[#27C93F]"></span>
                <span className="text-xs font-bold text-[#646672] ml-2">Job Application Question Prompt</span>
              </div>
              <span className="text-[11px] font-bold text-[#2F9BE0]">LLM Assistant</span>
            </div>

            <div className="p-6 space-y-4">
              {/* Quick Sample Prompts */}
              <div>
                <span className="text-xs font-bold text-[#646672] uppercase tracking-wider block mb-2">
                  Sample Employer Questions:
                </span>
                <div className="flex flex-wrap gap-2">
                  {samplePrompts.map((prompt, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setQuestion(prompt)}
                      suppressHydrationWarning
                      className="px-3 py-1.5 rounded-xl border border-[#E2E2D4] bg-[#FBFBEF] hover:bg-[#EFF8FF] hover:border-[#2F9BE0] text-[#18191D] text-xs text-left transition-colors font-semibold cursor-pointer"
                    >
                      &quot;{prompt}&quot;
                    </button>
                  ))}
                </div>
              </div>

              {/* Text Input Area */}
              <div>
                <label htmlFor="question-input" className="block text-sm font-bold text-[#18191D] mb-1.5">
                  Application Question:
                </label>
                <textarea
                  id="question-input"
                  rows={4}
                  placeholder="e.g. Describe your experience with modern accessible web engineering and why you are interested in this position..."
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  className="w-full rounded-2xl border-2 border-[#D5D5C8] p-3.5 text-base text-[#18191D] placeholder:text-[#A0A2AB] focus:border-[#1F5FBF] hover:border-[#18191D] min-h-[110px]"
                />
              </div>

              {/* Preferences Strip */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-[#FBFBEF] rounded-2xl border border-[#E2E2D4] text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-[#18191D]">Answer Style:</span>
                  <label className="flex items-center gap-1.5 cursor-pointer font-bold text-[#18191D]">
                    <input
                      type="checkbox"
                      checked={useSimplified}
                      onChange={(e) => setUseSimplified(e.target.checked)}
                      className="h-4 w-4 rounded border-[#D5D5C8] text-[#1F5FBF] focus:ring-[#2F9BE0]"
                    />
                    <span>Simplified Plain-English Bullet Points</span>
                  </label>
                </div>
                <span className="text-[#646672] font-bold">
                  Context: <strong>{documents.length} Uploaded Files</strong>
                </span>
              </div>

              {error && (
                <div role="alert" className="p-3 rounded-xl bg-[#FEE2E2] border border-[#FECACA] text-[#991B1B] text-sm flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-[#DC2626] shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <Button
                type="button"
                variant="secondary"
                size="lg"
                onClick={handleGenerate}
                isLoading={loading}
                leftIcon={<Bot className="h-5 w-5" />}
                className="w-full font-black text-sm"
              >
                Generate Grounded AI Answer
              </Button>
            </div>
          </div>

          {/* AI Output Card in Browser-Window Frame */}
          {result && (
            <div className="browser-window-frame">
              <div className="browser-window-header justify-between bg-[#F0FDF4] border-b border-[#BBF7D0]">
                <div className="flex items-center gap-2">
                  <span className="browser-window-dot bg-[#FF5F56]"></span>
                  <span className="browser-window-dot bg-[#FFBD2E]"></span>
                  <span className="browser-window-dot bg-[#27C93F]"></span>
                  <span className="text-xs font-bold text-[#166534] ml-2">Grounded AI Draft Response</span>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopy}
                  leftIcon={copied ? <Check className="h-4 w-4 text-[#059669]" /> : <Copy className="h-4 w-4" />}
                  className="text-xs font-bold bg-white"
                >
                  {copied ? "Copied!" : "Copy Answer"}
                </Button>
              </div>

              <div className="p-6 space-y-4">
                <div className="p-4 rounded-2xl bg-[#FBFBEF] border border-[#E2E2D4] text-base text-[#18191D] leading-relaxed whitespace-pre-line font-medium">
                  {result.answer}
                </div>

                <div className="pt-3 border-t border-[#E2E2D4] flex flex-wrap items-center justify-between text-xs text-[#646672] gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[#18191D]">Sources:</span>
                    {result.sourceDocs?.map((src, idx) => (
                      <Badge key={idx} variant="default" className="text-[10px]">
                        {src}
                      </Badge>
                    ))}
                  </div>

                  <span className="font-bold text-[#065F46]">
                    Truthful First-Person Profile Score: {Math.round((result.confidenceScore || 0.95) * 100)}%
                  </span>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* RIGHT COLUMN: Backend Schema Guide */}
        <div className="space-y-6">
          <div className="bg-[#18191D] border-2 border-[#2C2D35] rounded-3xl p-6 text-white shadow-xl">
            <h3 className="font-display font-bold text-base text-white flex items-center gap-2 mb-3 pb-3 border-b border-[#2C2D35]">
              <Code className="h-4 w-4 text-[#2F9BE0]" />
              <span>FastAPI Backend Specs (Member 2)</span>
            </h3>

            <div className="space-y-3 text-xs text-[#A0A2AB]">
              <p>The companion and web app communicate with these scoped endpoints:</p>

              <div className="p-3 rounded-2xl bg-[#121316] text-[#E0E2EC] font-mono space-y-2 text-[11px] border border-[#2C2D35]">
                <div>
                  <span className="text-[#2F9BE0] font-bold">GET</span> /health
                  <p className="text-[#71737E] text-[10px]">Backend health check</p>
                </div>
                <div className="border-t border-[#2C2D35] pt-1.5">
                  <span className="text-[#2F9BE0] font-bold">POST</span> /api/rag-answer
                  <p className="text-[#71737E] text-[10px]">Body: {`{ user_id, question, context }`}</p>
                </div>
                <div className="border-t border-[#2C2D35] pt-1.5">
                  <span className="text-[#2F9BE0] font-bold">POST</span> /api/documents/upload
                  <p className="text-[#71737E] text-[10px]">FormData: file, user_id, category</p>
                </div>
              </div>

              <div className="p-3.5 bg-[#CEEEFD] rounded-2xl border border-[#BAE6FD] text-[#18191D] space-y-1 text-xs">
                <p className="font-bold text-[#0284C7] flex items-center gap-1">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Strict User Data Isolation</span>
                </p>
                <p className="text-[#0369A1] leading-snug">
                  Document embeddings and answers are strictly isolated by <code className="bg-white/60 px-1 rounded">user_id</code> so candidate data is never shared across sessions.
                </p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
