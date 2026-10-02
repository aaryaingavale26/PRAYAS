"use client";

import React, { useState, useEffect } from "react";
import { checkBackendHealth, generateJobAnswer, API_BASE_URL } from "@/lib/apiClient";
import { getPassport } from "@/lib/passportStorage";
import { getDocuments } from "@/lib/documentService";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/Card";
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
  Server,
  FileText,
  Sliders,
  Send,
  HelpCircle,
  Code
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
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
      {/* 1. HEADER & BACKEND STATUS */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-50 border border-teal-200 text-teal-800 text-xs font-bold mb-2">
            <Bot className="h-3.5 w-3.5 text-teal-700" />
            <span>FastAPI &amp; RAG Integration</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
            AI Application Assistant
          </h1>
          <p className="mt-1 text-slate-600 text-base max-w-2xl leading-relaxed">
            Test AI answer generation powered by Member 2&apos;s FastAPI RAG backend using your uploaded resume context and accessibility preferences.
          </p>
        </div>

        {/* Backend Health Badge */}
        <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-xs flex items-center gap-3">
          <div
            className={`h-3 w-3 rounded-full ${
              backendHealth.online ? "bg-emerald-500 animate-pulse" : "bg-amber-400"
            }`}
          />
          <div className="text-xs">
            <p className="font-bold text-slate-900">
              {backendHealth.online ? "FastAPI Online" : "Demo Mode (Mock RAG Active)"}
            </p>
            <p className="text-slate-500 font-mono text-[11px]">{backendHealth.url}</p>
          </div>
          <button
            type="button"
            onClick={checkStatus}
            disabled={checkingHealth}
            className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg focus-visible:ring-2 focus-visible:ring-teal-600"
            title="Recheck FastAPI connection"
            aria-label="Recheck backend health"
          >
            <RefreshCw className={`h-4 w-4 ${checkingHealth ? "animate-spin text-teal-600" : ""}`} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* LEFT 2 COLUMNS: AI Generator Form & Output */}
        <div className="lg:col-span-2 space-y-6">
          
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-xl font-bold flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-teal-700" />
                <span>Job Application Question Prompt</span>
              </CardTitle>
              <CardDescription>
                Enter any application question from a job portal to generate a personalized, accessible answer.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Quick Sample Prompts */}
              <div>
                <span className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-2">
                  Quick-Fill Sample Questions:
                </span>
                <div className="flex flex-wrap gap-2">
                  {samplePrompts.map((prompt, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setQuestion(prompt)}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-teal-50 hover:border-teal-300 text-slate-700 text-xs text-left transition-colors font-medium"
                    >
                      &quot;{prompt}&quot;
                    </button>
                  ))}
                </div>
              </div>

              {/* Text Input Area */}
              <div>
                <label htmlFor="question-input" className="block text-sm font-bold text-slate-800 mb-1.5">
                  Application Question:
                </label>
                <textarea
                  id="question-input"
                  rows={4}
                  placeholder="e.g. Describe your experience with modern accessible web engineering and why you are interested in this position..."
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  className="w-full rounded-xl border-2 border-slate-300 p-3.5 text-base text-slate-900 placeholder:text-slate-400 focus:border-teal-600 hover:border-slate-400 min-h-[110px]"
                />
              </div>

              {/* Preferences Strip */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-700">Answer Style:</span>
                  <label className="flex items-center gap-1.5 cursor-pointer font-medium text-slate-800">
                    <input
                      type="checkbox"
                      checked={useSimplified}
                      onChange={(e) => setUseSimplified(e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                    />
                    <span>Simplified Plain-English Bullet Points</span>
                  </label>
                </div>
                <span className="text-slate-500 font-medium">
                  Context: <strong>{documents.length} Uploaded Files</strong>
                </span>
              </div>

              {error && (
                <div role="alert" className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <Button
                type="button"
                variant="primary"
                size="lg"
                onClick={handleGenerate}
                isLoading={loading}
                leftIcon={<Bot className="h-5 w-5" />}
                className="w-full bg-slate-900 hover:bg-slate-800 font-bold"
              >
                Generate Contextual AI Answer
              </Button>
            </CardContent>
          </Card>

          {/* AI Output Card */}
          {result && (
            <Card className="border-2 border-teal-600 bg-white shadow-lg animate-in fade-in duration-200">
              <CardHeader className="bg-teal-50/70 border-b border-teal-100 pb-3 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-bold text-teal-950 flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-teal-600" />
                    <span>AI-Generated Response</span>
                  </CardTitle>
                  <CardDescription className="text-teal-800">
                    Ready to paste into job application portals
                  </CardDescription>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopy}
                  leftIcon={copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                  className="text-xs font-bold bg-white"
                >
                  {copied ? "Copied!" : "Copy Answer"}
                </Button>
              </CardHeader>

              <CardContent className="p-6 space-y-4">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-base text-slate-900 leading-relaxed whitespace-pre-line font-medium">
                  {result.answer}
                </div>

                <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between text-xs text-slate-500 gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-700">Sources:</span>
                    {result.sourceDocs?.map((src, idx) => (
                      <Badge key={idx} variant="default" className="text-[10px]">
                        {src}
                      </Badge>
                    ))}
                  </div>

                  <span className="font-semibold text-teal-800">
                    Confidence: {Math.round((result.confidenceScore || 0.95) * 100)}%
                  </span>
                </div>
              </CardContent>
            </Card>
          )}

        </div>

        {/* RIGHT COLUMN: Backend Schema Guide & Live Integration Info */}
        <div className="space-y-6">
          <Card className="border-slate-200">
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-base font-bold flex items-center gap-2 text-slate-900">
                <Code className="h-4 w-4 text-teal-700" />
                <span>FastAPI Backend Specs (Member 2)</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3 text-xs text-slate-600">
              <p>
                The frontend communicates with these endpoints:
              </p>

              <div className="p-2.5 rounded-lg bg-slate-900 text-slate-200 font-mono space-y-2 text-[11px]">
                <div>
                  <span className="text-teal-400 font-bold">GET</span> /health
                  <p className="text-slate-400 text-[10px]">Backend health check</p>
                </div>
                <div className="border-t border-slate-800 pt-1.5">
                  <span className="text-teal-400 font-bold">POST</span> /api/rag/query
                  <p className="text-slate-400 text-[10px]">Body: {`{ question, context, preferences }`}</p>
                </div>
                <div className="border-t border-slate-800 pt-1.5">
                  <span className="text-teal-400 font-bold">POST</span> /api/documents/upload
                  <p className="text-slate-400 text-[10px]">FormData: file, category</p>
                </div>
              </div>

              <div className="p-3 bg-teal-50 rounded-lg border border-teal-200 text-teal-900 space-y-1 text-xs">
                <p className="font-bold flex items-center gap-1">
                  <Sparkles className="h-3.5 w-3.5 text-teal-700" />
                  <span>Resilient Architecture</span>
                </p>
                <p className="text-slate-600 leading-snug">
                  If Member 2 is offline or deploying, the frontend seamlessly uses simulated intelligent fallback so your demo is 100% resilient.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}
