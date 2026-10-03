import logging
import sys
import uuid
from pathlib import Path
from typing import Any, Dict, List, Optional

# Ensure backend root is in sys.path when running file directly
_backend_root = Path(__file__).resolve().parents[2]
if str(_backend_root) not in sys.path:
    sys.path.insert(0, str(_backend_root))

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.core.auth import AuthenticatedUser, get_current_user
from app.core.config import settings
from app.core.rate_limit import rate_limited_user
from app.db.supabase import is_supabase_configured
from app.services.knowledge_service import (
    KnowledgeServiceError,
    answer_for_user,
    reindex_profile,
)
from app.services.profile_service import (
    ProfileServiceError,
    get_passport_record,
    save_passport_record,
)

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Integration & Coordination"])

# Pre-seeded audit reports for scorecard demonstration
_audit_reports: List[Dict[str, Any]] = [
    {
        "reportId": "rep-demo-101",
        "url": "http://localhost:3000/demo/job-application.html",
        "pageTitle": "GlobalTech Careers — Senior Accessibility Engineer Application",
        "timestamp": "2026-10-02T12:00:00Z",
        "overallScore": 88,
        "detectedIssuesCount": 3,
        "verifiedImprovementsCount": 2,
        "unresolvedIssuesCount": 1,
        "issues": [
            {
                "id": "iss-1",
                "element": "input#applicant-phone",
                "type": "Unassociated Label",
                "severity": "High",
                "wcagCriterion": "WCAG 2.2 - 1.3.1 Info and Relationships",
                "status": "Auto-Remediated by PRAYAS",
                "fixApplied": "Injected aria-label='Mobile Phone Number' and linked visual label.",
            },
            {
                "id": "iss-2",
                "element": "select#applicant-experience",
                "type": "Irregular Tabindex (tabindex=5)",
                "severity": "Medium",
                "wcagCriterion": "WCAG 2.2 - 2.4.3 Focus Order",
                "status": "Auto-Remediated by PRAYAS",
                "fixApplied": "Normalized tabindex to 0 for sequential DOM navigation.",
            },
            {
                "id": "iss-3",
                "element": "textarea#applicant-challenge",
                "type": "Complex Open-Ended Essay Prompt",
                "severity": "Low",
                "wcagCriterion": "WCAG 2.2 - 3.3.2 Labels or Instructions",
                "status": "Awaiting AI Assisted Draft Review",
                "fixApplied": "PRAYAS Conversational Agent activated for grounded candidate drafting.",
            },
        ],
    }
]


# ==========================================
# Schema Definitions
# ==========================================

class ExtensionRAGRequest(BaseModel):
    question: str
    context: Optional[str] = ""
    preferences: Optional[Dict[str, Any]] = None
    language: Optional[str] = "en"
    # Legacy fields: accepted for backward compatibility but IGNORED.
    # Identity always comes from the verified auth token.
    user_id: Optional[str] = None
    user_email: Optional[str] = None
    user_profile: Optional[Dict[str, Any]] = None


class VoiceAgentRAGRequest(BaseModel):
    question: str
    field_id: Optional[str] = None
    language: Optional[str] = "en"
    user_id: Optional[str] = None
    user_email: Optional[str] = None
    user_profile: Optional[Dict[str, Any]] = None
    supplemental_notes: Optional[str] = ""
    max_words: Optional[int] = 150


class AuditReportSubmission(BaseModel):
    reportId: Optional[str] = None
    url: Optional[str] = "http://localhost:3000"
    pageTitle: Optional[str] = "Untitled Job Application"
    detectedIssuesCount: Optional[int] = 0
    verifiedImprovementsCount: Optional[int] = 0
    unresolvedIssuesCount: Optional[int] = 0
    issues: Optional[List[Dict[str, Any]]] = []
    timestamp: Optional[str] = None
    consentGranted: Optional[bool] = True


# ==========================================
# Shared RAG helper (web assistant + Chrome extension + voice agent)
# ==========================================

def _ask_user_knowledge(
    user: AuthenticatedUser,
    question: str,
    context: str = "",
    language: Optional[str] = "en",
) -> Dict[str, Any]:
    """Single code path: answers come only from this user's documents and passport, in their chosen language."""
    q = (question or "").strip()
    if not q:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Question cannot be empty.")
    if context and context.strip():
        # Page context is untrusted; keep it short and clearly labelled.
        q = f"{q}\n(Form context, for reference only: {context.strip()[:300]})"
    try:
        return answer_for_user(user.user_id, q, language=language or "en")
    except KnowledgeServiceError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc))


def _source_names(result: Dict[str, Any]) -> List[str]:
    names: List[str] = []
    for s in result.get("sources", []):
        name = s.get("document_name")
        if name and name not in names:
            names.append(name)
    return names


# ==========================================
# Endpoints: Health Check Alias
# ==========================================

@router.get("/health", summary="Health check alias for extension and frontend")
def health_alias():
    return {
        "status": "ok",
        "app": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "environment": settings.ENVIRONMENT,
        "database": "configured" if is_supabase_configured() else "demo_mode",
    }


