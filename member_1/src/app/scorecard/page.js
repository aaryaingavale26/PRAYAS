"use client";

import React, { useState, useEffect } from "react";
import { getScorecardReports, addScorecardReport } from "@/lib/scorecardService";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import {
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Zap,
  ExternalLink,
  Filter,
  Search,
  Sparkles,
  Download,
  Info,
  Code,
  FileCheck2,
  Send,
  Eye
} from "lucide-react";

export default function ScorecardPage() {
  const [reports, setReports] = useState([]);
  const [selectedReportId, setSelectedReportId] = useState(null);
  const [filterSeverity, setFilterSeverity] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [loading, setLoading] = useState(true);

  // New URL Audit simulator state
  const [auditUrl, setAuditUrl] = useState("");
  const [isAuditing, setIsAuditing] = useState(false);

  // Accommodation letter modal state
  const [selectedUnresolvedIssue, setSelectedUnresolvedIssue] = useState(null);
  const [isLetterModalOpen, setIsLetterModalOpen] = useState(false);

  useEffect(() => {
    async function loadReports() {
      try {
        setLoading(true);
        const data = await getScorecardReports();
        setReports(data);
        if (data.length > 0) {
          setSelectedReportId(data[0].id);
        }
      } catch (err) {
        console.error("Failed to load scorecard reports", err);
      } finally {
        setLoading(false);
      }
    }
    loadReports();
  }, []);

  const activeReport = reports.find((r) => r.id === selectedReportId) || reports[0];

  // Run live simulated audit on a new URL
  const handleRunAudit = (e) => {
    e.preventDefault();
    if (!auditUrl.trim()) return;

    setIsAuditing(true);
    setTimeout(async () => {
      const newReport = {
        id: `rep-${Date.now()}`,
        portalName: auditUrl.replace(/https?:\/\//i, "").split("/")[0] + " Application",
        url: auditUrl.startsWith("http") ? auditUrl : `https://${auditUrl}`,
        auditDate: new Date().toISOString(),
        overallScore: 88,
        wcagLevel: "WCAG 2.2 AA Evaluated",
        detectedIssuesCount: 3,
        verifiedImprovementsCount: 3,
        unresolvedIssuesCount: 0,
        issues: [
          {
            id: `iss-${Date.now()}-1`,
            element: "input#applicant_first_name",
            type: "Missing Explicit <label> Association",
            severity: "High",
            wcagCriterion: "1.3.1 Info and Relationships",
            status: "Auto-Remediated by PRAYAS",
            fixApplied: "Linked <label for='applicant_first_name'> and added aria-required='true'.",
          },
          {
            id: `iss-${Date.now()}-2`,
            element: "button.apply-now-submit",
            type: "Low Visual Contrast against Page Background",
            severity: "Medium",
            wcagCriterion: "1.4.3 Contrast (Minimum)",
            status: "Auto-Remediated by PRAYAS",
            fixApplied: "Applied High Contrast Navy/Teal CSS override (Ratio 9.8:1).",
          },
          {
            id: `iss-${Date.now()}-3`,
            element: "form#job_application_form",
            type: "Missing Skip Navigation Target",
            severity: "Low",
            wcagCriterion: "2.4.1 Bypass Blocks",
            status: "Auto-Remediated by PRAYAS",
            fixApplied: "Injected accessible skip-to-form keyboard shortcut listener (Alt+F).",
          },
        ],
      };

      const updated = await addScorecardReport(newReport);
      setReports(updated);
      setSelectedReportId(newReport.id);
      setIsAuditing(false);
      setAuditUrl("");
    }, 1200);
  };

  // Filter issues in active report
  const filteredIssues = activeReport?.issues?.filter((issue) => {
    if (filterSeverity !== "all" && issue.severity.toLowerCase() !== filterSeverity.toLowerCase()) {
      return false;
    }
    if (filterStatus === "remediated" && !issue.status.includes("Auto-Remediated")) {
      return false;
    }
    if (filterStatus === "unresolved" && !issue.status.includes("Unresolved")) {
      return false;
    }
    return true;
  }) || [];

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-semibold text-slate-700">Loading Accessibility Scorecard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
      {/* 1. HEADER & MISSION */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-teal-50 border border-teal-200 text-teal-800 text-xs font-bold">
              <ShieldCheck className="h-3.5 w-3.5 text-teal-700" />
              <span>WCAG 2.2 Real-Time Auditor</span>
            </span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 font-semibold">
              Live Extension Feed &amp; Sample Data
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
            Accessibility Scorecard
          </h1>
          <p className="mt-1 text-slate-600 text-base max-w-2xl leading-relaxed">
            Inspect detected accessibility barriers on job application websites, verified real-time fixes applied by the PRAYAS companion, and employer compliance scores.
          </p>
        </div>

        {/* Live URL Audit Trigger */}
        <form onSubmit={handleRunAudit} className="flex items-center gap-2 max-w-md w-full md:w-auto">
          <Input
            id="audit-url-input"
            type="text"
            placeholder="Enter Job Portal URL (e.g. greenhouse.io/jobs)"
            value={auditUrl}
            onChange={(e) => setAuditUrl(e.target.value)}
            className="text-xs h-10 min-w-[240px]"
          />
          <Button
            type="submit"
            variant="primary"
            size="sm"
            isLoading={isAuditing}
            className="bg-slate-900 whitespace-nowrap text-xs font-bold"
          >
            Audit URL
          </Button>
        </form>
      </div>

      {/* 2. PORTAL SELECTOR TABS */}
      <div className="flex flex-wrap items-center gap-2 pb-2 border-b border-slate-100">
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mr-2 flex items-center gap-1">
          <Filter className="h-3.5 w-3.5" />
          <span>Audited Portals:</span>
        </span>
        {reports.map((report) => (
          <button
            key={report.id}
            type="button"
            onClick={() => setSelectedReportId(report.id)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
              selectedReportId === report.id
                ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
            }`}
          >
            {report.portalName} ({report.overallScore}/100)
          </button>
        ))}
      </div>

      {activeReport && (
        <>
          {/* 3. CORE METRICS ROW */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Metric 1: Overall Score */}
            <Card className="border-slate-200 bg-gradient-to-br from-white to-teal-50/40">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Overall Compliance Score</span>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-3xl sm:text-4xl font-black text-slate-900">
                  {activeReport.overallScore}
                </span>
                <span className="text-sm font-bold text-slate-500">/ 100</span>
              </div>
              <Badge variant="teal" className="mt-2 text-[10px]">
                {activeReport.wcagLevel}
              </Badge>
            </Card>

            {/* Metric 2: Detected Issues */}
            <Card className="border-slate-200">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Detected Issues</span>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-3xl sm:text-4xl font-black text-slate-900">
                  {activeReport.detectedIssuesCount}
                </span>
                <span className="text-xs text-slate-500 font-medium">Barriers</span>
              </div>
              <p className="text-xs text-slate-500 mt-2">Scanned on candidate load</p>
            </Card>

            {/* Metric 3: Verified Improvements */}
            <Card className="border-slate-200 bg-emerald-50/30">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">Verified Improvements</span>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-3xl sm:text-4xl font-black text-emerald-700">
                  {activeReport.verifiedImprovementsCount}
                </span>
                <span className="text-xs text-emerald-700 font-bold">Auto-Fixed</span>
              </div>
              <p className="text-xs text-emerald-800 mt-2 font-semibold flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                <span>PRAYAS Remediated</span>
              </p>
            </Card>

            {/* Metric 4: Unresolved Issues */}
            <Card className="border-slate-200 bg-amber-50/30">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-900">Unresolved Barriers</span>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-3xl sm:text-4xl font-black text-amber-700">
                  {activeReport.unresolvedIssuesCount}
                </span>
                <span className="text-xs text-amber-700 font-bold">Action Needed</span>
              </div>
              <p className="text-xs text-amber-900 mt-2 font-semibold">
                {activeReport.unresolvedIssuesCount > 0 ? "Requires employer accommodation" : "Zero blocking barriers"}
              </p>
            </Card>
          </div>

          {/* 4. ACTIVE PORTAL DETAILS & REMEDIATION SUMMARY */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900">{activeReport.portalName}</h2>
                <span className="text-xs text-slate-500">
                  • Audited on {new Date(activeReport.auditDate).toLocaleDateString()}
                </span>
              </div>
              <a
                href={activeReport.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-teal-700 hover:text-teal-900 font-medium inline-flex items-center gap-1"
              >
                <span>{activeReport.url}</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-600">Remediation Progress:</span>
              <div className="w-36 bg-slate-200 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-emerald-600 h-3 rounded-full"
                  style={{
                    width: `${
                      activeReport.detectedIssuesCount > 0
                        ? (activeReport.verifiedImprovementsCount / activeReport.detectedIssuesCount) * 100
                        : 100
                    }%`,
                  }}
                />
              </div>
              <span className="text-xs font-black text-slate-900">
                {activeReport.detectedIssuesCount > 0
                  ? Math.round((activeReport.verifiedImprovementsCount / activeReport.detectedIssuesCount) * 100)
                  : 100}
                %
              </span>
            </div>
          </div>

          {/* 5. DETAILED ISSUES TABLE */}
          <Card className="border-slate-200 overflow-hidden">
            <CardHeader className="border-b border-slate-100 bg-slate-50/60 pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <CardTitle className="text-xl font-bold flex items-center gap-2">
                    <Code className="h-5 w-5 text-teal-700" />
                    <span>Detected Issues &amp; Remediations</span>
                  </CardTitle>
                  <CardDescription>
                    Granular breakdown of form elements, WCAG violations, and auto-applied script fixes.
                  </CardDescription>
                </div>

                {/* Filter Controls */}
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="bg-white border-2 border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-800"
                    aria-label="Filter issues by status"
                  >
                    <option value="all">All Statuses</option>
                    <option value="remediated">Auto-Remediated Only</option>
                    <option value="unresolved">Unresolved Only</option>
                  </select>

                  <select
                    value={filterSeverity}
                    onChange={(e) => setFilterSeverity(e.target.value)}
                    className="bg-white border-2 border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-800"
                    aria-label="Filter issues by severity"
                  >
                    <option value="all">All Severities</option>
                    <option value="critical">Critical</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-0 divide-y divide-slate-100">
              {filteredIssues.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-sm">
                  No issues match the selected filter criteria.
                </div>
              ) : (
                filteredIssues.map((issue) => {
                  const isRemediated = issue.status.includes("Auto-Remediated");
                  return (
                    <div
                      key={issue.id}
                      className="p-5 hover:bg-slate-50/50 transition-colors flex flex-col space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-bold text-slate-900 text-base">{issue.type}</span>
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                                issue.severity === "Critical"
                                  ? "bg-rose-100 text-rose-800 border border-rose-200"
                                  : issue.severity === "High"
                                  ? "bg-amber-100 text-amber-900 border border-amber-200"
                                  : "bg-slate-100 text-slate-800 border border-slate-200"
                              }`}
                            >
                              {issue.severity}
                            </span>
                            <span className="text-xs font-mono bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                              {issue.element}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 font-semibold">
                            WCAG Criterion: {issue.wcagCriterion}
                          </p>
                        </div>

                        {/* Status Badge */}
                        <div>
                          {isRemediated ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-300">
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                              <span>Auto-Remediated by PRAYAS</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-900 border border-amber-300">
                              <AlertTriangle className="h-3.5 w-3.5 text-amber-700" />
                              <span>Unresolved (Action Needed)</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Fix Description Box */}
                      <div
                        className={`p-3.5 rounded-xl border text-xs leading-relaxed flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                          isRemediated
                            ? "bg-emerald-50/40 border-emerald-200 text-emerald-950"
                            : "bg-amber-50/50 border-amber-200 text-amber-950"
                        }`}
                      >
                        <div>
                          <strong className="block mb-0.5">
                            {isRemediated ? "Remediation Applied:" : "Recommended Action:"}
                          </strong>
                          <span>{issue.fixApplied}</span>
                        </div>

                        {!isRemediated && (
                          <Button
                            variant="tealOutline"
                            size="sm"
                            onClick={() => {
                              setSelectedUnresolvedIssue(issue);
                              setIsLetterModalOpen(true);
                            }}
                            className="text-xs font-bold shrink-0 border-teal-700 text-teal-800 hover:bg-teal-50"
                          >
                            Generate Accommodation Note
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* 6. EMPLOYER ACCOMMODATION NOTE MODAL */}
      <Modal
        isOpen={isLetterModalOpen}
        onClose={() => setIsLetterModalOpen(false)}
        title="Employer Accommodation Request Note"
        description="Generated letter text to send to hiring team requesting an accessible alternative for unresolved barriers."
        maxWidth="max-w-xl"
      >
        <div className="space-y-4">
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-800 whitespace-pre-wrap leading-relaxed">
{`Dear Hiring Team,

I am currently applying for a position at your organization through your online career portal. During the application process, I encountered an accessibility barrier with the following element:

• Issue: ${selectedUnresolvedIssue?.type}
• Element: ${selectedUnresolvedIssue?.element}
• Standard: ${selectedUnresolvedIssue?.wcagCriterion}

As an applicant utilizing assistive technology, I kindly request an accessible alternative or accommodation to complete this step.

Thank you for your support and commitment to inclusive hiring.

Sincerely,
Candidate`}
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              variant="outline"
              size="md"
              onClick={() => setIsLetterModalOpen(false)}
            >
              Close
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={() => {
                navigator.clipboard.writeText(`Dear Hiring Team, ...`);
                alert("Accommodation note copied to clipboard!");
                setIsLetterModalOpen(false);
              }}
              className="bg-slate-900 font-bold"
            >
              Copy to Clipboard
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
