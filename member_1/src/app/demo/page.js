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
  Layers, 
  ArrowRight,
  Eye,
  Sliders
} from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function DemoHubPage() {
  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 text-white rounded-2xl p-8 shadow-xl border border-teal-500/20">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/20 text-teal-300 text-xs font-bold uppercase tracking-wider mb-3 border border-teal-400/30">
                <Sparkles className="w-3.5 h-3.5" />
                Live Demo & Presentation Console
              </div>
              <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
                PRAYAS 3.0 Interactive Testbed
              </h1>
              <p className="mt-2 text-slate-300 max-w-2xl text-base">
                Experience end-to-end accessible job applications: controlled portal with deliberate accessibility barriers, Chrome extension ARIA repairs, voice navigation, and document-grounded AI answers.
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3">
              <a
                href="/demo/job-application.html"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-base shadow-lg shadow-teal-500/30 transition-all hover:scale-105 focus:ring-4 focus:ring-teal-300"
              >
                <Play className="w-5 h-5 fill-current" />
                Launch Demo Portal
                <ExternalLink className="w-4 h-4 ml-1" />
              </a>
              <a
                href="/demo/presentation-mode.html"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-sm border border-slate-700 transition-all"
              >
                3-Min Pitch Console
                <ExternalLink className="w-4 h-4 ml-1" />
              </a>
            </div>
          </div>
        </div>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Card 1: Deliberate Barriers Testbed */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-4 font-bold border border-amber-200">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">
              Controlled Barriers Testbed
            </h2>
            <p className="text-sm text-slate-600 mb-4 leading-relaxed">
              Real-world simulated application form with missing labels, irregular tab order, and complex essay prompts.
            </p>
            <ul className="text-xs text-slate-500 space-y-2 mb-6">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                Barrier 1: Unassociated phone label
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                Barrier 2: Broken tabindex order (trap)
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                Barrier 3: Open-ended essay prompt
              </li>
            </ul>
            <a
              href="/demo/job-application.html"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-bold text-teal-700 hover:text-teal-900 inline-flex items-center gap-1"
            >
              Open Form <ArrowRight className="w-4 h-4" />
            </a>
          </div>

          {/* Card 2: Chrome Extension Assistant */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center mb-4 font-bold border border-teal-200">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">
              Extension ARIA Repairs
            </h2>
            <p className="text-sm text-slate-600 mb-4 leading-relaxed">
              Manifest V3 Chrome Extension audits the page in real time, applies non-destructive ARIA improvements, and fills verified Passport details.
            </p>
            <ul className="text-xs text-slate-500 space-y-2 mb-6">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-600"></span>
                One-Click Safe ARIA Remediation
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-600"></span>
                Consent-Gated Profile Autofill
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-600"></span>
                Live Scorecard Sync to Backend
              </li>
            </ul>
            <Link
              href="/scorecard"
              className="text-sm font-bold text-teal-700 hover:text-teal-900 inline-flex items-center gap-1"
            >
              View Scorecard Dashboard <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Card 3: Voice & AI RAG Agent */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center mb-4 font-bold border border-indigo-200">
              <Mic className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">
              Voice & Conversational AI
            </h2>
            <p className="text-sm text-slate-600 mb-4 leading-relaxed">
              Push-to-talk Web Speech API with full keyboard parity, 7-step guided RAG dialog, and non-destructive answer insertion.
            </p>
            <ul className="text-xs text-slate-500 space-y-2 mb-6">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-600"></span>
                Keyboard Navigation: <kbd className="px-1.5 py-0.5 bg-slate-100 rounded text-[10px] font-mono border">Alt+N</kbd> / <kbd className="px-1.5 py-0.5 bg-slate-100 rounded text-[10px] font-mono border">Alt+B</kbd>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-600"></span>
                Push-to-Talk: <kbd className="px-1.5 py-0.5 bg-slate-100 rounded text-[10px] font-mono border">Alt+M</kbd>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-600"></span>
                AI Assistance Flow: <kbd className="px-1.5 py-0.5 bg-slate-100 rounded text-[10px] font-mono border">Alt+H</kbd>
              </li>
            </ul>
            <Link
              href="/assistant"
              className="text-sm font-bold text-teal-700 hover:text-teal-900 inline-flex items-center gap-1"
            >
              Test AI Q&A Assistant <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

        </div>

        {/* Quick Testing Instructions Banner */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs">
          <h3 className="text-lg font-bold text-slate-900 mb-3 flex items-center gap-2">
            <Keyboard className="w-5 h-5 text-teal-600" />
            How to Demonstrate PRAYAS 3.0 in 3 Minutes:
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-slate-700">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <span className="font-bold text-slate-900 block mb-1">1. Load Chrome Extension:</span>
              Open <code className="text-teal-700 bg-white px-1.5 py-0.5 rounded border text-xs">chrome://extensions</code> in Chrome, toggle <strong>Developer mode</strong>, and click <strong>Load unpacked</strong>. Select the <code className="text-slate-800 font-mono text-xs">member-3-prayas-extension</code> folder.
            </div>
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <span className="font-bold text-slate-900 block mb-1">2. Open Demo Job Portal:</span>
              Click <strong>Launch Demo Portal</strong> above. Notice the PRAYAS floating dock at the bottom right indicating detected accessibility barriers.
            </div>
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <span className="font-bold text-slate-900 block mb-1">3. Apply Safe Fixes & Autofill:</span>
              Click <strong>🛡️ Safe ARIA Fixes</strong> on the extension dock to resolve labels, then click <strong>⚡ Autofill</strong> to populate details from the candidate's Passport.
            </div>
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <span className="font-bold text-slate-900 block mb-1">4. Test Voice & RAG Essay Help:</span>
              Press <kbd className="px-1.5 py-0.5 bg-white rounded font-mono text-xs border">Alt+H</kbd> on the behavioral question. The voice agent reads the prompt, fetches an evidence-grounded draft, and inserts it with consent!
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
