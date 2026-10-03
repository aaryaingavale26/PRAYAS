"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Bot,
  ChevronDown,
  ChevronUp,
  FileText,
  Loader2,
  RefreshCw,
  Send,
  Trash2,
  User as UserIcon,
  UploadCloud,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { askAssistant } from "@/lib/apiClient";
import { deleteDocument, getDocuments, reindexDocument, reindexProfile } from "@/lib/documentService";
import { Button } from "@/components/ui/Button";

const PROMPT_CHIPS = [
  "Summarize my experience",
  "Draft an answer for 'Why do you want this job?'",
  "What are my key skills?",
  "When does my passport expire?",
];

const STATUS_STYLES = {
  indexed: { label: "Indexed", cls: "bg-[#D1FAE5] text-[#065F46]" },
  indexing: { label: "Indexing…", cls: "bg-[#DBEAFE] text-[#1E40AF]" },
  pending: { label: "Pending", cls: "bg-[#E5E7EB] text-[#374151]" },
  failed: { label: "Failed", cls: "bg-[#FEE2E2] text-[#991B1B]" },
  empty: { label: "No text found", cls: "bg-[#FEF3C7] text-[#92400E]" },
};

function SourceList({ sources }) {
  const [open, setOpen] = useState(false);
  if (!sources?.length) return null;
  const names = [...new Set(sources.map((s) => s.document_name))];
  return (
    <div className="mt-3 pt-3 border-t border-[#2C2D35] text-xs">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="inline-flex items-center gap-1.5 font-bold text-[#7CC4F2] hover:text-white cursor-pointer"
      >
        Based on: {names.join(", ")}
        {open ? <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" /> : <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />}
      </button>
      {open && (
        <ul className="mt-2 space-y-2">
          {sources.map((s, i) => (
            <li key={`${s.document_id}-${s.chunk_index}-${i}`} className="rounded-xl bg-[#18191D] border border-[#2C2D35] p-3">
              <p className="font-bold text-[#F8F8F0]">{s.document_name}</p>
              <p className="mt-1 text-[#B5B7C2] whitespace-pre-wrap leading-relaxed">{s.snippet}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function AIAssistantPage() {
  const [messages, setMessages] = useState([]);
  const [question, setQuestion] = useState("");
  const [asking, setAsking] = useState(false);
  const [announce, setAnnounce] = useState("");

  const [docs, setDocs] = useState([]);
  const [docsLoading, setDocsLoading] = useState(true);
  const [docsError, setDocsError] = useState("");
  const [busyDoc, setBusyDoc] = useState(null);

  const endRef = useRef(null);

  const loadDocs = useCallback(async () => {
    try {
      setDocsError("");
      setDocs(await getDocuments());
    } catch (e) {
      setDocsError(e.message || "Could not load your knowledge sources.");
    } finally {
      setDocsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDocs();
  }, [loadDocs]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, asking]);

  const realDocs = docs.filter((d) => !d.isProfile);

  const send = async (text) => {
    const q = (text ?? question).trim();
    if (!q || asking) return;
    setQuestion("");
    setMessages((m) => [...m, { role: "user", text: q }]);
    setAsking(true);
    setAnnounce("Thinking…");
    try {
      const res = await askAssistant({ question: q });
      setMessages((m) => [...m, { role: "assistant", ...res, text: res.answer }]);
      setAnnounce(res.found ? "Answer ready." : "I couldn't find this in your documents.");
    } catch (e) {
      setMessages((m) => [...m, { role: "assistant", error: true, text: e.message || "Something went wrong." }]);
      setAnnounce("The assistant ran into a problem.");
    } finally {
      setAsking(false);
    }
  };

  const onReindex = async (doc) => {
    setBusyDoc(doc.id);
    try {
      if (doc.isProfile) await reindexProfile();
      else await reindexDocument(doc.id);
      setAnnounce(`${doc.name} re-indexed.`);
    } catch (e) {
      setDocsError(e.message || "Re-index failed.");
    } finally {
      setBusyDoc(null);
      loadDocs();
    }
  };

  const onDelete = async (doc) => {
    if (!window.confirm(`Delete "${doc.name}"? The assistant will stop using it.`)) return;
    setBusyDoc(doc.id);
    try {
      await deleteDocument(doc.id);
      setAnnounce(`${doc.name} deleted.`);
    } catch (e) {
      setDocsError(e.message || "Delete failed.");
    } finally {
      setBusyDoc(null);
      loadDocs();
    }
  };

  const noDocs = !docsLoading && !docsError && realDocs.length === 0;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10 w-full space-y-6">
      <div className="sr-only" aria-live="polite" role="status">{announce}</div>

      <div className="flex items-center justify-between">
        <div className="folder-tab-header">
          <span>AI Assistant</span>
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </div>
        <span className="text-xs font-bold text-[#646672] uppercase tracking-wider hidden sm:block">Answers from your documents only</span>
      </div>

      <div>
        <h1 className="font-display text-3xl sm:text-4xl font-black text-[#18191D] tracking-tight">Ask about your own details</h1>
        <p className="mt-1 text-[#4B4D56] text-sm sm:text-base max-w-2xl">
          I answer only from the documents you&apos;ve uploaded and your passport. If it isn&apos;t there, I&apos;ll tell you plainly.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* CHAT */}
        <section aria-label="Chat" className="lg:col-span-2 bg-[#1E1F24] rounded-3xl border-2 border-[#2C2D35] text-[#F8F8F0] flex flex-col min-h-[520px] shadow-xl">
          <div className="flex-1 p-5 sm:p-6 space-y-4 overflow-y-auto max-h-[60vh]" role="log" aria-live="off" aria-label="Conversation">
            {messages.length === 0 && !noDocs && (
              <div className="text-center py-8">
                <div className="h-14 w-14 mx-auto rounded-2xl bg-[#2F9BE0] flex items-center justify-center mb-3">
                  <Bot className="h-7 w-7 text-white" aria-hidden="true" />
                </div>
                <p className="font-display text-xl font-extrabold">What would you like to know?</p>
                <p className="text-sm text-[#9A9CA8] mt-1">Try one of the suggestions below.</p>
              </div>
            )}

            {noDocs && (
              <div className="rounded-2xl bg-[#18191D] border border-[#2C2D35] p-6 text-center">
                <UploadCloud className="h-8 w-8 mx-auto text-[#2F9BE0]" aria-hidden="true" />
                <p className="mt-3 font-display text-lg font-extrabold">You haven&apos;t uploaded any documents yet</p>
                <p className="text-sm text-[#B5B7C2] mt-1">I have nothing to answer from. Upload your CV or other documents first.</p>
                <Link href="/documents" className="inline-block mt-4">
                  <span className="prayas-btn-primary">Go to uploads</span>
                </Link>
              </div>
            )}

            {messages.map((m, i) =>
              m.role === "user" ? (
                <div key={i} className="flex justify-end gap-2">
                  <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-[#2F9BE0] text-white px-4 py-3 text-sm font-semibold whitespace-pre-wrap">{m.text}</div>
                  <UserIcon className="h-6 w-6 mt-1 text-[#9A9CA8] shrink-0" aria-hidden="true" />
                </div>
              ) : (
                <div key={i} className="flex gap-2">
                  <Bot className="h-6 w-6 mt-1 text-[#2F9BE0] shrink-0" aria-hidden="true" />
                  <div className={`max-w-[88%] rounded-2xl rounded-tl-sm px-4 py-3 text-sm border ${m.error ? "bg-[#3B1D1D] border-[#7F1D1D]" : "bg-[#272830] border-[#33363F]"}`}>
                    <p className="whitespace-pre-wrap leading-relaxed">{m.text}</p>
                    {m.emptyState && (
                      <Link href={m.uploadUrl || "/documents"} className="inline-block mt-2 underline font-bold text-[#7CC4F2]">Upload documents →</Link>
                    )}
                    {!m.found && !m.emptyState && !m.error && (
                      <Link href={m.uploadUrl || "/documents"} className="inline-block mt-2 underline font-bold text-[#7CC4F2]">Add more documents →</Link>
                    )}
                    <SourceList sources={m.sources} />
                  </div>
                </div>
              )
            )}

            {asking && (
              <div className="flex gap-2 items-center text-sm text-[#9A9CA8]">
                <Loader2 className="h-5 w-5 animate-spin text-[#2F9BE0]" aria-hidden="true" /> Searching your documents…
              </div>
            )}
            <div ref={endRef} />
          </div>

          <div className="border-t border-[#2C2D35] p-4 sm:p-5 space-y-3">
            <div className="flex flex-wrap gap-2" aria-label="Suggested questions">
              {PROMPT_CHIPS.map((c) => (
                <button
                  key={c}
                  type="button"
                  disabled={asking}
                  onClick={() => send(c)}
                  className="text-xs font-bold px-3 py-2 rounded-full border border-[#4B4D56] bg-[#18191D] hover:border-[#2F9BE0] hover:text-[#7CC4F2] disabled:opacity-50 cursor-pointer text-left"
                >
                  {c}
                </button>
              ))}
            </div>
            <form
              onSubmit={(e) => { e.preventDefault(); send(); }}
              className="flex gap-2"
            >
              <label htmlFor="assistant-question" className="sr-only">Ask the assistant</label>
              <input
                id="assistant-question"
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Ask about your experience, skills, passport…"
                className="flex-1 rounded-xl bg-[#18191D] border-2 border-[#33363F] focus:border-[#2F9BE0] px-4 py-3 text-sm text-white placeholder:text-[#7A7C88] outline-none"
                autoComplete="off"
              />
              <Button type="submit" variant="blue" disabled={asking || !question.trim()} aria-label="Send question" leftIcon={<Send className="h-4 w-4" />}>
                Ask
              </Button>
            </form>
          </div>
        </section>

        {/* KNOWLEDGE SOURCES */}
        <aside aria-label="Knowledge sources" className="bg-white rounded-3xl border-2 border-[#E2E2D4] p-5 h-fit">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display text-lg font-extrabold text-[#18191D]">Knowledge sources</h2>
            <button type="button" onClick={loadDocs} className="p-2 rounded-lg hover:bg-[#F3F3E3] cursor-pointer" aria-label="Refresh knowledge sources">
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          {docsLoading ? (
            <p className="text-sm text-[#646672] flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Loading…</p>
          ) : docsError ? (
            <p role="alert" className="text-sm text-[#991B1B] flex items-start gap-2"><AlertCircle className="h-4 w-4 mt-0.5 shrink-0" aria-hidden="true" />{docsError}</p>
          ) : docs.length === 0 ? (
            <p className="text-sm text-[#4B4D56]">Nothing indexed yet.</p>
          ) : (
            <ul className="space-y-3">
              {docs.map((d) => {
                const st = STATUS_STYLES[d.status] || STATUS_STYLES.pending;
                const busy = busyDoc === d.id;
                return (
                  <li key={d.id} className="rounded-2xl border border-[#E2E2D4] bg-[#FBFBEF] p-3">
                    <div className="flex items-start gap-2">
                      <FileText className="h-5 w-5 mt-0.5 text-[#1F5FBF] shrink-0" aria-hidden="true" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-[#18191D] truncate" title={d.name}>{d.name}</p>
                        <div className="mt-1 flex items-center gap-2 flex-wrap">
                          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${st.cls}`}>{st.label}</span>
                          <span className="text-[11px] text-[#646672]">{d.chunkCount} chunks</span>
                        </div>
                        {d.error && <p className="mt-1 text-[11px] text-[#991B1B]">{d.error}</p>}
                      </div>
                    </div>
                    <div className="mt-2 flex justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => onReindex(d)}
                        disabled={busy}
                        className="text-xs font-bold px-2.5 py-1.5 rounded-lg hover:bg-[#E8E8DC] disabled:opacity-50 inline-flex items-center gap-1 cursor-pointer"
                        aria-label={`Re-index ${d.name}`}
                      >
                        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />}
                        Re-index
                      </button>
                      {!d.isProfile && (
                        <button
                          type="button"
                          onClick={() => onDelete(d)}
                          disabled={busy}
                          className="text-xs font-bold px-2.5 py-1.5 rounded-lg text-rose-600 hover:bg-rose-50 disabled:opacity-50 inline-flex items-center gap-1 cursor-pointer"
                          aria-label={`Delete ${d.name}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" /> Delete
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          <Link href="/documents" className="mt-4 inline-flex items-center gap-1.5 text-sm font-extrabold text-[#1F5FBF] hover:underline">
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> Upload more documents
          </Link>
        </aside>
      </div>
    </div>
  );
}
