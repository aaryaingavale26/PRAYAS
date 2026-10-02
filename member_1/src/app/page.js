"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Sparkles,
  ArrowRight,
  Check,
  CheckCircle2,
  Mic,
  Sliders,
  FileText,
  Award,
  ShieldCheck,
  Bot,
  Keyboard,
  ExternalLink,
  Eye,
  Search,
  Wrench,
  PhoneCall,
  Zap
} from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function HomePage() {
  const [demoTextSize, setDemoTextSize] = useState("normal"); // normal, large, xlarge
  const [demoHighContrast, setDemoHighContrast] = useState(false);

  const getTextSizeClass = () => {
    if (demoTextSize === "large") return "text-xl sm:text-2xl";
    if (demoTextSize === "xlarge") return "text-2xl sm:text-3xl";
    return "text-base sm:text-lg";
  };

  return (
    <div className={`flex flex-col w-full bg-[#FBFBEF] text-[#18191D] ${demoHighContrast ? "contrast-125" : ""}`}>

      {/* ========================================================= */}
      {/* 1. HERO COVER (Matches Slide 1 in Reference Image 1)       */}
      {/* ========================================================= */}
      <section className="relative overflow-hidden pt-8 pb-16 sm:pt-12 sm:pb-24 border-b border-[#E5E5D5]" aria-label="Hero Introduction">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* Top Metadata Row */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
            <div>
              <h1 className="text-6xl sm:text-8xl lg:text-9xl font-black tracking-tighter text-[#18191D] leading-none uppercase font-display">
                PRAYAS
              </h1>
              <p className="mt-2 text-xs sm:text-sm font-black tracking-widest uppercase text-[#646672]">
                EMPOWERING CANDIDATES THROUGH ACCESSIBLE AI & VOICE
              </p>
            </div>

            <div className="text-left sm:text-right">
              <span className="block text-2xl sm:text-3xl font-black tracking-tighter text-[#18191D] uppercase font-display">
                ASSISTIVE COPILOT
              </span>
              <span className="block text-xs sm:text-sm font-bold tracking-widest text-[#2F9BE0] uppercase">
                MAKING EVERY JOB APPLICATION ACCESSIBLE
              </span>
            </div>
          </div>

          {/* Central Blue Folder Graphic from Image 1 */}
          <div className="relative mt-4 mx-auto max-w-4xl">
            
            {/* Blue Folder Container */}
            <div className="relative rounded-3xl bg-[#2F9BE0] p-6 sm:p-12 text-white shadow-xl min-h-[380px] sm:min-h-[440px] flex flex-col justify-between overflow-visible">
              
              {/* Folder Handle Tab at Top */}
              <div className="absolute -top-7 left-12 w-48 sm:w-64 h-8 bg-[#2F9BE0] rounded-t-2xl border-t-2 border-x-2 border-[#1F5FBF]/30 flex items-center justify-center">
                <span className="text-[11px] font-black uppercase tracking-widest text-white/90">
                  ASSISTIVE FOLDER
                </span>
              </div>

              {/* Tilted Floating Dark Charcoal Card: Top Left */}
              <div className="self-start tilted-charcoal-card p-4 sm:p-5 w-64 sm:w-72 -rotate-3 hover:rotate-0 transition-transform cursor-default z-10">
                <div className="flex items-center justify-between text-xs font-black uppercase tracking-wider text-slate-300 mb-3 border-b border-white/10 pb-2">
                  <span>2026 Edition</span>
                  <Sparkles className="h-4 w-4 text-[#2F9BE0]" />
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-200">
                  <span className="bg-white/10 px-2 py-1 rounded font-mono">@ PRAYAS.AI</span>
                  <span className="inline-flex items-center gap-1 font-semibold text-[#2F9BE0]">
                    <Check className="h-3.5 w-3.5" /> Ready
                  </span>
                </div>
              </div>

              {/* Center Folder Headline */}
              <div className="my-6 max-w-xl z-0">
                <span className="inline-block px-3 py-1 rounded-full bg-white/20 text-white font-bold text-xs uppercase tracking-wider mb-3">
                  Problem Statement PS003 • Team ByteShastra
                </span>
                <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight font-display">
                  Apply to any job portal with complete autonomy, speech interaction, and zero barriers.
                </h2>
              </div>

              {/* Tilted Floating Dark Charcoal Card: Bottom Right */}
              <div className="self-end tilted-charcoal-card p-5 sm:p-6 w-72 sm:w-80 rotate-2 hover:rotate-0 transition-transform cursor-default z-10">
                <div className="flex items-center justify-between font-black text-sm text-white mb-3">
                  <span>Assistant Capabilities</span>
                  <span className="h-5 w-5 rounded-full bg-[#2F9BE0] text-white flex items-center justify-center text-xs font-bold">
                    ✓
                  </span>
                </div>
                <ul className="space-y-2 text-xs text-slate-300 font-medium">
                  <li className="flex items-center gap-2">
                    <span className="text-[#2F9BE0]">▸</span> Accessibility Passport Profile
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-[#2F9BE0]">▸</span> Natural Voice Call (Field-by-Field)
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-[#2F9BE0]">▸</span> Non-Destructive Safe ARIA Repairs
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-[#2F9BE0]">▸</span> Evidence-Grounded Gemini RAG Drafts
                  </li>
                </ul>
              </div>

            </div>

            {/* Quick Action Navigation Bar directly below Folder */}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <Link href="/passport">
                <Button
                  size="lg"
                  className="bg-[#18191D] hover:bg-black text-white font-black text-base px-7 py-3 rounded-2xl shadow-lg border-2 border-[#18191D]"
                  rightIcon={<ArrowRight className="h-5 w-5" />}
                >
                  Create Accessibility Passport
                </Button>
              </Link>
              <Link href="/demo">
                <Button
                  size="lg"
                  variant="outline"
                  className="bg-white hover:bg-[#F3F3E3] text-[#18191D] font-black text-base px-7 py-3 rounded-2xl border-2 border-[#18191D] shadow-sm"
                >
                  Launch Controlled Testbed
                </Button>
              </Link>
              <Link href="/assistant">
                <Button
                  size="lg"
                  className="bg-[#2F9BE0] hover:bg-[#1F5FBF] text-white font-black text-base px-7 py-3 rounded-2xl shadow-md border-0"
                  leftIcon={<Mic className="h-5 w-5" />}
                >
                  Try AI Voice Assistant
                </Button>
              </Link>
            </div>

          </div>

        </div>
      </section>

      {/* ========================================================= */}
      {/* 2. INTRODUCTION SLIDE (Matches Slide 2 in Reference)      */}
      {/* ========================================================= */}
      <section className="py-16 sm:py-24 border-b border-[#E5E5D5]" aria-labelledby="intro-heading">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* Header strip */}
          <div className="portfolio-header-strip mb-6">
            <span>PRAYAS 3.0</span>
            <span>MEMBER 1 & MEMBER 3 COGNITIVE SYSTEM</span>
            <span>2026</span>
          </div>

          {/* Folder Tab Section Header */}
          <div className="flex flex-wrap items-end gap-1 mb-0">
            <div className="folder-tab-header bg-[#1F5FBF] text-white">
              <span>MY EXPERTISE</span>
              <span>→</span>
            </div>
            <div className="folder-tab-header bg-[#2F9BE0] text-white">
              <span>MY SERVICES</span>
            </div>
          </div>

          {/* Blue Introduction Container Card */}
          <div className="bg-[#2F9BE0] rounded-b-3xl rounded-tr-3xl p-6 sm:p-12 text-white shadow-lg">
            
            <div className="inline-block bg-white/20 px-3 py-1 rounded-md text-xs font-bold uppercase tracking-wider mb-6">
              INTRODUCTION →
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              
              {/* Browser Window Frame with 3 Dots (Avatar / Demo Preview) */}
              <div className="lg:col-span-4">
                <div className="browser-window-frame max-w-sm mx-auto shadow-2xl">
                  <div className="browser-window-header">
                    <div className="browser-window-dot bg-rose-400" />
                    <div className="browser-window-dot bg-amber-400" />
                    <div className="browser-window-dot bg-emerald-400" />
                    <span className="text-[10px] font-bold text-slate-500 uppercase ml-2">Olivia Voice Copilot</span>
                  </div>
                  <div className="p-6 bg-[#FBFBEF] flex flex-col items-center text-center">
                    <div className="relative">
                      <img
                        src="/images/olivia.png"
                        alt="Olivia AI Voice Assistant Avatar"
                        className="w-36 h-36 rounded-full object-cover border-4 border-[#2F9BE0] shadow-md"
                      />
                      <span className="absolute bottom-1 right-2 bg-emerald-500 border-2 border-white w-4 h-4 rounded-full" title="Voice Active" />
                    </div>
                    <span className="mt-3 font-display font-black text-lg text-[#18191D]">
                      Olivia • Voice Assistant
                    </span>
                    <span className="text-xs font-semibold text-[#1F5FBF]">
                      Ready to guide your application
                    </span>
                  </div>
                </div>
              </div>

              {/* Description Block */}
              <div className="lg:col-span-8 space-y-6">
                <div className="inline-flex items-center gap-2 bg-white text-[#18191D] px-5 py-2 rounded-full font-black text-sm shadow-sm font-display">
                  <span>Hi! I&apos;m PRAYAS</span>
                  <span className="text-xs bg-[#2F9BE0] text-white px-2 py-0.5 rounded-full font-sans font-bold">About Me</span>
                </div>

                <h3 id="intro-heading" className="text-3xl sm:text-5xl font-black tracking-tight leading-tight font-display text-white">
                  Bridging the accessibility gap across ATS portals with empathy, voice, and intelligent DOM repair.
                </h3>

                <p className="text-base sm:text-lg text-white/95 leading-relaxed font-normal">
                  Traditional job platforms (Workday, Taleo, Greenhouse) break screen readers and keyboard flows with missing labels, irregular tabindexes, and open-ended essay fatigue. PRAYAS injects an intelligent assistive layer: a portable <strong>Accessibility Passport</strong>, natural <strong>Voice Call assistance</strong>, and <strong>Gemini RAG drafting</strong> grounded in your verified documents.
                </p>

                <div className="flex flex-wrap gap-3 pt-2">
                  <span className="bg-white/20 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold">
                    WCAG 2.2 AA Focus
                  </span>
                  <span className="bg-white/20 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold">
                    Zero Auto-Submissions
                  </span>
                  <span className="bg-white/20 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold">
                    Consent-Gated Autofill
                  </span>
                </div>
              </div>

            </div>

          </div>

        </div>
      </section>

      {/* ========================================================= */}
      {/* 3. APPROACH / STRATEGY SLIDE (Matches Slide 3 in Reference)*/}
      {/* ========================================================= */}
      <section className="py-16 sm:py-24 border-b border-[#E5E5D5]" aria-labelledby="strategy-heading">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="portfolio-header-strip mb-6">
            <span>PRAYAS 3.0</span>
            <span>CORE PHILOSOPHY & WORKSTREAM ALIGNMENT</span>
            <span>2026</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            
            {/* Huge Display Headline: "Strategy first, content second." */}
            <div className="lg:col-span-7">
              <h2 id="strategy-heading" className="text-5xl sm:text-7xl lg:text-8xl font-black text-[#1F5FBF] tracking-tighter leading-[0.95] uppercase font-display">
                Strategy first, accessibility second.
              </h2>
              <p className="mt-8 text-base sm:text-lg text-[#4B4D56] max-w-xl leading-relaxed">
                Our approach ensures that every job application interface respects candidate assistive preferences without altering core employer form behaviors or risking compliance violations.
              </p>
            </div>

            {/* Right Side: Cream List Card with 3 Checkpoint Items */}
            <div className="lg:col-span-5">
              <div className="bg-[#F0F0DE] border-2 border-[#E0E0CE] rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm">
                
                <div className="flex items-start gap-4">
                  <div className="h-7 w-7 rounded-full bg-[#18191D] text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    1
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-[#18191D]">Understand candidate preferences</h3>
                    <p className="text-xs text-[#4B4D56] mt-1 leading-relaxed">
                      Store font sizes, high-contrast, screen reader speed, and voice preferences in your portable Accessibility Passport.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="h-7 w-7 rounded-full bg-[#18191D] text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    2
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-[#18191D]">Ensure non-destructive repair</h3>
                    <p className="text-xs text-[#4B4D56] mt-1 leading-relaxed">
                      Inject compliant ARIA attributes, compute accessible names, and restore logical keyboard tab sequences automatically.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="h-7 w-7 rounded-full bg-[#18191D] text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    3
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-[#18191D]">Ground every AI draft in truth</h3>
                    <p className="text-xs text-[#4B4D56] mt-1 leading-relaxed">
                      Rely on private resume vector search (pgvector + Gemini) to answer behavioral questions without hallucination.
                    </p>
                  </div>
                </div>

                <div className="pt-4 border-t border-[#E0E0CE] text-right">
                  <span className="text-xs font-black uppercase tracking-widest text-[#18191D] font-display">
                    My Approach • 4 Workstreams
                  </span>
                </div>

              </div>
            </div>

          </div>

        </div>
      </section>

      {/* ========================================================= */}
      {/* 4. RESULT & GROWTH SLIDE (Matches Slide 4 in Reference)    */}
      {/* ========================================================= */}
      <section className="py-16 sm:py-24 border-b border-[#E5E5D5]" aria-labelledby="results-heading">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="portfolio-header-strip mb-8">
            <span>PRAYAS 3.0</span>
            <span>MEASURABLE ACCESSIBILITY IMPACT</span>
            <span>2026</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            
            {/* Left Headline */}
            <div className="lg:col-span-5">
              <h2 id="results-heading" className="text-5xl sm:text-7xl font-black text-[#1F5FBF] tracking-tighter leading-none uppercase font-display">
                Result &amp; Growth
              </h2>
              <p className="mt-4 text-sm text-[#4B4D56] leading-relaxed max-w-sm">
                Consistent keyboard navigation and voice-assisted form filling dramatically improve candidate completion speed and autonomy.
              </p>
            </div>

            {/* Circular Stat Badges & Tilted Charcoal Card */}
            <div className="lg:col-span-7 flex flex-wrap items-center justify-around gap-6">
              
              {/* Badge 1 */}
              <div className="circular-stat-badge w-36 h-36 sm:w-44 sm:h-44 p-4">
                <span className="text-3xl sm:text-5xl font-black text-[#18191D] font-display tracking-tight">
                  +120%
                </span>
                <span className="text-[11px] sm:text-xs font-bold text-[#4B4D56] uppercase tracking-wider mt-1">
                  Remediation Rate
                </span>
              </div>

              {/* Badge 2 */}
              <div className="circular-stat-badge w-36 h-36 sm:w-44 sm:h-44 p-4">
                <span className="text-3xl sm:text-5xl font-black text-[#18191D] font-display tracking-tight">
                  +80%
                </span>
                <span className="text-[11px] sm:text-xs font-bold text-[#4B4D56] uppercase tracking-wider mt-1">
                  Speed Increase
                </span>
              </div>

              {/* Badge 3 */}
              <div className="circular-stat-badge w-36 h-36 sm:w-44 sm:h-44 p-4">
                <span className="text-3xl sm:text-5xl font-black text-[#18191D] font-display tracking-tight">
                  60%
                </span>
                <span className="text-[11px] sm:text-xs font-bold text-[#4B4D56] uppercase tracking-wider mt-1">
                  Friction Reduction
                </span>
              </div>

              {/* Tilted Dark Charcoal Card for Key Metrics */}
              <div className="tilted-charcoal-card p-5 sm:p-6 w-full sm:w-80 -rotate-2 hover:rotate-0 transition-transform">
                <div className="flex items-center justify-between text-xs font-black uppercase text-white mb-3 border-b border-white/10 pb-2">
                  <span>Key Metrics</span>
                  <span className="text-[#2F9BE0] font-bold">✓ Verified</span>
                </div>
                <ul className="space-y-1.5 text-xs text-slate-300">
                  <li className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#2F9BE0]" />
                    <span>225/225 Backend Unit Tests Passing</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#2F9BE0]" />
                    <span>7 Extension Remediation Suites</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#2F9BE0]" />
                    <span>25/25 Voice E2E Tests Verified</span>
                  </li>
                </ul>
              </div>

            </div>

          </div>

        </div>
      </section>

      {/* ========================================================= */}
      {/* 5. WORK PROCESS / PLATFORMS (Matches Slide 5 in Reference) */}
      {/* ========================================================= */}
      <section className="py-16 sm:py-24 border-b border-[#E5E5D5]" aria-labelledby="process-heading">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="portfolio-header-strip mb-6">
            <span>PRAYAS 3.0</span>
            <span>END-TO-END WORKSTREAM PIPELINE</span>
            <span>2026</span>
          </div>

          {/* Folder Tab Header */}
          <div className="flex flex-wrap items-end gap-1 mb-0">
            <div className="folder-tab-header bg-[#1F5FBF] text-white">
              <span>WORK PROCESS</span>
              <span>→</span>
            </div>
            <div className="folder-tab-header bg-[#2F9BE0] text-white">
              <span>PLATFORM TYPE</span>
            </div>
          </div>

          {/* Work Process Banner */}
          <div className="bg-[#2F9BE0] rounded-b-3xl rounded-tr-3xl p-6 sm:p-10 text-white shadow-lg space-y-8">
            
            {/* Row of 4 Browser Frames showcasing ATS compatibility */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              
              <div className="browser-window-frame">
                <div className="browser-window-header">
                  <div className="browser-window-dot bg-rose-400" />
                  <div className="browser-window-dot bg-amber-400" />
                  <div className="browser-window-dot bg-emerald-400" />
                  <span className="text-[10px] font-bold text-slate-500 uppercase ml-2">Workday ATS</span>
                </div>
                <div className="p-4 bg-white text-[#18191D] text-xs">
                  <strong className="block text-sm font-bold text-[#1F5FBF]">Unlabeled Fields</strong>
                  <p className="text-slate-600 mt-1">Automatic 4-tier label resolution and high-contrast inputs.</p>
                </div>
              </div>

              <div className="browser-window-frame">
                <div className="browser-window-header">
                  <div className="browser-window-dot bg-rose-400" />
                  <div className="browser-window-dot bg-amber-400" />
                  <div className="browser-window-dot bg-emerald-400" />
                  <span className="text-[10px] font-bold text-slate-500 uppercase ml-2">Greenhouse</span>
                </div>
                <div className="p-4 bg-white text-[#18191D] text-xs">
                  <strong className="block text-sm font-bold text-[#1F5FBF]">Complex Dropdowns</strong>
                  <p className="text-slate-600 mt-1">Voice-enabled selection for select, radio, and checkboxes.</p>
                </div>
              </div>

              <div className="browser-window-frame">
                <div className="browser-window-header">
                  <div className="browser-window-dot bg-rose-400" />
                  <div className="browser-window-dot bg-amber-400" />
                  <div className="browser-window-dot bg-emerald-400" />
                  <span className="text-[10px] font-bold text-slate-500 uppercase ml-2">Taleo Oracle</span>
                </div>
                <div className="p-4 bg-white text-[#18191D] text-xs">
                  <strong className="block text-sm font-bold text-[#1F5FBF]">Broken Tabindex</strong>
                  <p className="text-slate-600 mt-1">Restores sequential keyboard order without page refresh.</p>
                </div>
              </div>

              <div className="browser-window-frame">
                <div className="browser-window-header">
                  <div className="browser-window-dot bg-rose-400" />
                  <div className="browser-window-dot bg-amber-400" />
                  <div className="browser-window-dot bg-emerald-400" />
                  <span className="text-[10px] font-bold text-slate-500 uppercase ml-2">Custom ATS</span>
                </div>
                <div className="p-4 bg-white text-[#18191D] text-xs">
                  <strong className="block text-sm font-bold text-[#1F5FBF]">Essay Prompts</strong>
                  <p className="text-slate-600 mt-1">Grounded RAG answers from candidate resume documents.</p>
                </div>
              </div>

            </div>

            {/* Row of 4 Circular Process Steps */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 pt-4 border-t border-white/20 text-center">
              
              <div className="flex flex-col items-center">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-white text-[#1F5FBF] flex items-center justify-center font-black text-xl mb-3 shadow-md">
                  <Search className="h-7 w-7" />
                </div>
                <span className="font-display font-black text-base uppercase tracking-tight">1. Detect</span>
                <span className="text-xs text-white/80 mt-1">Inspect form fields &amp; barriers</span>
              </div>

              <div className="flex flex-col items-center">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-white text-[#1F5FBF] flex items-center justify-center font-black text-xl mb-3 shadow-md">
                  <Wrench className="h-7 w-7" />
                </div>
                <span className="font-display font-black text-base uppercase tracking-tight">2. Repair</span>
                <span className="text-xs text-white/80 mt-1">Non-destructive safe ARIA fixes</span>
              </div>

              <div className="flex flex-col items-center">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-white text-[#1F5FBF] flex items-center justify-center font-black text-xl mb-3 shadow-md">
                  <PhoneCall className="h-7 w-7" />
                </div>
                <span className="font-display font-black text-base uppercase tracking-tight">3. Voice Call</span>
                <span className="text-xs text-white/80 mt-1">Natural conversational assistant</span>
              </div>

              <div className="flex flex-col items-center">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-white text-[#1F5FBF] flex items-center justify-center font-black text-xl mb-3 shadow-md">
                  <Zap className="h-7 w-7" />
                </div>
                <span className="font-display font-black text-base uppercase tracking-tight">4. Fill &amp; Draft</span>
                <span className="text-xs text-white/80 mt-1">Consent-gated profile autofill</span>
              </div>

            </div>

          </div>

        </div>
      </section>

      {/* ========================================================= */}
      {/* 6. INTERACTIVE ACCESSIBILITY TOOLBAR (Preserved Feature)  */}
      {/* ========================================================= */}
      <section className="py-14 bg-[#18191D] text-white" aria-labelledby="live-preview-heading">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
            <div className="max-w-xl">
              <span className="text-[#2F9BE0] font-black uppercase tracking-wider text-xs font-display">
                Live Assistive Customizer
              </span>
              <h2 id="live-preview-heading" className="text-2xl sm:text-3xl font-extrabold mt-2 font-display">
                Experience Dynamic Assistive Styling
              </h2>
              <p className="text-slate-300 mt-2 text-sm leading-relaxed">
                Test how PRAYAS dynamically scales typography and enhances contrast levels for low-vision and cognitive clarity.
              </p>
            </div>

            {/* Interactive Controls */}
            <div className="bg-[#1E1F24] border border-[#2C2D35] p-5 rounded-2xl flex flex-wrap items-center gap-4">
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-bold text-slate-300">Text Scaling</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setDemoTextSize("normal")}
                    className={`px-3.5 py-1.5 text-xs font-bold rounded-xl border min-h-[38px] ${
                      demoTextSize === "normal"
                        ? "bg-[#2F9BE0] text-white border-[#2F9BE0]"
                        : "bg-[#2C2D35] text-slate-300 border-transparent hover:bg-slate-700"
                    }`}
                  >
                    Regular (A)
                  </button>
                  <button
                    type="button"
                    onClick={() => setDemoTextSize("large")}
                    className={`px-3.5 py-1.5 text-sm font-bold rounded-xl border min-h-[38px] ${
                      demoTextSize === "large"
                        ? "bg-[#2F9BE0] text-white border-[#2F9BE0]"
                        : "bg-[#2C2D35] text-slate-300 border-transparent hover:bg-slate-700"
                    }`}
                  >
                    Large (A+)
                  </button>
                  <button
                    type="button"
                    onClick={() => setDemoTextSize("xlarge")}
                    className={`px-3.5 py-1.5 text-base font-bold rounded-xl border min-h-[38px] ${
                      demoTextSize === "xlarge"
                        ? "bg-[#2F9BE0] text-white border-[#2F9BE0]"
                        : "bg-[#2C2D35] text-slate-300 border-transparent hover:bg-slate-700"
                    }`}
                  >
                    Extra (A++)
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-bold text-slate-300">High Contrast Mode</span>
                <button
                  type="button"
                  onClick={() => setDemoHighContrast(!demoHighContrast)}
                  className={`px-4 py-1.5 text-xs font-bold rounded-xl border min-h-[38px] flex items-center gap-2 ${
                    demoHighContrast
                      ? "bg-amber-400 text-slate-950 border-amber-300"
                      : "bg-[#2C2D35] text-slate-300 border-transparent hover:bg-slate-700"
                  }`}
                  aria-pressed={demoHighContrast}
                >
                  <Eye className="h-4 w-4" />
                  {demoHighContrast ? "High Contrast ON" : "Standard Contrast"}
                </button>
              </div>
            </div>
          </div>

          {/* Sample Rendered Card */}
          <div
            className={`mt-8 p-6 rounded-2xl border transition-all ${
              demoHighContrast
                ? "bg-black text-amber-300 border-4 border-amber-400"
                : "bg-[#FBFBEF] text-[#18191D] border-[#E5E5D5]"
            }`}
          >
            <p className={`font-black font-display ${getTextSizeClass()}`}>
              Live Sample Application Prompt:
            </p>
            <p className={`mt-2 ${getTextSizeClass()} leading-relaxed opacity-95`}>
              &quot;Describe a situation where you had to adapt your work environment to overcome a complex technical obstacle.&quot;
            </p>
            <div className="mt-4 flex gap-3">
              <span className="inline-block px-3 py-1 rounded-lg bg-[#1F5FBF] text-white font-bold text-xs font-sans">
                Voice Readout: Alt+R
              </span>
              <span className="inline-block px-3 py-1 rounded-lg bg-[#2F9BE0] text-white font-bold text-xs font-sans">
                AI Draft: Alt+H
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* 7. CONTACT / CTA SLIDE (Matches Slide 6 in Reference)     */}
      {/* ========================================================= */}
      <section className="py-16 sm:py-28" aria-labelledby="cta-heading">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="portfolio-header-strip mb-8">
            <span>PRAYAS 3.0</span>
            <span>GET IN TOUCH &amp; START APPLYING</span>
            <span>2026</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            
            {/* Huge Display Headline: "Work with Me!" */}
            <div className="lg:col-span-7">
              <h2 id="cta-heading" className="text-6xl sm:text-8xl lg:text-9xl font-black text-[#1F5FBF] tracking-tighter leading-[0.9] uppercase font-display">
                Work with Us!
              </h2>
              <p className="mt-8 text-xs sm:text-sm font-black tracking-widest uppercase text-[#4B4D56] max-w-lg">
                WE&apos;D LOVE TO HELP YOU LAND YOUR NEXT CAREER OPPORTUNITY THROUGH ACCESSIBLE AI AND COMPLETE VOICE CONTROL.
              </p>
            </div>

            {/* Dark Charcoal Tilted Contact Card */}
            <div className="lg:col-span-5 flex justify-center lg:justify-end">
              <div className="tilted-charcoal-card p-8 w-full max-w-md rotate-2 hover:rotate-0 transition-transform">
                
                <div className="flex items-center justify-between text-sm font-black uppercase text-white mb-6 border-b border-white/10 pb-3">
                  <span>GET STARTED NOW</span>
                  <span className="h-6 w-6 rounded-full bg-[#2F9BE0] text-white flex items-center justify-center text-xs font-black">
                    ✓
                  </span>
                </div>

                <div className="space-y-4">
                  <Link href="/passport" className="block">
                    <div className="p-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-colors flex items-center justify-between">
                      <div>
                        <strong className="block text-sm font-bold text-white">Create Passport</strong>
                        <span className="text-xs text-slate-400">Save assistive preferences once</span>
                      </div>
                      <ArrowRight className="h-4 w-4 text-[#2F9BE0]" />
                    </div>
                  </Link>

                  <Link href="/documents" className="block">
                    <div className="p-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-colors flex items-center justify-between">
                      <div>
                        <strong className="block text-sm font-bold text-white">Upload Documents</strong>
                        <span className="text-xs text-slate-400">Index resume for Gemini RAG</span>
                      </div>
                      <ArrowRight className="h-4 w-4 text-[#2F9BE0]" />
                    </div>
                  </Link>

                  <Link href="/demo" className="block">
                    <div className="p-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-colors flex items-center justify-between">
                      <div>
                        <strong className="block text-sm font-bold text-white">Test Barrier Portal</strong>
                        <span className="text-xs text-slate-400">Try live voice call &amp; ARIA repairs</span>
                      </div>
                      <ArrowRight className="h-4 w-4 text-[#2F9BE0]" />
                    </div>
                  </Link>
                </div>

                <div className="mt-8 pt-4 border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
                  <span>PRAYAS 3.0 • Team ByteShastra</span>
                  <span className="text-[#2F9BE0] font-bold">Hackathon Ready</span>
                </div>

              </div>
            </div>

          </div>

        </div>
      </section>

    </div>
  );
}
