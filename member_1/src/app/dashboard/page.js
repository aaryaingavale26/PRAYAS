"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { getPassport } from "@/lib/passportStorage";
import { getDocuments } from "@/lib/documentService";
import { getScorecardReports } from "@/lib/scorecardService";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
  Sliders,
  FileText,
  ShieldCheck,
  Zap,
  CheckCircle2,
  AlertTriangle,
  FileUp,
  Sparkles,
  RefreshCw,
  FolderOpen,
  ArrowRight,
  ChevronRight,
  Check
} from "lucide-react";

export default function DashboardOverviewPage() {
  const { user } = useAuth();

  const [passport, setPassport] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  // Load all dashboard dynamic data
  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [passportData, docsData, reportsData] = await Promise.all([
        getPassport(user?.id),
        getDocuments(),
        getScorecardReports(),
      ]);
      setPassport(passportData);
      setDocuments(docsData);
      setReports(reportsData);
    } catch (e) {
      console.error("Failed to load dashboard data", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();

    // Listen to real-time updates from other pages/tabs
    const handlePassportUpdate = (e) => setPassport(e.detail);
    const handleDocsUpdate = (e) => setDocuments(e.detail);
    const handleScorecardUpdate = (e) => setReports(e.detail);

    window.addEventListener("prayas-passport-updated", handlePassportUpdate);
    window.addEventListener("prayas-documents-updated", handleDocsUpdate);
    window.addEventListener("prayas-scorecard-updated", handleScorecardUpdate);

    return () => {
      window.removeEventListener("prayas-passport-updated", handlePassportUpdate);
      window.removeEventListener("prayas-documents-updated", handleDocsUpdate);
      window.removeEventListener("prayas-scorecard-updated", handleScorecardUpdate);
    };
  }, [user]);

  // Derived stats
  const isPassportConfigured = Boolean(passport?.fullName && passport?.email);
  const activeAccommodationsCount = passport
    ? [passport.voiceAssist, passport.keyboardNav, passport.simplifiedLanguage, passport.extendedTime, passport.dyslexicFont].filter(Boolean).length
    : 0;

  const totalAuditedIssues = reports.reduce((acc, r) => acc + (r.detectedIssuesCount || 0), 0);
  const totalRemediated = reports.reduce((acc, r) => acc + (r.verifiedImprovementsCount || 0), 0);

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="h-8 w-8 animate-spin text-[#1F5FBF]" />
          <p className="text-sm font-semibold text-[#18191D]">Loading your applicant overview...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      
      {/* 1. IMAGE 1 FOLDER-TAB SECTION HEADER */}
      <div className="flex items-center justify-between">
        <div className="folder-tab-header">
          <span>APPLICANT OVERVIEW</span>
          <ArrowRight className="h-4 w-4" />
        </div>
        <div className="text-xs font-bold text-[#646672] uppercase tracking-wider">
          PRAYAS ACCESSIBILITY SUITE
        </div>
      </div>

      {/* 2. WELCOME HERO BANNER (Image 1 Charcoal Rounded Card) */}
      <div className="bg-[#18191D] border-2 border-[#2C2D35] rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 relative z-10">
          <div className="max-w-2xl space-y-3">
            <div className="flex items-center gap-2">
              <Badge variant="blue" className="bg-[#2F9BE0] text-white border-[#1F5FBF]">
                Verified Account
              </Badge>
              <span className="text-xs text-[#A0A2AB]">
                Active Profile: <strong className="text-white">{user?.email || "Applicant"}</strong>
              </span>
            </div>
            <h1 className="font-display text-3xl sm:text-4xl font-black tracking-tight text-white">
              Welcome back, {passport?.fullName || user?.user_metadata?.full_name || "Applicant"}!
            </h1>
            <p className="text-[#A0A2AB] text-sm sm:text-base leading-relaxed">
              Your portable Accessibility Passport and AI Document knowledge base are active. When you open any employer job application, PRAYAS assists you in real-time.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            <Link href="/passport">
              <Button variant="secondary" size="md" className="w-full sm:w-auto">
                Manage Passport
              </Button>
            </Link>
            <Link href="/documents">
              <Button variant="outline" size="md" className="w-full sm:w-auto bg-[#25272E] text-white border-[#3F414E] hover:bg-[#32343E]">
                Upload New Resume
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* 3. CIRCULAR GRAY STAT BADGES ROW (Image 1 requirement) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Stat 1: Completeness */}
        <div className="bg-[#FFFFFF] border border-[#E2E2D4] rounded-2xl p-5 flex items-center gap-4 shadow-xs">
          <div className="circular-stat-badge w-16 h-16 shrink-0 bg-[#E8E8DC]">
            <span className="font-display text-lg font-black text-[#18191D]">
              {isPassportConfigured ? "100%" : "60%"}
            </span>
            <span className="text-[9px] font-black text-[#646672] uppercase">READY</span>
          </div>
          <div className="min-w-0">
            <span className="text-xs font-bold uppercase tracking-wider text-[#646672] block">Passport</span>
            <span className="font-display text-sm font-bold text-[#18191D] truncate block">
              {isPassportConfigured ? "Configured" : "Incomplete"}
            </span>
            <span className="text-[11px] text-[#2F9BE0] font-bold block mt-0.5">
              {activeAccommodationsCount} accommodations
            </span>
          </div>
        </div>

        {/* Stat 2: Documents */}
        <div className="bg-[#FFFFFF] border border-[#E2E2D4] rounded-2xl p-5 flex items-center gap-4 shadow-xs">
          <div className="circular-stat-badge w-16 h-16 shrink-0 bg-[#E8E8DC]">
            <span className="font-display text-xl font-black text-[#18191D]">
              {documents.length}
            </span>
            <span className="text-[9px] font-black text-[#646672] uppercase">DOCS</span>
          </div>
          <div className="min-w-0">
            <span className="text-xs font-bold uppercase tracking-wider text-[#646672] block">AI Knowledge</span>
            <span className="font-display text-sm font-bold text-[#18191D] truncate block">
              {documents.length} Indexed
            </span>
            <span className="text-[11px] text-[#065F46] font-bold block mt-0.5">
              RAG Ready
            </span>
          </div>
        </div>

        {/* Stat 3: Auto-Remediations */}
        <div className="bg-[#FFFFFF] border border-[#E2E2D4] rounded-2xl p-5 flex items-center gap-4 shadow-xs">
          <div className="circular-stat-badge w-16 h-16 shrink-0 bg-[#E8E8DC]">
            <span className="font-display text-lg font-black text-[#18191D]">
              {totalRemediated}
            </span>
            <span className="text-[9px] font-black text-[#646672] uppercase">FIXES</span>
          </div>
          <div className="min-w-0">
            <span className="text-xs font-bold uppercase tracking-wider text-[#646672] block">Audit Engine</span>
            <span className="font-display text-sm font-bold text-[#18191D] truncate block">
              {totalAuditedIssues} Detected
            </span>
            <span className="text-[11px] text-[#065F46] font-bold block mt-0.5">
              WCAG 2.2 Repaired
            </span>
          </div>
        </div>

        {/* Stat 4: Extension Companion */}
        <div className="bg-[#FFFFFF] border border-[#E2E2D4] rounded-2xl p-5 flex items-center gap-4 shadow-xs">
          <div className="circular-stat-badge w-16 h-16 shrink-0 bg-[#E8E8DC]">
            <span className="font-display text-lg font-black text-[#2F9BE0]">
              LIVE
            </span>
            <span className="text-[9px] font-black text-[#646672] uppercase">SYNC</span>
          </div>
          <div className="min-w-0">
            <span className="text-xs font-bold uppercase tracking-wider text-[#646672] block">Companion</span>
            <span className="font-display text-sm font-bold text-[#18191D] truncate block">
              Chrome Ext
            </span>
            <span className="text-[11px] text-[#2F9BE0] font-bold block mt-0.5">
              Connected
            </span>
          </div>
        </div>
      </div>

      {/* 4. MAIN CONTENT GRID (2 COLUMNS) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFT 2 COLS: Audits & Documents */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Section A: Recent Audits */}
          <div className="browser-window-frame">
            <div className="browser-window-header justify-between">
              <div className="flex items-center gap-2">
                <span className="browser-window-dot bg-[#FF5F56]"></span>
                <span className="browser-window-dot bg-[#FFBD2E]"></span>
                <span className="browser-window-dot bg-[#27C93F]"></span>
                <span className="text-xs font-bold text-[#646672] ml-2">Recent Accessibility Audits</span>
              </div>
              <Link href="/scorecard" className="text-xs font-bold text-[#1F5FBF] hover:underline">
                Full Scorecard &rarr;
              </Link>
            </div>

            <div className="p-6">
              {reports.length === 0 ? (
                <div className="py-8 text-center text-[#646672] text-sm">
                  No audits recorded yet. Open a career site with the PRAYAS extension to view live reports.
                </div>
              ) : (
                <div className="divide-y divide-[#E2E2D4]">
                  {reports.slice(0, 3).map((report) => (
                    <div key={report.id} className="py-4 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-[#18191D] text-base">{report.portalName}</h4>
                          <Badge variant="blue" className="text-[10px]">
                            Score: {report.overallScore}/100
                          </Badge>
                        </div>
                        <p className="text-xs text-[#646672] truncate max-w-md">{report.url}</p>
                        <div className="flex items-center gap-3 text-xs text-[#4B4D56] pt-1">
                          <span className="flex items-center gap-1 text-[#065F46] font-bold">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            {report.verifiedImprovementsCount} Fixes Applied
                          </span>
                          {report.unresolvedIssuesCount > 0 && (
                            <span className="flex items-center gap-1 text-[#92400E] font-bold">
                              <AlertTriangle className="h-3.5 w-3.5" />
                              {report.unresolvedIssuesCount} Unresolved
                            </span>
                          )}
                        </div>
                      </div>

                      <Link href="/scorecard">
                        <Button variant="outline" size="sm" className="whitespace-nowrap text-xs font-bold">
                          Inspect Report
                        </Button>
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Section B: Uploaded Documents in Browser-Window Frame */}
          <div className="browser-window-frame">
            <div className="browser-window-header justify-between">
              <div className="flex items-center gap-2">
                <span className="browser-window-dot bg-[#FF5F56]"></span>
                <span className="browser-window-dot bg-[#FFBD2E]"></span>
                <span className="browser-window-dot bg-[#27C93F]"></span>
                <span className="text-xs font-bold text-[#646672] ml-2">Document Knowledge Hub ({documents.length})</span>
              </div>
              <Link href="/documents" className="text-xs font-bold text-[#1F5FBF] hover:underline">
                Upload &rarr;
              </Link>
            </div>

            <div className="p-6">
              {documents.length === 0 ? (
                <div className="text-center py-8">
                  <FileUp className="h-8 w-8 mx-auto text-[#A0A2AB] mb-2" />
                  <p className="text-sm font-bold text-[#18191D]">No documents found</p>
                  <p className="text-xs text-[#646672] mt-1 mb-4">Upload your resume to enable one-click AI answers.</p>
                  <Link href="/documents">
                    <Button variant="primary" size="sm">
                      Upload Resume
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {documents.slice(0, 3).map((doc) => (
                    <div
                      key={doc.id}
                      className="p-3.5 rounded-xl border border-[#E2E2D4] bg-[#FBFBEF] flex items-center justify-between gap-3 hover:border-[#2F9BE0] transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-9 w-9 rounded-xl bg-[#18191D] text-[#2F9BE0] flex items-center justify-center shrink-0">
                          <FileText className="h-4 w-4" />
                        </div>
                        <div className="truncate">
                          <p className="text-sm font-bold text-[#18191D] truncate">{doc.name}</p>
                          <p className="text-xs text-[#646672]">
                            {new Date(doc.uploadedAt).toLocaleDateString()} • {doc.category?.replace("_", " ").toUpperCase()}
                          </p>
                        </div>
                      </div>
                      <Badge variant="blue" className="text-[10px] shrink-0">
                        AI Active
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Dark Rounded Cards with Checkmarks (Image 1 Requirement) */}
        <div className="space-y-6">
          
          {/* Active Passport Checklist Card */}
          <div className="bg-[#18191D] border-2 border-[#2C2D35] rounded-3xl p-6 text-white shadow-xl">
            <div className="flex items-center justify-between pb-4 border-b border-[#2C2D35] mb-4">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-xl bg-[#2F9BE0] text-white flex items-center justify-center font-black text-xs">
                  P
                </div>
                <div>
                  <h3 className="font-display font-bold text-white text-base">Accessibility Passport</h3>
                  <p className="text-[10px] text-[#2F9BE0] font-bold uppercase tracking-wider">Candidate Profile</p>
                </div>
              </div>
              <Link href="/passport">
                <Button variant="outline" size="sm" className="text-xs bg-[#25272E] text-white border-[#3F414E] hover:bg-[#32343E]">
                  Edit
                </Button>
              </Link>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <span className="text-[#A0A2AB] font-bold uppercase block text-[10px]">Preferred Interaction</span>
                <p className="font-bold text-white text-sm mt-0.5 capitalize">
                  {passport?.preferredMethod?.replace("-", " ") || "Standard Voice/Assist"}
                </p>
              </div>

              {/* Checklist items with checkmarks */}
              <div className="pt-3 border-t border-[#2C2D35] space-y-2.5">
                <span className="text-[#A0A2AB] font-bold uppercase block text-[10px] mb-2">Enabled Accommodations</span>
                
                <div className="flex items-center gap-2.5 text-slate-200">
                  <div className="h-5 w-5 rounded-full bg-[#2F9BE0] flex items-center justify-center text-white shrink-0">
                    <Check className="h-3 w-3 stroke-[3]" />
                  </div>
                  <span className="font-semibold">Voice Dictation &amp; Read-Aloud</span>
                </div>

                <div className="flex items-center gap-2.5 text-slate-200">
                  <div className="h-5 w-5 rounded-full bg-[#2F9BE0] flex items-center justify-center text-white shrink-0">
                    <Check className="h-3 w-3 stroke-[3]" />
                  </div>
                  <span className="font-semibold">Automatic Field Autofill</span>
                </div>

                <div className="flex items-center gap-2.5 text-slate-200">
                  <div className="h-5 w-5 rounded-full bg-[#2F9BE0] flex items-center justify-center text-white shrink-0">
                    <Check className="h-3 w-3 stroke-[3]" />
                  </div>
                  <span className="font-semibold">Gemini RAG Essay Drafting</span>
                </div>

                <div className="flex items-center gap-2.5 text-slate-200">
                  <div className="h-5 w-5 rounded-full bg-[#2F9BE0] flex items-center justify-center text-white shrink-0">
                    <Check className="h-3 w-3 stroke-[3]" />
                  </div>
                  <span className="font-semibold">Lossless WCAG DOM Auto-Fixes</span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Extension Guide Box in Image 1 Cream/Blue styling */}
          <div className="p-6 rounded-3xl bg-[#CEEEFD] border-2 border-[#BAE6FD] text-[#18191D] space-y-3">
            <div className="flex items-center gap-2 font-display font-extrabold text-base text-[#0284C7]">
              <Zap className="h-5 w-5 text-[#0284C7]" />
              <span>How PRAYAS Works on Job Sites</span>
            </div>
            <p className="text-xs text-[#0369A1] leading-relaxed">
              When applying on LinkedIn, Indeed, Taleo, or Greenhouse:
            </p>
            <ol className="text-xs text-[#18191D] space-y-2 list-decimal list-inside font-bold">
              <li>Open any online job application page.</li>
              <li>PRAYAS Companion automatically connects.</li>
              <li>Click <strong>Autofill (Alt+F)</strong> to fill details from profile.</li>
              <li>Use <strong>Voice Call</strong> with Prayas.AI to navigate hands-free.</li>
            </ol>
            <div className="pt-2">
              <Link href="/scorecard">
                <Button variant="primary" size="sm" className="w-full text-xs font-bold">
                  Explore Scorecard Remediations
                </Button>
              </Link>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
