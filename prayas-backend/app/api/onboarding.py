import logging
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from pydantic import BaseModel

from app.api.documents import upload_document_endpoint
from app.core.auth import AuthenticatedUser, get_current_user
from app.core.rate_limit import rate_limited_user
from app.services.cv_extraction_service import (
    PASSPORT_FIELD_TO_CONFIDENCE_KEY,
    REVIEW_FIELDS,
    CVExtractionError,
    build_diff,
    extract_structured_profile,
    is_empty,
    to_passport_fields,
)
from app.services.knowledge_service import KnowledgeServiceError, list_user_documents, reindex_profile
from app.services.profile_service import (
    ProfileServiceError,
    get_passport_record,
    get_user_state,
    save_passport_record,
    set_user_state,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/onboarding", tags=["Onboarding"])

SCANNED_MESSAGE = (
    "We couldn't read any text in this file. It may be a scanned image. "
    "Try a text-based PDF, a DOCX or a TXT version, or fill in your details manually."
)


class ConfirmRequest(BaseModel):
    fields: Dict[str, str] = {}
    # Fields where the user explicitly chose to replace an existing value (re-upload diff flow)
    overwrite_fields: List[str] = []
    document_id: Optional[str] = None
    extracted_profile: Optional[Dict[str, Any]] = None


def _find_resume(user_id: str) -> Optional[Dict[str, Any]]:
    try:
        docs = list_user_documents(user_id)
    except KnowledgeServiceError:
        return None
    resumes = [d for d in docs if d.get("doc_type") == "resume"]
    return resumes[0] if resumes else None


def _status_payload(user_id: str) -> Dict[str, Any]:
    state = get_user_state(user_id)
    resume = _find_resume(user_id)
    has_cv = resume is not None
    return {
        "onboarding_complete": bool(state.get("onboarding_complete")) or has_cv,
        "onboarding_skipped": bool(state.get("onboarding_skipped")),
        "has_cv": has_cv,
        "cv_document_id": str(resume["id"]) if resume else state.get("cv_document_id"),
        "needs_onboarding": not (bool(state.get("onboarding_complete")) or has_cv or bool(state.get("onboarding_skipped"))),
        "show_reminder": not has_cv,
    }


@router.get("/status", summary="Has this user finished (or skipped) onboarding?")
async def onboarding_status(current_user: AuthenticatedUser = Depends(get_current_user)):
    try:
        return _status_payload(current_user.user_id)
    except ProfileServiceError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc))


@router.post("/skip", summary="Skip CV upload for now (banner keeps reminding)")
async def onboarding_skip(current_user: AuthenticatedUser = Depends(get_current_user)):
    try:
        set_user_state(current_user.user_id, onboarding_skipped=True)
        return _status_payload(current_user.user_id)
    except ProfileServiceError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc))


@router.post("/cv", summary="Upload a CV, index it, and extract passport fields for review")
async def onboarding_upload_cv(
    file: UploadFile = File(...),
    current_user: AuthenticatedUser = Depends(rate_limited_user),
):
    """
    Reuses the standard document upload (validation, private storage, indexing), then asks the LLM
    to extract structured data. NOTHING is written to the passport here: the user reviews first.
    """
    uploaded = await upload_document_endpoint(
        file=file, user_id=None, doc_type="resume", current_user=current_user
    )
    text = (uploaded.extracted_text or "").strip()
    if not text:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail=SCANNED_MESSAGE)

    try:
        record = get_passport_record(current_user.user_id)
    except ProfileServiceError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc))
    current = record["passport_data"] or {}

    base = {
        "success": True,
        "document_id": uploaded.document_id,
        "file_name": uploaded.file_name,
        "indexed": uploaded.indexed,
        "current_passport": current,
        "review_fields": REVIEW_FIELDS,
    }

    try:
        profile, confidence = extract_structured_profile(text)
    except CVExtractionError as exc:
        return {
            **base,
            "extraction_failed": True,
            "message": f"We couldn't read your details automatically ({exc}). You can fill them in manually.",
            "proposed": {},
            "confidence": {},
            "fields": [],
            "diff": [],
            "extracted_profile": {},
        }

    proposed = to_passport_fields(profile)
    fields = []
    for key in REVIEW_FIELDS:
        conf_key = PASSPORT_FIELD_TO_CONFIDENCE_KEY.get(key)
        has_current = not is_empty(current.get(key))
        has_proposed = key in proposed
        fields.append({
            "key": key,
            "proposed": proposed.get(key, ""),
            "current": current.get(key, "") if has_current else "",
            "confidence": confidence.get(conf_key, "missing") if has_proposed else "missing",
            "auto_filled": has_proposed and not has_current,
            "missing": not has_proposed and not has_current,
            "conflict": has_proposed and has_current and str(current.get(key)).strip() != proposed[key].strip(),
        })

    return {
        **base,
        "extraction_failed": False,
        "proposed": proposed,
        "confidence": confidence,
        "fields": fields,
        "diff": build_diff(current, proposed),
        "extracted_profile": profile,
    }


@router.post("/confirm", summary="Save the reviewed details to the Passport")
async def onboarding_confirm(
    payload: ConfirmRequest,
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Writes only what the user confirmed. Existing non-empty values are never overwritten
    unless the field is explicitly listed in overwrite_fields.
    """
    user_id = current_user.user_id
    try:
        record = get_passport_record(user_id)
        data = dict(record["passport_data"] or {})
        sources = dict(record["field_sources"] or {})
        overwrite = set(payload.overwrite_fields or [])
        applied: List[str] = []
        skipped: List[str] = []
        for key, value in (payload.fields or {}).items():
            value = (value or "").strip()
            if not value:
                continue
            if is_empty(data.get(key)) or key in overwrite:
                if data.get(key) != value:
                    data[key] = value
                    sources[key] = "cv"
                    applied.append(key)
            elif str(data.get(key)).strip() != value:
                skipped.append(key)
        save_passport_record(
            user_id,
            data,
            extracted_profile=payload.extracted_profile if payload.extracted_profile is not None else None,
            field_sources=sources,
        )
        set_user_state(
            user_id,
            onboarding_complete=True,
            **({"cv_document_id": payload.document_id} if payload.document_id else {}),
        )
    except ProfileServiceError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc))

    reindexed = True
    try:
        reindex_profile(user_id)
    except Exception as exc:
        reindexed = False
        logger.warning("Profile re-index after confirm failed: %s", str(exc))

    return {
        "success": True,
        "applied": applied,
        "skipped": skipped,
        "reindexed": reindexed,
        "passport": data,
    }