# ==========================================
# Endpoints: Accessibility Passport (Profile) — per user, authenticated
# ==========================================

def _profile_response(user_id: str) -> Dict[str, Any]:
    record = get_passport_record(user_id)
    return {
        "status": "success",
        "success": True,
        "passport": record["passport_data"] or {},
        "field_sources": record["field_sources"] or {},
    }


@router.get("/profile", summary="Retrieve the signed-in user's Passport")
def get_profile(current_user: AuthenticatedUser = Depends(get_current_user)):
    try:
        return _profile_response(current_user.user_id)
    except ProfileServiceError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc))


@router.post("/profile", summary="Update the signed-in user's Passport")
@router.put("/profile", summary="Update the signed-in user's Passport")
def update_profile(
    payload: Dict[str, Any],
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """Merge the provided keys into the user's Passport, mark them as user-edited, and re-index the profile."""
    clean = {
        str(k): v for k, v in (payload or {}).items()
        if isinstance(v, (str, int, float, bool)) or v is None
    }
    try:
        record = get_passport_record(current_user.user_id)
        data = dict(record["passport_data"] or {})
        sources = dict(record["field_sources"] or {})
        for key, value in clean.items():
            if data.get(key) != value and (value not in (None, "") or data.get(key) not in (None, "")):
                sources[key] = "user"
            data[key] = value
        save_passport_record(current_user.user_id, data, field_sources=sources)
    except ProfileServiceError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc))

    try:
        reindex_profile(current_user.user_id)
    except Exception as exc:  # re-index is best-effort; the save already succeeded
        logger.warning("Profile re-index after edit failed: %s", str(exc))
    return _profile_response(current_user.user_id)


# ==========================================
# Endpoints: Accessibility Audit Scorecards
# ==========================================

@router.post("/audit-report", summary="Receive and store Chrome Extension audit scorecard")
def submit_audit_report(report: AuditReportSubmission):
    report_dict = report.model_dump()
    if not report_dict.get("reportId"):
        report_dict["reportId"] = f"rep-{uuid.uuid4().hex[:8]}"
    _audit_reports.insert(0, report_dict)
    return {
        "success": True,
        "reportId": report_dict["reportId"],
        "message": "Audit report saved successfully",
    }


@router.get("/audit-report", summary="Retrieve all recorded accessibility audit scorecards")
def get_audit_reports():
    return {
        "success": True,
        "count": len(_audit_reports),
        "reports": _audit_reports,
    }


# ==========================================
# Endpoints: Unified RAG & Q&A (identical logic for web, extension, voice agent)
# ==========================================

@router.post("/rag-answer", summary="RAG answer for the Chrome extension (Autofill / AI Draft)")
async def extension_rag_answer(
    payload: ExtensionRAGRequest,
    current_user: AuthenticatedUser = Depends(rate_limited_user),
):
    result = _ask_user_knowledge(current_user, payload.question, payload.context or "", language=payload.language)
    return {
        "success": True,
        "draftAnswer": result["answer"],
        "sourcesUsed": _source_names(result),
        "sources": result["sources"],
        "found": result["found"],
        "empty_state": result["empty_state"],
        "upload_url": result["upload_url"],
        "language": result.get("language", payload.language or "en"),
        "language_name": result.get("language_name", "English"),
        "bcp47": result.get("bcp47", "en-IN"),
    }


@router.post("/generate-answer", summary="RAG conversational agent endpoint (voice assistant)")
async def voice_agent_generate_answer(
    payload: VoiceAgentRAGRequest,
    current_user: AuthenticatedUser = Depends(rate_limited_user),
):
    result = _ask_user_knowledge(current_user, payload.question, payload.supplemental_notes or "", language=payload.language)
    return {
        "success": True,
        "draft_answer": result["answer"],
        "confidence": 0.9 if result["found"] else 0.0,
        "sources": _source_names(result),
        "source_details": result["sources"],
        "evidence_found": result["found"],
        "empty_state": result["empty_state"],
        "upload_url": result["upload_url"],
        "language": result.get("language", payload.language or "en"),
        "language_name": result.get("language_name", "English"),
        "bcp47": result.get("bcp47", "en-IN"),
    }


@router.post("/rag/query", summary="RAG answer endpoint for the web assistant")
@router.post("/assistant/ask", summary="RAG answer endpoint for the web assistant")
async def web_client_rag_query(
    payload: ExtensionRAGRequest,
    current_user: AuthenticatedUser = Depends(rate_limited_user),
):
    result = _ask_user_knowledge(current_user, payload.question, payload.context or "", language=payload.language)
    return {
        "answer": result["answer"],
        "sources": result["sources"],
        "found": result["found"],
        "empty_state": result["empty_state"],
        "has_context": result["has_context"],
        "upload_url": result["upload_url"],
        "language": result.get("language", payload.language or "en"),
        "language_name": result.get("language_name", "English"),
        "bcp47": result.get("bcp47", "en-IN"),
        "isLiveBackend": True,
    }


if __name__ == "__main__":
    import uvicorn
    print("Direct execution of integration.py detected. Launching FastAPI server (app.main:app) on http://127.0.0.1:8000 ...")
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=True)
