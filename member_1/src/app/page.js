"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Sparkles,
  ShieldCheck,
  FileCheck,
  Mic,
  Keyboard,
  Eye,
  Sliders,
  ArrowRight,
  CheckCircle2,
  FileUp,
  Award,
  Zap,
  HelpCircle,
  ExternalLink,
  Bot
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

export default function HomePage() {
  const [demoTextSize, setDemoTextSize] = useState("normal"); // normal, large, xlarge
  const [demoHighContrast, setDemoHighContrast] = useState(false);

  const getTextSizeClass = () => {
    if (demoTextSize === "large") return "text-lg";
    if (demoTextSize === "xlarge") return "text-xl";
    return "text-base";
  };

  return (
    <div className="flex flex-col w-full">
      {/* 1. HERO SECTION */}
      <section className="relative overflow-hidden bg-gradient-to-b from-teal-50/50 via-white to-slate-50 py-16 sm:py-24 lg:py-28 border-b border-slate-200">
        {/* Subtle decorative grid background */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f766e08_1px,transparent_1px),linear-gradient(to_bottom,#0f766e08_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="flex flex-col items-center text-center max-w-3xl mx-auto">
            
            {/* Live Status Pill */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-teal-100/80 border border-teal-300 text-teal-900 text-xs sm:text-sm font-semibold mb-6 shadow-xs">
              <Sparkles className="h-4 w-4 text-teal-700" aria-hidden="true" />
              <span>PRAYAS 3.0 • AI-Powered Accessible Job Assistant</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight leading-[1.15] mb-6">
              Empowering Every Candidate to Apply <span className="text-teal-700 underline decoration-teal-400 decoration-wavy decoration-2">Without Barriers</span>
            </h1>

            {/* Subtitle */}
            <p className="text-lg sm:text-xl text-slate-600 leading-relaxed mb-8 max-w-2xl font-normal">
              Bridge the accessibility gap on complex job portals. PRAYAS provides a portable <strong>Accessibility Passport</strong>, hands-free voice assistance, and AI answer generation directly from your documents.
            </p>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full sm:w-auto">
              <Link href="/passport" className="w-full sm:w-auto">
                <Button
                  size="lg"
                  variant="primary"
                  className="w-full sm:w-auto bg-slate-900 hover:bg-slate-800 text-white shadow-md font-bold"
                  rightIcon={<ArrowRight className="h-5 w-5" />}
                >
                  Create Accessibility Passport
                </Button>
              </Link>
              <Link href="/dashboard" className="w-full sm:w-auto">
                <Button
                  size="lg"
                  variant="tealOutline"
                  className="w-full sm:w-auto font-bold border-2"
                >
                  View Demo Dashboard
                </Button>
              </Link>
            </div>

            {/* Accessibility Quick Guarantees */}
            <div className="mt-12 pt-8 border-t border-slate-200/80 grid grid-cols-2 sm:grid-cols-4 gap-4 w-full text-slate-700 text-xs sm:text-sm font-semibold">
              <div className="flex items-center justify-center gap-2 bg-white/80 p-2.5 rounded-lg border border-slate-200">
                <CheckCircle2 className="h-4 w-4 text-teal-600 shrink-0" aria-hidden="true" />
                <span>WCAG 2.2 AA Focus</span>
              </div>
              <div className="flex items-center justify-center gap-2 bg-white/80 p-2.5 rounded-lg border border-slate-200">
                <Keyboard className="h-4 w-4 text-teal-600 shrink-0" aria-hidden="true" />
                <span>100% Keyboard Nav</span>
              </div>
              <div className="flex items-center justify-center gap-2 bg-white/80 p-2.5 rounded-lg border border-slate-200">
                <Mic className="h-4 w-4 text-teal-600 shrink-0" aria-hidden="true" />
                <span>Voice Assistance Ready</span>
              </div>
              <div className="flex items-center justify-center gap-2 bg-white/80 p-2.5 rounded-lg border border-slate-200">
                <Bot className="h-4 w-4 text-teal-600 shrink-0" aria-hidden="true" />
                <span>AI Contextual RAG</span>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 2. CORE PILLARS SECTION */}
      <section className="py-16 sm:py-20 bg-white" aria-labelledby="features-heading">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 id="features-heading" className="text-3xl font-bold text-slate-900 tracking-tight sm:text-4xl">
              Engineered for Complete Independence
            </h2>
            <p className="mt-4 text-lg text-slate-600">
              Four unified modules designed to eliminate job application friction for persons with motor, visual, and cognitive preferences.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Feature 1 */}
            <Card className="flex flex-col justify-between border-slate-200 hover:shadow-lg transition-all hover:border-teal-500">
              <div>
                <div className="h-12 w-12 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700 mb-4">
                  <Sliders className="h-6 w-6" aria-hidden="true" />
                </div>
                <Badge variant="teal" className="mb-2">Passport Module</Badge>
                <CardTitle className="text-lg font-bold mb-2">Accessibility Passport</CardTitle>
                <CardDescription>
                  Store your text size, high contrast, voice, and keyboard navigation preferences once. They persist across all job portals automatically.
                </CardDescription>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-100">
                <Link href="/passport" className="text-sm font-semibold text-teal-700 hover:text-teal-900 inline-flex items-center gap-1">
                  Configure Passport <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </Card>

            {/* Feature 2 */}
            <Card className="flex flex-col justify-between border-slate-200 hover:shadow-lg transition-all hover:border-teal-500">
              <div>
                <div className="h-12 w-12 rounded-xl bg-slate-100 border border-slate-300 flex items-center justify-center text-slate-800 mb-4">
                  <FileUp className="h-6 w-6" aria-hidden="true" />
                </div>
                <Badge variant="primary" className="mb-2">RAG Engine</Badge>
                <CardTitle className="text-lg font-bold mb-2">Document Hub & Answers</CardTitle>
                <CardDescription>
                  Upload your resume, past project logs, and cover letters. PRAYAS synthesizes accurate responses for tedious application questions.
                </CardDescription>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-100">
                <Link href="/documents" className="text-sm font-semibold text-slate-900 hover:text-teal-700 inline-flex items-center gap-1">
                  Upload Documents <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </Card>

            {/* Feature 3 */}
            <Card className="flex flex-col justify-between border-slate-200 hover:shadow-lg transition-all hover:border-teal-500">
              <div>
                <div className="h-12 w-12 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700 mb-4">
                  <Award className="h-6 w-6" aria-hidden="true" />
                </div>
                <Badge variant="teal" className="mb-2">Auditor Module</Badge>
                <CardTitle className="text-lg font-bold mb-2">Accessibility Scorecard</CardTitle>
                <CardDescription>
                  Real-time audit of employer career pages. Identifies missing labels, low contrast inputs, and unverified CAPTCHAs before you start.
                </CardDescription>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-100">
                <Link href="/scorecard" className="text-sm font-semibold text-teal-700 hover:text-teal-900 inline-flex items-center gap-1">
                  View Scorecard <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </Card>

            {/* Feature 4 */}
            <Card className="flex flex-col justify-between border-slate-200 hover:shadow-lg transition-all hover:border-teal-500">
              <div>
                <div className="h-12 w-12 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-800 mb-4">
                  <Zap className="h-6 w-6" aria-hidden="true" />
                </div>
                <Badge variant="warning" className="mb-2">Chrome Extension</Badge>
                <CardTitle className="text-lg font-bold mb-2">In-Browser Companion</CardTitle>
                <CardDescription>
                  Floating accessible overlay injecting voice-to-text, autofocus helpers, and single-click answer filling on Taleo, Workday, and LinkedIn.
                </CardDescription>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-100">
                <Link href="/dashboard" className="text-sm font-semibold text-amber-900 hover:text-teal-700 inline-flex items-center gap-1">
                  Explore Extension Guide <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* 3. INTERACTIVE ACCESSIBILITY PREVIEW TOOLBAR */}
      <section className="py-14 bg-slate-900 text-white" aria-labelledby="live-preview-heading">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
            <div className="max-w-xl">
              <span className="text-teal-400 font-bold uppercase tracking-wider text-xs">
                Interactive Preview
              </span>
              <h2 id="live-preview-heading" className="text-2xl sm:text-3xl font-bold mt-2">
                Experience Accessible Styling in Real-Time
              </h2>
              <p className="text-slate-300 mt-2 text-sm leading-relaxed">
                Test how PRAYAS dynamically adapts typography sizes and contrast levels to suit your personal visual needs.
              </p>
            </div>

            {/* Interactive Controls */}
            <div className="bg-slate-800/90 border border-slate-700 p-5 rounded-2xl flex flex-wrap items-center gap-4">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="text-size-select" className="text-xs font-semibold text-slate-300">
                  Text Size Preference
                </label>
                <div className="flex gap-1.5" id="text-size-select">
                  <button
                    type="button"
                    onClick={() => setDemoTextSize("normal")}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg border min-h-[38px] ${
                      demoTextSize === "normal"
                        ? "bg-teal-600 text-white border-teal-500"
                        : "bg-slate-700 text-slate-300 border-slate-600 hover:bg-slate-600"
                    }`}
                  >
                    Regular (A)
                  </button>
                  <button
                    type="button"
                    onClick={() => setDemoTextSize("large")}
                    className={`px-3 py-1.5 text-sm font-bold rounded-lg border min-h-[38px] ${
                      demoTextSize === "large"
                        ? "bg-teal-600 text-white border-teal-500"
                        : "bg-slate-700 text-slate-300 border-slate-600 hover:bg-slate-600"
                    }`}
                  >
                    Large (A+)
                  </button>
                  <button
                    type="button"
                    onClick={() => setDemoTextSize("xlarge")}
                    className={`px-3 py-1.5 text-base font-bold rounded-lg border min-h-[38px] ${
                      demoTextSize === "xlarge"
                        ? "bg-teal-600 text-white border-teal-500"
                        : "bg-slate-700 text-slate-300 border-slate-600 hover:bg-slate-600"
                    }`}
                  >
                    Extra (A++)
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-slate-300">Contrast Mode</span>
                <button
                  type="button"
                  onClick={() => setDemoHighContrast(!demoHighContrast)}
                  className={`px-3.5 py-1.5 text-xs font-bold rounded-lg border min-h-[38px] flex items-center gap-2 ${
                    demoHighContrast
                      ? "bg-amber-400 text-slate-950 border-amber-300"
                      : "bg-slate-700 text-slate-300 border-slate-600 hover:bg-slate-600"
                  }`}
                  aria-pressed={demoHighContrast}
                >
                  <Eye className="h-4 w-4" />
                  {demoHighContrast ? "High Contrast Active" : "Standard Contrast"}
                </button>
              </div>
            </div>
          </div>

          {/* Sample Rendered Accessible Card */}
          <div
            className={`mt-8 p-6 rounded-xl border transition-all ${
              demoHighContrast
                ? "bg-black text-amber-300 border-4 border-amber-400"
                : "bg-white text-slate-900 border-slate-200"
            }`}
          >
            <p className={`font-bold ${getTextSizeClass()}`}>
              Sample Accessible Application Snippet:
            </p>
            <p className={`mt-2 ${getTextSizeClass()} leading-relaxed opacity-90`}>
              &quot;Why are you a good fit for this role? PRAYAS automatically parsed your past experience from your uploaded portfolio and summarized 3 key engineering achievements with clear bullet points.&quot;
            </p>
            <div className="mt-4 flex gap-3">
              <span className="inline-block px-3 py-1 rounded bg-teal-700 text-white font-bold text-xs">
                Auto-Filled by PRAYAS
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 4. HOW IT WORKS SECTION */}
      <section className="py-16 sm:py-24 bg-slate-50 border-b border-slate-200" aria-labelledby="how-it-works-heading">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 id="how-it-works-heading" className="text-3xl font-bold text-slate-900 tracking-tight sm:text-4xl">
              3-Step Seamless Process
            </h2>
            <p className="mt-3 text-base sm:text-lg text-slate-600">
              Designed for ease of use, screen-readers, and assistive technology devices.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            {/* Step 1 */}
            <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-xs relative flex flex-col">
              <div className="h-12 w-12 rounded-full bg-slate-900 text-white flex items-center justify-center font-black text-lg mb-6 shadow-sm">
                1
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Create Passport</h3>
              <p className="text-slate-600 text-sm leading-relaxed mb-4">
                Define your interaction preferences (voice commands, keyboard traps avoidance, font scaling, simple language toggle).
              </p>
              <div className="mt-auto">
                <span className="text-xs font-semibold text-teal-700 bg-teal-50 px-2.5 py-1 rounded-md border border-teal-200">
                  Takes &lt; 2 minutes
                </span>
              </div>
            </div>

            {/* Step 2 */}
            <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-xs relative flex flex-col">
              <div className="h-12 w-12 rounded-full bg-teal-700 text-white flex items-center justify-center font-black text-lg mb-6 shadow-sm">
                2
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Upload Documents</h3>
              <p className="text-slate-600 text-sm leading-relaxed mb-4">
                Upload your resume, past project highlights, and custom responses. Our secure RAG engine indexes your profile context.
              </p>
              <div className="mt-auto">
                <span className="text-xs font-semibold text-teal-700 bg-teal-50 px-2.5 py-1 rounded-md border border-teal-200">
                  PDF, DOCX, TXT Supported
                </span>
              </div>
            </div>

            {/* Step 3 */}
            <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-xs relative flex flex-col">
              <div className="h-12 w-12 rounded-full bg-slate-900 text-white flex items-center justify-center font-black text-lg mb-6 shadow-sm">
                3
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Apply with AI Assist</h3>
              <p className="text-slate-600 text-sm leading-relaxed mb-4">
                Open any job website. PRAYAS injects accessible keyboard pathways, speech inputs, and verified question answers effortlessly.
              </p>
              <div className="mt-auto">
                <span className="text-xs font-semibold text-teal-700 bg-teal-50 px-2.5 py-1 rounded-md border border-teal-200">
                  Works on Any Web Portal
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. CALL TO ACTION BANNER */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-teal-950 rounded-3xl p-8 sm:p-12 lg:p-16 text-white text-center sm:text-left flex flex-col lg:flex-row items-center justify-between gap-8 shadow-xl">
            <div className="max-w-2xl">
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
                Ready to make job applications effortless?
              </h2>
              <p className="mt-4 text-slate-300 text-base sm:text-lg leading-relaxed">
                Join PRAYAS 3.0 and take control of your career journey with accessible AI guidance.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-4 shrink-0">
              <Link href="/auth/signup">
                <Button size="lg" variant="secondary" className="bg-teal-600 hover:bg-teal-500 font-bold px-8">
                  Get Started Free
                </Button>
              </Link>
              <Link href="/auth/login">
                <Button size="lg" variant="outline" className="bg-white/10 hover:bg-white/20 text-white border-white/30 font-bold">
                  Sign In
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
