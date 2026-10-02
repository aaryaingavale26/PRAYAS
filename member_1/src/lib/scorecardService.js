/**
 * Accessibility Scorecard Service
 * Tracks detected barriers, remediations, and employer compliance scores
 * Integrates with Chrome Extension and FastAPI backend
 */

const STORAGE_KEY = "prayas_scorecard_reports";
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:8000";

export const SAMPLE_SCORECARD_REPORTS = [
  {
    id: "rep-101",
    portalName: "TechCorp Global Career Portal",
    url: "https://careers.techcorp-example.com/apply/senior-dev",
    auditDate: new Date(Date.now() - 3600000 * 4).toISOString(),
    overallScore: 84, // Out of 100
    wcagLevel: "WCAG 2.2 AA Partially Compliant",
    detectedIssuesCount: 4,
    verifiedImprovementsCount: 3,
    unresolvedIssuesCount: 1,
    issues: [
      {
        id: "iss-1",
        element: "input#work_history_start_date",
        type: "Missing Accessible Label",
        severity: "High",
        wcagCriterion: "1.3.1 Info and Relationships",
        status: "Auto-Remediated by PRAYAS",
        fixApplied: "Injected aria-label='Start Date (MM/YYYY)' and associated visual helper text.",
      },
      {
        id: "iss-2",
        element: "button.submit-application-btn",
        type: "Low Contrast Ratio (2.8:1)",
        severity: "Medium",
        wcagCriterion: "1.4.3 Contrast (Minimum)",
        status: "Auto-Remediated by PRAYAS",
        fixApplied: "Adjusted foreground color to #0f172a over #ffffff (Contrast: 12.5:1).",
      },
      {
        id: "iss-3",
        element: "div.modal-cookie-overlay",
        type: "Keyboard Tab Trap",
        severity: "Critical",
        wcagCriterion: "2.1.2 No Keyboard Trap",
        status: "Auto-Remediated by PRAYAS",
        fixApplied: "Added Escape key listener and released focus back to main form.",
      },
      {
        id: "iss-4",
        element: "canvas#custom_math_captcha",
        type: "Visual-Only CAPTCHA without Audio Alternative",
        severity: "Critical",
        wcagCriterion: "1.1.1 Non-text Content",
        status: "Unresolved (Employer Action Required)",
        fixApplied: "Flagged to applicant. One-click accommodation request generated.",
      },
    ],
  },
  {
    id: "rep-102",
    portalName: "FinHealth Jobs Portal (Workday System)",
    url: "https://finhealth.wd3.myworkdayjobs.com/careers",
    auditDate: new Date(Date.now() - 86400000).toISOString(),
    overallScore: 92,
    wcagLevel: "WCAG 2.2 AA Compliant",
    detectedIssuesCount: 2,
    verifiedImprovementsCount: 2,
    unresolvedIssuesCount: 0,
    issues: [
      {
        id: "iss-5",
        element: "select#disability_status",
        type: "Ambiguous Options Language",
        severity: "Low",
        wcagCriterion: "3.1.2 Language of Parts",
        status: "Auto-Remediated by PRAYAS",
        fixApplied: "Injected plain-English explanations for legal clauses.",
      },
      {
        id: "iss-6",
        element: "input#resume_file_picker",
        type: "Missing Keyboard Focus Outline",
        severity: "Medium",
        wcagCriterion: "2.4.7 Focus Visible",
        status: "Auto-Remediated by PRAYAS",
        fixApplied: "Applied 3px teal high-visibility focus ring.",
      },
    ],
  },
];

/**
 * Fetch all audit reports
 */
export async function getScorecardReports() {
  let backendReports = [];
  if (typeof window !== "undefined") {
    try {
      const res = await fetch(`${API_BASE_URL}/api/audit-report`, {
        method: "GET",
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(1500),
      });
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.reports)) {
          backendReports = data.reports.map((r) => ({
            id: r.reportId || `rep-${Math.random().toString(36).substr(2, 5)}`,
            portalName: r.pageTitle || "Live Job Portal",
            url: r.url || "http://localhost:3000/demo/job-application.html",
            auditDate: r.timestamp || new Date().toISOString(),
            overallScore: r.overallScore || Math.max(70, 100 - (r.unresolvedIssuesCount || 1) * 10),
            wcagLevel: r.unresolvedIssuesCount > 0 ? "WCAG 2.2 AA Partially Compliant" : "WCAG 2.2 AA Compliant",
            detectedIssuesCount: r.detectedIssuesCount || (r.issues ? r.issues.length : 0),
            verifiedImprovementsCount: r.verifiedImprovementsCount || 0,
            unresolvedIssuesCount: r.unresolvedIssuesCount || 0,
            issues: r.issues || [],
            source: "Chrome Extension (Live API)",
          }));
        }
      }
    } catch (e) {
      // Backend offline or timeout; proceed with local storage
    }
  }

  // Local storage
  let localReports = [];
  if (typeof window !== "undefined") {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        localReports = JSON.parse(stored);
      } catch (e) {}
    }
  }

  // Combine unique reports (backend reports prioritized)
  const combinedMap = new Map();
  backendReports.forEach((r) => combinedMap.set(r.id, r));
  localReports.forEach((r) => {
    if (!combinedMap.has(r.id)) combinedMap.set(r.id, r);
  });
  SAMPLE_SCORECARD_REPORTS.forEach((r) => {
    if (!combinedMap.has(r.id)) combinedMap.set(r.id, r);
  });

  return Array.from(combinedMap.values());
}

/**
 * Add a new real-time audit report from the Chrome Extension
 */
export async function addScorecardReport(report) {
  const current = await getScorecardReports();
  const updated = [report, ...current];
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent("prayas-scorecard-updated", { detail: updated }));
  }
  return updated;
}
