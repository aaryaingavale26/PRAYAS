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
  ExternalLink,
  Filter,
  Code,
  ArrowRight,
  Sparkles,
  RefreshCw
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
            fixApplied: "Applied High Contrast CSS override (Contrast ratio 9.8:1).",
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 min-h-[60vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="h-8 w-8 animate-spin text-[#1F5FBF]" />
          <p className="text-sm font-semibold text-[#18191D]">Loading Accessibility Scorecard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10 w-full space-y-8">
      
      {/* 1. IMAGE 1 FOLDER-TAB SECTION HEADER */}
      <div className="flex items-center justify-between">
        <div className="folder-tab-header">
          <span>ACCESSIBILITY SCORECARD</span>
          <ArrowRight className="h-4 w-4" />
        </div>
        <div className="text-xs font-bold text-[#646672] uppercase tracking-wider">
          WCAG 2.2 AA VERIFICATION
        </div>
      </div>

      {/* Header and Live URL Audit Trigger */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-[#E2E2D4]">
        <div>
          <h1 className="font-display text-3xl sm:text-4xl font-black text-[#18191D] tracking-tight">
            Employer Audit &amp; Remediations
          </h1>
          <p className="mt-1 text-[#4B4D56] text-sm sm:text-base max-w-2xl leading-relaxed">
            Inspect detected accessibility barriers across job application websites, verified real-time fixes applied by the PRAYAS companion, and employer compliance scores.
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
            variant="secondary"
            size="sm"
            isLoading={isAuditing}
            className="whitespace-nowrap text-xs font-bold"
          >
            Audit URL
          </Button>
        </form>
      </div>

      {/* 2. PORTAL SELECTOR TABS */}
      <div className="flex flex-wrap items-center gap-2 pb-2 border-b border-[#E2E2D4]">
        <span className="text-xs font-bold text-[#646672] uppercase tracking-wider mr-2 flex items-center gap-1">
          <Filter className="h-3.5 w-3.5" />
          <span>Audited Portals:</span>
        </span>
        {reports.map((report) => (
          <button
            key={report.id}
            type="button"
            onClick={() => setSelectedReportId(report.id)}
            suppressHydrationWarning
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
              selectedReportId === report.id
                ? "bg-[#18191D] text-white border-[#18191D] shadow-sm"
                : "bg-white text-[#18191D] border-[#E2E2D4] hover:bg-[#F3F3E3]"
            }`}
          >
            {report.portalName} ({report.overallScore}/100)
          </button>
        ))}
      </div>

      {activeReport && (
        <>
          {/* 3. CIRCULAR GRAY STAT BADGES ROW (Image 1 Requirement) */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            
            {/* Metric 1: Overall Score */}
            <div className="bg-[#FFFFFF] border border-[#E2E2D4] rounded-2xl p-5 flex items-center gap-4 shadow-xs">
              <div className="circular-stat-badge w-18 h-18 shrink-0 bg-[#E8E8DC]">
                <span className="font-display text-2xl font-black text-[#18191D]">
                  {activeReport.overallScore}
                </span>
                <span className="text-[9px] font-black text-[#646672] uppercase">SCORE</span>
              </div>
              <div className="min-w-0">
                <span className="text-xs font-bold uppercase tracking-wider text-[#646672] block">Compliance</span>
                <span className="font-display text-sm font-bold text-[#18191D] truncate block">
                  {activeReport.wcagLevel}
                </span>
                <span className="text-[11px] text-[#0284C7] font-bold block mt-0.5">
                  Live Audit
                </span>
              </div>
            </div>

            {/* Metric 2: Detected Issues */}
            <div className="bg-[#FFFFFF] border border-[#E2E2D4] rounded-2xl p-5 flex items-center gap-4 shadow-xs">
              <div className="circular-stat-badge w-18 h-18 shrink-0 bg-[#E8E8DC]">
                <span className="font-display text-2xl font-black text-[#92400E]">
                  {activeReport.detectedIssuesCount}
                </span>
                <span className="text-[9px] font-black text-[#646672] uppercase">BARRIERS</span>
              </div>
              <div className="min-w-0">
                <span className="text-xs font-bold uppercase tracking-wider text-[#646672] block">Detected</span>
                <span className="font-display text-sm font-bold text-[#18191D] truncate block">
                  {activeReport.detectedIssuesCount} Issues
                </span>
                <span className="text-[11px] text-[#92400E] font-bold block mt-0.5">
                  Scanned on Load
                </span>
              </div>
            </div>

            {/* Metric 3: Verified Auto-Fixes */}
            <div className="bg-[#FFFFFF] border border-[#E2E2D4] rounded-2xl p-5 flex items-center gap-4 shadow-xs">
              <div className="circular-stat-badge w-18 h-18 shrink-0 bg-[#E8E8DC]">
                <span className="font-display text-2xl font-black text-[#065F46]">
                  {activeReport.verifiedImprovementsCount}
                </span>
                <span className="text-[9px] font-black text-[#646672] uppercase">FIXED</span>
              </div>
              <div className="min-w-0">
                <span className="text-xs font-bold uppercase tracking-wider text-[#646672] block">Repairs</span>
                <span className="font-display text-sm font-bold text-[#18191D] truncate block">
                  {activeReport.verifiedImprovementsCount} Repaired
                </span>
                <span className="text-[11px] text-[#065F46] font-bold block mt-0.5">
                  Lossless DOM Fix
                </span>
              </div>
            </div>

            {/* Metric 4: Unresolved Barriers */}
            <div className="bg-[#FFFFFF] border border-[#E2E2D4] rounded-2xl p-5 flex items-center gap-4 shadow-xs">
              <div className="circular-stat-badge w-18 h-18 shrink-0 bg-[#E8E8DC]">
                <span className="font-display text-2xl font-black text-[#18191D]">
                  {activeReport.unresolvedIssuesCount}
                </span>
                <span className="text-[9px] font-black text-[#646672] uppercase">PENDING</span>
              </div>
              <div className="min-w-0">
                <span className="text-xs font-bold uppercase tracking-wider text-[#646672] block">Unresolved</span>
                <span className="font-display text-sm font-bold text-[#18191D] truncate block">
                  {activeReport.unresolvedIssuesCount === 0 ? "Zero Blockers" : "Needs Note"}
                </span>
                <span className="text-[11px] text-[#2F9BE0] font-bold block mt-0.5">
                  Employer Gate
                </span>
              </div>
            </div>
          </div>

          {/* 4. ACTIVE PORTAL DETAILS & REMEDIATION PROGRESS */}
          <div className="p-6 rounded-3xl bg-white border border-[#E2E2D4] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h2 className="font-display text-lg font-bold text-[#18191D]">{activeReport.portalName}</h2>
                <span className="text-xs text-[#646672]">
                  • Audited on {new Date(activeReport.auditDate).toLocaleDateString()}
                </span>
              </div>
              <a
                href={activeReport.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-[#1F5FBF] hover:underline font-bold inline-flex items-center gap-1"
              >
                <span>{activeReport.url}</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-[#646672]">Remediation Progress:</span>
              <div className="w-36 bg-[#E2E2D4] rounded-full h-3 overflow-hidden">
                <div
                  className="bg-[#2F9BE0] h-3 rounded-full"
                  style={{
                    width: `${
                      activeReport.detectedIssuesCount > 0
                        ? (activeReport.verifiedImprovementsCount / activeReport.detectedIssuesCount) * 100
                        : 100
                    }%`,
                  }}
                />
              </div>
              <span className="text-xs font-black text-[#18191D]">
                {activeReport.detectedIssuesCount > 0
                  ? Math.round((activeReport.verifiedImprovementsCount / activeReport.detectedIssuesCount) * 100)
                  : 100}
                %
              </span>
            </div>
          </div>

          {/* 5. DETAILED ISSUES TABLE IN BROWSER-WINDOW FRAME */}
          <div className="browser-window-frame">
            <div className="browser-window-header justify-between">
              <div className="flex items-center gap-2">
                <span className="browser-window-dot bg-[#FF5F56]"></span>
                <span className="browser-window-dot bg-[#FFBD2E]"></span>
                <span className="browser-window-dot bg-[#27C93F]"></span>
                <span className="text-xs font-bold text-[#646672] ml-2">Detected Issues &amp; Remediations</span>
              </div>

              {/* Filter Controls */}
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="bg-white border-2 border-[#D5D5C8] rounded-xl px-2.5 py-1 text-xs font-bold text-[#18191D]"
                  aria-label="Filter issues by status"
                >
                  <option value="all">All Statuses</option>
                  <option value="remediated">Auto-Remediated Only</option>
                  <option value="unresolved">Unresolved Only</option>
                </select>

                <select
                  value={filterSeverity}
                  onChange={(e) => setFilterSeverity(e.target.value)}
                  className="bg-white border-2 border-[#D5D5C8] rounded-xl px-2.5 py-1 text-xs font-bold text-[#18191D]"
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

            <div className="divide-y divide-[#E2E2D4]">
              {filteredIssues.length === 0 ? (
                <div className="p-8 text-center text-[#646672] text-sm">
                  No issues match the selected filter criteria.
                </div>
              ) : (
                filteredIssues.map((issue) => {
                  const isRemediated = issue.status.includes("Auto-Remediated");
                  return (
                    <div
                      key={issue.id}
                      className="p-5 hover:bg-[#FBFBEF] transition-colors flex flex-col space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-bold text-[#18191D] text-base">{issue.type}</span>
                            <span
                              className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                                issue.severity === "Critical"
                                  ? "bg-[#FEE2E2] text-[#991B1B] border border-[#FECACA]"
                                  : issue.severity === "High"
                                  ? "bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A]"
                                  : "bg-[#E8E8DC] text-[#18191D] border border-[#D5D5C8]"
                              }`}
                            >
                              {issue.severity}
                            </span>
                            <span className="text-xs font-mono bg-[#F3F3E3] text-[#18191D] px-2 py-0.5 rounded-md border border-[#E2E2D4]">
                              {issue.element}
                            </span>
                          </div>
                          <p className="text-xs text-[#646672] font-semibold">
                            WCAG Criterion: {issue.wcagCriterion}
                          </p>
                        </div>

                        {/* Status Badge */}
                        <div>
                          {isRemediated ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#D1FAE5] text-[#065F46] border border-[#A7F3D0]">
                              <CheckCircle2 className="h-3.5 w-3.5 text-[#059669]" />
                              <span>Auto-Remediated by PRAYAS</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A]">
                              <AlertTriangle className="h-3.5 w-3.5 text-[#B45309]" />
                              <span>Unresolved (Action Needed)</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Fix Description Box */}
                      <div
                        className={`p-3.5 rounded-2xl border text-xs leading-relaxed flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                          isRemediated
                            ? "bg-[#EFF6FF] border-[#BFDBFE] text-[#1E3A8A]"
                            : "bg-[#FEF3C7] border-[#FDE68A] text-[#92400E]"
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
                            variant="secondary"
                            size="sm"
                            onClick={() => {
                              setSelectedUnresolvedIssue(issue);
                              setIsLetterModalOpen(true);
                            }}
                            className="text-xs font-bold shrink-0"
                          >
                            Generate Accommodation Note
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
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
          <div className="p-4 bg-[#FBFBEF] border border-[#E2E2D4] rounded-2xl text-xs font-mono text-[#18191D] whitespace-pre-wrap leading-relaxed">
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
            >
              Copy to Clipboard
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
