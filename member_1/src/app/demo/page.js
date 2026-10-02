"use client";

import React from "react";
import Link from "next/link";
import { 
  Play, 
  Mic, 
  ShieldCheck, 
  ExternalLink, 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle, 
  Keyboard, 
  ArrowRight,
} from "lucide-react";

export default function DemoHubPage() {
  return (
    <div className="min-h-screen bg-[#FBFBEF] py-12 px-4 sm:px-6 lg:px-8 space-y-8">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Header Folder Tab */}
        <div className="flex items-center justify-between">
          <div className="folder-tab-header">
            <span>LIVE DEMO TESTBED</span>
            <ArrowRight className="h-4 w-4" />
          </div>
          <div className="text-xs font-bold text-[#646672] uppercase tracking-wider">
            EVALUATION CONSOLE
          </div>
        </div>

        {/* Header Banner (Charcoal Image 1 Card) */}
        <div className="bg-[#18191D] border-2 border-[#2C2D35] text-white rounded-3xl p-8 shadow-xl">
          <div className="flex flex-wrap items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#CEEEFD] text-[#0284C7] text-xs font-black uppercase tracking-wider mb-3">
                <Sparkles className="w-3.5 h-3.5" />
                Live Demo &amp; Presentation Console
              </div>
              <h1 className="font-display text-3xl sm:text-4xl font-black tracking-tight text-white">
                PRAYAS 3.0 Interactive Testbed
              </h1>
              <p className="mt-2 text-[#A0A2AB] max-w-2xl text-base leading-relaxed">
                Experience end-to-end accessible job applications: controlled portal with deliberate accessibility barriers, Chrome extension ARIA repairs, voice navigation with Prayas.AI, and document-grounded AI answers.
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3">
              <a
                href="/demo/job-application.html"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-[#2F9BE0] hover:bg-[#1F5FBF] text-white font-black text-base shadow-lg transition-all"
              >
                <Play className="w-5 h-5 fill-current" />
                Launch Demo Portal
                <ExternalLink className="w-4 h-4 ml-1" />
              </a>
              <a
                href="/demo/presentation-mode.html"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-[#25272E] hover:bg-[#32343E] text-white font-bold text-sm border border-[#3F414E] transition-all"
              >
                3-Min Pitch Console
                <ExternalLink className="w-4 h-4 ml-1" />
              </a>
            </div>
          </div>
        </div>

        {/* Feature Cards Grid in Browser-Window Frames */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Card 1: Deliberate Barriers Testbed */}
          <div className="browser-window-frame">
            <div className="browser-window-header">
              <span className="browser-window-dot bg-[#FF5F56]"></span>
              <span className="browser-window-dot bg-[#FFBD2E]"></span>
              <span className="browser-window-dot bg-[#27C93F]"></span>
              <span className="text-xs font-bold text-[#646672] ml-2">Barriers Testbed</span>
            </div>
            <div className="p-6">
              <div className="w-12 h-12 rounded-2xl bg-[#FEF3C7] text-[#92400E] flex items-center justify-center mb-4 font-bold border border-[#FDE68A]">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h2 className="font-display text-xl font-bold text-[#18191D] mb-2">
                Controlled Barriers
              </h2>
              <p className="text-sm text-[#4B4D56] mb-4 leading-relaxed">
                Real-world simulated application form with missing labels, irregular tab order, and complex essay prompts.
              </p>
              <ul className="text-xs text-[#646672] space-y-2 mb-6">
                <li className="flex items-center gap-2 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#B45309]"></span>
                  Barrier 1: Unassociated phone label
                </li>
                <li className="flex items-center gap-2 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#B45309]"></span>
                  Barrier 2: Broken tabindex order (trap)
                </li>
                <li className="flex items-center gap-2 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#B45309]"></span>
                  Barrier 3: Open-ended essay prompt
                </li>
              </ul>
              <a
                href="/demo/job-application.html"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-bold text-[#1F5FBF] hover:underline inline-flex items-center gap-1"
              >
                Open Form <ArrowRight className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Card 2: Chrome Extension Assistant */}
          <div className="browser-window-frame">
            <div className="browser-window-header">
              <span className="browser-window-dot bg-[#FF5F56]"></span>
              <span className="browser-window-dot bg-[#FFBD2E]"></span>
              <span className="browser-window-dot bg-[#27C93F]"></span>
              <span className="text-xs font-bold text-[#646672] ml-2">ARIA Repairs</span>
            </div>
            <div className="p-6">
              <div className="w-12 h-12 rounded-2xl bg-[#E0F2FE] text-[#0284C7] flex items-center justify-center mb-4 font-bold border border-[#BAE6FD]">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h2 className="font-display text-xl font-bold text-[#18191D] mb-2">
                Extension ARIA Repairs
              </h2>
              <p className="text-sm text-[#4B4D56] mb-4 leading-relaxed">
                Manifest V3 Chrome Extension audits the page in real time, applies non-destructive ARIA improvements, and fills verified Passport details.
              </p>
              <ul className="text-xs text-[#646672] space-y-2 mb-6">
                <li className="flex items-center gap-2 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#2F9BE0]"></span>
                  One-Click Safe ARIA Remediation
                </li>
                <li className="flex items-center gap-2 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#2F9BE0]"></span>
                  Consent-Gated Profile Autofill
                </li>
                <li className="flex items-center gap-2 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#2F9BE0]"></span>
                  Live Scorecard Sync to Backend
                </li>
              </ul>
              <Link
                href="/scorecard"
                className="text-sm font-bold text-[#1F5FBF] hover:underline inline-flex items-center gap-1"
              >
                View Scorecard Dashboard <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Card 3: Voice & AI RAG Agent */}
          <div className="browser-window-frame">
            <div className="browser-window-header">
              <span className="browser-window-dot bg-[#FF5F56]"></span>
              <span className="browser-window-dot bg-[#FFBD2E]"></span>
              <span className="browser-window-dot bg-[#27C93F]"></span>
              <span className="text-xs font-bold text-[#646672] ml-2">Voice &amp; AI</span>
            </div>
            <div className="p-6">
              <div className="w-12 h-12 rounded-2xl bg-[#EFF6FF] text-[#1F5FBF] flex items-center justify-center mb-4 font-bold border border-[#BFDBFE]">
                <Mic className="w-6 h-6" />
              </div>
              <h2 className="font-display text-xl font-bold text-[#18191D] mb-2">
                Voice &amp; Conversational AI
              </h2>
              <p className="text-sm text-[#4B4D56] mb-4 leading-relaxed">
                Push-to-talk Web Speech API with full keyboard parity, two-mode state machine for commands vs dictation, and truthful RAG answers.
              </p>
              <ul className="text-xs text-[#646672] space-y-2 mb-6">
                <li className="flex items-center gap-2 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#1F5FBF]"></span>
                  Field Nav: <kbd className="px-1.5 py-0.5 bg-[#F3F3E3] rounded text-[10px] font-mono border">Alt+N</kbd> / <kbd className="px-1.5 py-0.5 bg-[#F3F3E3] rounded text-[10px] font-mono border">Alt+B</kbd>
                </li>
                <li className="flex items-center gap-2 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#1F5FBF]"></span>
                  Push-to-Talk: <kbd className="px-1.5 py-0.5 bg-[#F3F3E3] rounded text-[10px] font-mono border">Alt+M</kbd>
                </li>
                <li className="flex items-center gap-2 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#1F5FBF]"></span>
                  AI Draft RAG: <kbd className="px-1.5 py-0.5 bg-[#F3F3E3] rounded text-[10px] font-mono border">Alt+H</kbd>
                </li>
              </ul>
              <Link
                href="/assistant"
                className="text-sm font-bold text-[#1F5FBF] hover:underline inline-flex items-center gap-1"
              >
                Test AI Q&amp;A Assistant <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

        </div>

        {/* Quick Testing Instructions in Image 1 Box */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E2E2D4] shadow-xs">
          <h3 className="font-display text-lg font-bold text-[#18191D] mb-4 flex items-center gap-2">
            <Keyboard className="w-5 h-5 text-[#2F9BE0]" />
            How to Demonstrate PRAYAS 3.0 in 3 Minutes:
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-[#4B4D56]">
            <div className="bg-[#FBFBEF] p-4 rounded-2xl border border-[#E2E2D4]">
              <span className="font-bold text-[#18191D] block mb-1">1. Load Chrome Extension:</span>
              Open <code className="text-[#1F5FBF] bg-white px-1.5 py-0.5 rounded border text-xs">chrome://extensions</code> in Chrome, toggle <strong>Developer mode</strong>, and click <strong>Load unpacked</strong>. Select the <code className="text-[#18191D] font-mono text-xs">member-3-prayas-extension</code> folder.
            </div>
            <div className="bg-[#FBFBEF] p-4 rounded-2xl border border-[#E2E2D4]">
              <span className="font-bold text-[#18191D] block mb-1">2. Open Demo Job Portal:</span>
              Click <strong>Launch Demo Portal</strong> above. Notice the PRAYAS floating dock at the bottom right showing detected accessibility barriers.
            </div>
            <div className="bg-[#FBFBEF] p-4 rounded-2xl border border-[#E2E2D4]">
              <span className="font-bold text-[#18191D] block mb-1">3. Apply Safe Fixes &amp; Autofill:</span>
              Click <strong>🛡️ Safe ARIA Fixes</strong> on the extension dock to resolve labels, then click <strong>⚡ Autofill</strong> to populate details from the candidate&apos;s Passport.
            </div>
            <div className="bg-[#FBFBEF] p-4 rounded-2xl border border-[#E2E2D4]">
              <span className="font-bold text-[#18191D] block mb-1">4. Test Voice &amp; RAG Essay Help:</span>
              Press <kbd className="px-1.5 py-0.5 bg-white rounded font-mono text-xs border">Alt+H</kbd> on the behavioral question. The voice agent reads the prompt, fetches an evidence-grounded draft, and inserts it with consent!
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
