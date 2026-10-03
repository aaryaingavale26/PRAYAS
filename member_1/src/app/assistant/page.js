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
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Languages,
  Sparkles,
} from "lucide-react";
import { askAssistant, getSupportedLanguages, synthesizeVoice } from "@/lib/apiClient";
import { deleteDocument, getDocuments, reindexDocument, reindexProfile } from "@/lib/documentService";
import { Button } from "@/components/ui/Button";

const MULTILINGUAL_PROMPTS = {
  en: [
    "Summarize my experience",
    "Draft an answer for 'Why do you want this job?'",
    "What are my key skills?",
    "When does my passport expire?",
  ],
  hi: [
    "मेरी मुख्य स्किल्स क्या हैं?",
    "मेरे अनुभव का सारांश दीजिए",
    "मुझे इस नौकरी के लिए उत्तर तैयार करें",
    "मेरी शिक्षा और योग्यताओं के बारे में बताएं",
  ],
  ta: [
    "எனது முக்கிய திறன்கள் யாவை?",
    "எனது பணி அனுபவத்தை சுருக்கமாகக் கூறுங்கள்",
    "இந்தப் பணிக்கு ஏன் விண்ணப்பிக்கிறீர்கள் என விடை எழுதுங்கள்",
    "எனது பாஸ்போர்ட் எப்போது காலாவதியாகிறது?",
  ],
  te: [
    "నా ముఖ్యమైన నైపుణ్యాలు ఏమిటి?",
    "నా పని అనుభవాన్ని క్లుప్తంగా చెప్పండి",
    "ఈ ఉద్యోగం మీకు ఎందుకు కావాలి అని సమాధానం రాయండి",
  ],
  bn: [
    "আমার মূল দক্ষতাগুলি কী কী?",
    "আমার কাজের অভিজ্ঞতার সারসংক্ষেপ দিন",
    "এই চাকরির জন্য একটি উপযুক্ত উত্তর লিখুন",
  ],
  mr: [
    "माझी मुख्य कौशल्ये कोणती आहेत?",
    "माझ्या कामाच्या अनुभवाचा सारांश द्या",
    "या नोकरीसाठी एक प्रभावी उत्तर तयार करा",
  ],
  gu: [
    "મારી મુખ્ય કુશળતા કઈ છે?",
    "મારા કાર્ય અનુભવનો સારાંશ આપો",
    "આ નોકરી માટે સારો ઉત્તર તૈયાર કરો",
  ],
  kn: [
    "ನನ್ನ ಪ್ರಮುಖ ಕೌಶಲ್ಯಗಳು ಯಾವುವು?",
    "ನನ್ನ ಕೆಲಸದ ಅನುಭವದ ಸಾರಾಂಶ ನೀಡಿ",
  ],
  ml: [
    "എന്റെ പ്രധാന കഴിവുകൾ എന്തൊക്കെയാണ്?",
    "എന്റെ പ്രവൃത്തിപരിചയം ചുരുക്കി പറയുക",
  ],
  pa: [
    "ਮੇਰੇ ਮੁੱਖ ਹੁਨਰ ਕੀ ਹਨ?",
    "ਮੇਰੇ ਤਜ਼ਰਬੇ ਦਾ ਸਾਰ ਦਿਓ",
  ],
};

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

  // Multilingual & Bhashini State
  const [languagesList, setLanguagesList] = useState([]);
  const [selectedLang, setSelectedLang] = useState("en");
  const [isListening, setIsListening] = useState(false);
  const [speakingIndex, setSpeakingIndex] = useState(null);
  const [autoSpeak, setAutoSpeak] = useState(false);
  const recognitionRef = useRef(null);
  const audioPlayerRef = useRef(null);

  const [docs, setDocs] = useState([]);
  const [docsLoading, setDocsLoading] = useState(true);
  const [docsError, setDocsError] = useState("");
  const [busyDoc, setBusyDoc] = useState(null);

  const endRef = useRef(null);

  // Load supported languages
  useEffect(() => {
    async function initLangs() {
      const langs = await getSupportedLanguages();
      setLanguagesList(langs);
      const saved = typeof window !== "undefined" ? localStorage.getItem("prayas_preferred_lang") : null;
      if (saved && langs.some((l) => l.code === saved)) {
        setSelectedLang(saved);
      }
    }
    initLangs();
  }, []);

  const handleLangChange = (code) => {
    setSelectedLang(code);
    if (typeof window !== "undefined") {
      localStorage.setItem("prayas_preferred_lang", code);
    }
    const lObj = languagesList.find((l) => l.code === code);
    if (lObj) {
      setAnnounce(`Switched language to ${lObj.name} (${lObj.nativeName})`);
    }
  };

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

  // Stop any active audio / speech synthesis
  const stopVoice = useCallback(() => {
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      audioPlayerRef.current = null;
    }
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setSpeakingIndex(null);
  }, []);

  // Play voice (Bhashini TTS with browser SpeechSynthesis fallback)
  const playVoice = useCallback(async (text, langCode, msgIdx) => {
    if (speakingIndex === msgIdx) {
      stopVoice();
      return;
    }
    stopVoice();
    setSpeakingIndex(msgIdx);

    const activeLangObj = languagesList.find((l) => l.code === langCode) || { bcp47: "en-IN" };

    try {
      // 1. Try Bhashini TTS from backend
      const ttsData = await synthesizeVoice({ text, language: langCode });
      if (ttsData?.audio_base64) {
        const audio = new Audio(`data:audio/wav;base64,${ttsData.audio_base64}`);
        audioPlayerRef.current = audio;
        audio.onended = () => setSpeakingIndex(null);
        audio.onerror = () => {
          fallbackBrowserSpeech(text, activeLangObj.bcp47, () => setSpeakingIndex(null));
        };
        await audio.play();
        return;
      }
    } catch (err) {
      // Fallback cleanly to browser speech synthesis
    }

    // 2. Client-side SpeechSynthesis fallback
    fallbackBrowserSpeech(text, activeLangObj.bcp47, () => setSpeakingIndex(null));
  }, [languagesList, speakingIndex, stopVoice]);

  function fallbackBrowserSpeech(text, bcp47, onEnd) {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      setSpeakingIndex(null);
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = bcp47 || "en-IN";
    utterance.rate = 0.95;

    // Pick localized voice matching bcp47 or language
    const voices = window.speechSynthesis.getVoices();
    const langPrefix = (bcp47 || "en").split("-")[0];
    const match = voices.find((v) => v.lang.toLowerCase() === bcp47.toLowerCase()) ||
                  voices.find((v) => v.lang.toLowerCase().startsWith(langPrefix));
    if (match) utterance.voice = match;

    utterance.onend = onEnd;
    utterance.onerror = onEnd;
    window.speechSynthesis.speak(utterance);
  }

  // Voice Input (Microphone SpeechRecognition)
  const toggleListening = () => {
    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
      return;
    }

    const SpeechRecognition = typeof window !== "undefined" && (window.SpeechRecognition || window.webkitSpeechRecognition);
    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in this browser. Please use Chrome or Edge.");
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      const activeLangObj = languagesList.find((l) => l.code === selectedLang);
      recognition.lang = activeLangObj?.bcp47 || "en-IN";
      recognition.interimResults = true;
      recognition.continuous = false;

      recognition.onstart = () => {
        setIsListening(true);
        setAnnounce(`Listening in ${activeLangObj?.name || "English"}… Speak now.`);
      };

      recognition.onresult = (event) => {
        let finalTrans = "";
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTrans += event.results[i][0].transcript;
          } else {
            setQuestion(event.results[i][0].transcript);
          }
        }
        if (finalTrans) {
          setQuestion(finalTrans);
        }
      };

      recognition.onerror = (e) => {
        setIsListening(false);
        setAnnounce(`Voice error: ${e.error}`);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (e) {
      setIsListening(false);
      alert("Microphone access could not be initialized.");
    }
  };

  const send = async (text) => {
    const q = (text ?? question).trim();
    if (!q || asking) return;
    setQuestion("");
    stopVoice();

    setMessages((m) => [...m, { role: "user", text: q }]);
    setAsking(true);
    setAnnounce("Thinking…");

    try {
      const res = await askAssistant({ question: q, language: selectedLang });
      const newMsg = {
        role: "assistant",
        ...res,
        text: res.answer,
        lang: res.language || selectedLang,
      };

      setMessages((m) => {
        const next = [...m, newMsg];
        if (autoSpeak && res.answer) {
          setTimeout(() => playVoice(res.answer, res.language || selectedLang, next.length - 1), 300);
        }
        return next;
      });

      setAnnounce(res.found ? "Answer ready." : "Information not found in your documents.");
    } catch (e) {
      setMessages((m) => [
        ...m,
        { role: "assistant", error: true, text: e.message || "Something went wrong.", lang: selectedLang },
      ]);
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
  const currentPrompts = MULTILINGUAL_PROMPTS[selectedLang] || MULTILINGUAL_PROMPTS.en;
  const activeLangObj = languagesList.find((l) => l.code === selectedLang) || { name: "English", nativeName: "English" };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10 w-full space-y-6">
      <div className="sr-only" aria-live="polite" role="status">{announce}</div>

      {/* Top Header & Bhashini Language Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border-2 border-[#E2E2D4] rounded-3xl p-5 shadow-sm">
        <div>
          <div className="folder-tab-header mb-1">
            <span>AI Multilingual Assistant</span>
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-black text-[#18191D] tracking-tight">
            Ask in any Indian language
          </h1>
          <p className="text-xs sm:text-sm text-[#5B5D68] mt-1">
            Powered by <strong>Bhashini Indic AI</strong> & grounded on your uploaded documents and Passport.
          </p>
        </div>

        {/* Language Selection Bar */}
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-[#F0F7FF] border border-[#BFDBFE] text-xs font-bold text-[#1E40AF]">
            <Languages className="h-4 w-4 text-[#2563EB]" />
            <label htmlFor="language-select" className="sr-only">Choose Language</label>
            <select
              id="language-select"
              value={selectedLang}
              onChange={(e) => handleLangChange(e.target.value)}
              className="bg-transparent font-extrabold text-[#1E3A8A] outline-none cursor-pointer pr-1"
            >
              {languagesList.map((l) => (
                <option key={l.code} value={l.code} className="text-black">
                  {l.nativeName} ({l.name})
                </option>
              ))}
            </select>
          </div>

          {/* Auto Speak Toggle */}
          <button
            type="button"
            onClick={() => setAutoSpeak(!autoSpeak)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-2xl border text-xs font-bold transition-colors cursor-pointer ${
              autoSpeak
                ? "bg-[#D1FAE5] border-[#10B981] text-[#065F46]"
                : "bg-[#F3F4F6] border-[#E5E7EB] text-[#4B5563] hover:border-[#9CA3AF]"
            }`}
            title="Automatically speak AI answers aloud"
            aria-pressed={autoSpeak}
          >
            {autoSpeak ? <Volume2 className="h-3.5 w-3.5 text-[#059669]" /> : <VolumeX className="h-3.5 w-3.5" />}
            <span>{autoSpeak ? "Auto Voice On" : "Auto Voice Off"}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* CHAT INTERFACE */}
        <section aria-label="Chat" className="lg:col-span-2 bg-[#1E1F24] rounded-3xl border-2 border-[#2C2D35] text-[#F8F8F0] flex flex-col min-h-[540px] shadow-xl">
          {/* Active Dialect Badge */}
          <div className="px-5 py-2.5 bg-[#25262D] border-b border-[#33363F] flex items-center justify-between text-xs text-[#A1A3B0]">
            <span className="flex items-center gap-1.5 font-semibold">
              <Sparkles className="h-3.5 w-3.5 text-[#38BDF8]" />
              Speaking & Answering in: <strong className="text-white">{activeLangObj.nativeName} ({activeLangObj.name})</strong>
            </span>
            <span className="text-[11px] text-[#646672]">Bhashini ASR & TTS Active</span>
          </div>

          <div className="flex-1 p-5 sm:p-6 space-y-4 overflow-y-auto max-h-[58vh]" role="log" aria-live="off" aria-label="Conversation">
            {messages.length === 0 && !noDocs && (
              <div className="text-center py-8">
                <div className="h-14 w-14 mx-auto rounded-2xl bg-[#2F9BE0] flex items-center justify-center mb-3 shadow-lg shadow-[#2F9BE0]/20">
                  <Bot className="h-7 w-7 text-white" aria-hidden="true" />
                </div>
                <p className="font-display text-xl font-extrabold">
                  {selectedLang === "hi"
                    ? "आप क्या जानना चाहते हैं?"
                    : selectedLang === "ta"
                    ? "நீங்கள் என்ன தெரிந்துகொள்ள விரும்புகிறீர்கள்?"
                    : selectedLang === "te"
                    ? "మీరు ఏమి తెలుసుకోవాలనుకుంటున్నారు?"
                    : "What would you like to know?"}
                </p>
                <p className="text-sm text-[#9A9CA8] mt-1">
                  Ask by typing or clicking the microphone icon below.
                </p>
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
                  <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-[#2F9BE0] text-white px-4 py-3 text-sm font-semibold whitespace-pre-wrap">
                    {m.text}
                  </div>
                  <UserIcon className="h-6 w-6 mt-1 text-[#9A9CA8] shrink-0" aria-hidden="true" />
                </div>
              ) : (
                <div key={i} className="flex gap-2">
                  <Bot className="h-6 w-6 mt-1 text-[#2F9BE0] shrink-0" aria-hidden="true" />
                  <div className={`max-w-[88%] rounded-2xl rounded-tl-sm px-4 py-3 text-sm border ${m.error ? "bg-[#3B1D1D] border-[#7F1D1D]" : "bg-[#272830] border-[#33363F]"}`}>
                    <div className="flex items-start justify-between gap-3">
                      <p className="whitespace-pre-wrap leading-relaxed flex-1">{m.text}</p>
                      
                      {/* Voice Output Speaker Button */}
                      {!m.error && m.text && (
                        <button
                          type="button"
                          onClick={() => playVoice(m.text, m.lang || selectedLang, i)}
                          className={`p-1.5 rounded-lg border transition-all cursor-pointer shrink-0 ${
                            speakingIndex === i
                              ? "bg-[#2F9BE0] border-[#38BDF8] text-white animate-pulse"
                              : "bg-[#18191D] border-[#33363F] text-[#9A9CA8] hover:text-white hover:border-[#2F9BE0]"
                          }`}
                          aria-label={speakingIndex === i ? "Stop speaking" : "Listen to answer aloud"}
                          title={speakingIndex === i ? "Stop voice" : "Read answer aloud"}
                        >
                          {speakingIndex === i ? (
                            <VolumeX className="h-4 w-4 text-white" />
                          ) : (
                            <Volume2 className="h-4 w-4" />
                          )}
                        </button>
                      )}
                    </div>

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
                <Loader2 className="h-5 w-5 animate-spin text-[#2F9BE0]" aria-hidden="true" /> Searching your documents & translating…
              </div>
            )}
            <div ref={endRef} />
          </div>

          {/* Prompt Chips & Input Form */}
          <div className="border-t border-[#2C2D35] p-4 sm:p-5 space-y-3 bg-[#18191D]/80 rounded-b-3xl">
            <div className="flex flex-wrap gap-2" aria-label="Suggested questions">
              {currentPrompts.map((c) => (
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
              className="flex items-center gap-2"
            >
              <label htmlFor="assistant-question" className="sr-only">Ask the assistant</label>
              
              <div className="relative flex-1">
                <input
                  id="assistant-question"
                  type="text"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder={`Ask in ${activeLangObj.nativeName} or English…`}
                  className="w-full rounded-xl bg-[#272830] border-2 border-[#33363F] focus:border-[#2F9BE0] px-4 py-3 pr-11 text-sm text-white placeholder:text-[#7A7C88] outline-none"
                  autoComplete="off"
                />

                {/* Voice Input Microphone Button */}
                <button
                  type="button"
                  onClick={toggleListening}
                  className={`absolute right-2.5 top-1/2 -translate-y-1/2 p-2 rounded-lg transition-colors cursor-pointer ${
                    isListening
                      ? "bg-rose-600 text-white animate-pulse"
                      : "text-[#9A9CA8] hover:text-white hover:bg-[#33363F]"
                  }`}
                  aria-label={isListening ? "Stop listening" : `Start voice input in ${activeLangObj.name}`}
                  title={isListening ? "Listening... click to stop" : `Voice input in ${activeLangObj.nativeName}`}
                >
                  {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                </button>
              </div>

              <Button
                type="submit"
                variant="blue"
                disabled={asking || !question.trim()}
                aria-label="Send question"
                leftIcon={<Send className="h-4 w-4" />}
              >
                Ask
              </Button>
            </form>
          </div>
        </section>

        {/* KNOWLEDGE SOURCES PANEL */}
        <aside aria-label="Knowledge sources" className="bg-white rounded-3xl border-2 border-[#E2E2D4] p-5 h-fit shadow-sm">
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
