"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { getPassport } from "@/lib/passportStorage";
import { getDocuments } from "@/lib/documentService";
import { getScorecardReports } from "@/lib/scorecardService";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
  Sliders,
  FileText,
  ShieldCheck,
  Zap,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  FileUp,
  User,
  Sparkles,
  ExternalLink,
  Mic,
  Keyboard,
  Clock,
  RefreshCw,
  FolderOpen
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
          <RefreshCw className="h-8 w-8 animate-spin text-teal-600" />
          <p className="text-sm font-semibold text-slate-700">Loading your applicant overview...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* 1. WELCOME HERO BANNER */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-teal-950 rounded-2xl p-6 sm:p-8 text-white shadow-md">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="max-w-2xl space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="teal" className="bg-teal-800 text-teal-100 border-teal-600 font-bold">
                PRAYAS Applicant Hub
              </Badge>
              <span className="text-xs text-slate-300">
                Session: <strong>{user?.email || "Guest Demo"}</strong>
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Welcome back, {passport?.fullName || user?.user_metadata?.full_name || "Applicant"}!
            </h1>
            <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
              Your portable Accessibility Passport and AI Document knowledge base are active. When you open any employer job application, PRAYAS assists you in real-time.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            <Link href="/passport">
              <Button variant="secondary" size="md" className="w-full sm:w-auto font-bold bg-teal-600 hover:bg-teal-500">
                Manage Passport
              </Button>
            </Link>
            <Link href="/documents">
              <Button variant="outline" size="md" className="w-full sm:w-auto font-bold bg-white/10 hover:bg-white/20 text-white border-white/30">
                Upload New Resume
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* 2. STATS & STATUS METRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Passport Status */}
        <Card className="border-slate-200">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Passport Status</span>
            <div className="h-8 w-8 rounded-lg bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700">
              <Sliders className="h-4 w-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">
              {isPassportConfigured ? "100% Ready" : "Incomplete"}
            </span>
          </div>
          <p className="text-xs text-slate-600 mt-1 flex items-center gap-1">
            <CheckCircle2 className="h-3.5 w-3.5 text-teal-600" />
            <span>{activeAccommodationsCount} active accommodations</span>
          </p>
        </Card>

        {/* Metric 2: RAG Documents */}
        <Card className="border-slate-200">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Indexed Documents</span>
            <div className="h-8 w-8 rounded-lg bg-slate-100 border border-slate-300 flex items-center justify-center text-slate-800">
              <FileText className="h-4 w-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">{documents.length}</span>
            <span className="text-xs text-slate-500 font-medium">Files</span>
          </div>
          <p className="text-xs text-slate-600 mt-1 flex items-center gap-1">
            <Sparkles className="h-3.5 w-3.5 text-teal-600" />
            <span>RAG Context Active</span>
          </p>
        </Card>

        {/* Metric 3: Remediation Fixes */}
        <Card className="border-slate-200">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Auto-Remediated Fixes</span>
            <div className="h-8 w-8 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
              <ShieldCheck className="h-4 w-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">{totalRemediated}</span>
            <span className="text-xs text-slate-500 font-medium">of {totalAuditedIssues} issues</span>
          </div>
          <p className="text-xs text-emerald-700 font-semibold mt-1 flex items-center gap-1">
            <span>92% Auto-Fix Success Rate</span>
          </p>
        </Card>

        {/* Metric 4: Extension Sync */}
        <Card className="border-slate-200">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Chrome Companion</span>
            <div className="h-8 w-8 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700">
              <Zap className="h-4 w-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">Sync Active</span>
          </div>
          <p className="text-xs text-slate-600 mt-1 flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-teal-500 animate-pulse"></span>
            <span>Listening on Career Portals</span>
          </p>
        </Card>
      </div>

      {/* 3. MAIN DASHBOARD CONTENT (2 COLUMNS) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFT 2 COLS: Recent Reports & Uploaded Documents */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Section A: Recent Accessibility Reports */}
          <Card className="border-slate-200">
            <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-teal-700" />
                  <span>Recent Accessibility Audits</span>
                </CardTitle>
                <CardDescription>
                  Live scans conducted across employer job portals during your application sessions.
                </CardDescription>
              </div>
              <Link href="/scorecard">
                <Button variant="ghost" size="sm" className="text-xs font-bold text-teal-700 hover:text-teal-900">
                  View Full Scorecard &rarr;
                </Button>
              </Link>
            </CardHeader>

            <CardContent className="p-0 divide-y divide-slate-100">
              {reports.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-sm">
                  No audits recorded yet. Open a career site with the PRAYAS extension to view live reports.
                </div>
              ) : (
                reports.slice(0, 3).map((report) => (
                  <div key={report.id} className="p-5 hover:bg-slate-50/70 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-slate-900 text-base">{report.portalName}</h4>
                        <Badge variant="teal" className="text-[10px]">
                          Score: {report.overallScore}/100
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-500 truncate max-w-md">{report.url}</p>
                      <div className="flex items-center gap-3 text-xs text-slate-600 pt-1">
                        <span className="flex items-center gap-1 text-emerald-700 font-semibold">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          {report.verifiedImprovementsCount} Fixes Applied
                        </span>
                        {report.unresolvedIssuesCount > 0 && (
                          <span className="flex items-center gap-1 text-amber-700 font-semibold">
                            <AlertTriangle className="h-3.5 w-3.5" />
                            {report.unresolvedIssuesCount} Unresolved
                          </span>
                        )}
                      </div>
                    </div>

                    <Link href="/scorecard">
                      <Button variant="outline" size="sm" className="whitespace-nowrap text-xs font-semibold">
                        Inspect Report
                      </Button>
                    </Link>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Section B: Uploaded Documents Snapshot */}
          <Card className="border-slate-200">
            <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                  <FolderOpen className="h-5 w-5 text-teal-700" />
                  <span>Your Indexed Documents ({documents.length})</span>
                </CardTitle>
                <CardDescription>
                  Documents used by PRAYAS AI to generate personalized answers.
                </CardDescription>
              </div>
              <Link href="/documents">
                <Button variant="ghost" size="sm" className="text-xs font-bold text-teal-700 hover:text-teal-900">
                  Manage Files &rarr;
                </Button>
              </Link>
            </CardHeader>

            <CardContent className="p-5">
              {documents.length === 0 ? (
                <div className="text-center py-8">
                  <FileUp className="h-8 w-8 mx-auto text-slate-400 mb-2" />
                  <p className="text-sm font-semibold text-slate-700">No documents found</p>
                  <p className="text-xs text-slate-500 mt-1 mb-4">Upload your resume to enable one-click AI answers.</p>
                  <Link href="/documents">
                    <Button variant="primary" size="sm" className="bg-slate-900">
                      Upload Resume
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {documents.slice(0, 3).map((doc) => (
                    <div
                      key={doc.id}
                      className="p-3.5 rounded-xl border border-slate-200 bg-white flex items-center justify-between gap-3 hover:border-slate-300 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-9 w-9 rounded-lg bg-slate-900 text-teal-400 flex items-center justify-center shrink-0">
                          <FileText className="h-4 w-4" />
                        </div>
                        <div className="truncate">
                          <p className="text-sm font-bold text-slate-900 truncate">{doc.name}</p>
                          <p className="text-xs text-slate-500">{new Date(doc.uploadedAt).toLocaleDateString()} • {doc.category.replace("_", " ").toUpperCase()}</p>
                        </div>
                      </div>
                      <Badge variant="teal" className="text-[10px] shrink-0">
                        AI Active
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* RIGHT COLUMN: Passport Profile Summary & Extension Status */}
        <div className="space-y-6">
          
          {/* Active Passport Summary Card */}
          <Card className="border-2 border-slate-900 bg-slate-900 text-white shadow-lg">
            <CardHeader className="border-b border-slate-800 pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-teal-600 flex items-center justify-center text-white font-bold text-xs">
                    P3
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-base">Active Passport</h3>
                    <p className="text-[10px] text-teal-400 font-semibold uppercase">Profile Snapshot</p>
                  </div>
                </div>
                <Link href="/passport">
                  <Button variant="outline" size="sm" className="text-xs bg-transparent text-white border-slate-700 hover:bg-slate-800">
                    Edit
                  </Button>
                </Link>
              </div>
            </CardHeader>

            <CardContent className="p-5 space-y-4 text-xs">
              <div>
                <span className="text-slate-400 font-bold uppercase block text-[10px]">Preferred Interaction</span>
                <p className="font-bold text-white text-sm mt-0.5 capitalize">
                  {passport?.preferredMethod?.replace("-", " ") || "Standard Mode"}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800">
                <div>
                  <span className="text-slate-400 font-bold uppercase block text-[10px]">Text Scaling</span>
                  <span className="font-semibold text-teal-300 capitalize">{passport?.textSize || "Normal"}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-bold uppercase block text-[10px]">Contrast Mode</span>
                  <span className="font-semibold text-teal-300 capitalize">{passport?.contrast || "Standard"}</span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800">
                <span className="text-slate-400 font-bold uppercase block text-[10px] mb-1.5">Enabled Features</span>
                <div className="flex flex-wrap gap-1.5">
                  {passport?.voiceAssist && (
                    <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-200">Voice Dictate</span>
                  )}
                  {passport?.keyboardNav && (
                    <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-200">Keyboard Traps Off</span>
                  )}
                  {passport?.simplifiedLanguage && (
                    <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-200">Plain English</span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Extension Guide Box */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-teal-50 to-white border-2 border-teal-200 text-slate-900 shadow-xs space-y-3">
            <div className="flex items-center gap-2 text-teal-900 font-bold text-sm">
              <Zap className="h-4 w-4 text-teal-700" />
              <span>How PRAYAS Works on Job Sites</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              When browsing LinkedIn, Indeed, or Taleo:
            </p>
            <ol className="text-xs text-slate-700 space-y-1.5 list-decimal list-inside font-medium">
              <li>Open any job application page</li>
              <li>PRAYAS automatically injects speech buttons</li>
              <li>Click &quot;AI Fill&quot; to auto-answer based on your resume</li>
              <li>Submit with confidence and zero barriers!</li>
            </ol>
            <div className="pt-2">
              <Link href="/scorecard">
                <Button variant="tealOutline" size="sm" className="w-full text-xs font-bold border-teal-600 text-teal-800">
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
