"""
Per-user persistence for the Accessibility Passport and onboarding state.

Backed by Supabase (tables: passports, user_profiles). When Supabase is not configured
(local dev / unit tests) an in-memory store keyed by user_id is used. Every function takes
the authenticated user_id explicitly, so there is no shared/global profile.
"""
import logging
from datetime import datetime, timezone
from typing import Any, Dict, Optional

from app.db.supabase import get_supabase_client, is_supabase_configured

logger = logging.getLogger(__name__)

PASSPORTS_TABLE = "passports"
USER_PROFILES_TABLE = "user_profiles"

_memory_passports: Dict[str, Dict[str, Any]] = {}
_memory_state: Dict[str, Dict[str, Any]] = {}


class ProfileServiceError(Exception):
    """Raised when profile / onboarding persistence fails. Never leaks credentials."""
    pass


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _client_or_none():
    if not is_supabase_configured():
        return None
    return get_supabase_client()


# ---------------------------------------------------------------------------
# Onboarding state
# ---------------------------------------------------------------------------

def default_state() -> Dict[str, Any]:
    return {
        "onboarding_complete": False,
        "onboarding_skipped": False,
        "cv_document_id": None,
    }


import uuid

def _is_uuid(val: Any) -> bool:
    try:
        uuid.UUID(str(val))
        return True
    except (ValueError, TypeError, AttributeError):
        return False


def get_user_state(user_id: str) -> Dict[str, Any]:
    client = _client_or_none()
    if client is None or not _is_uuid(user_id):
        return {**default_state(), **_memory_state.get(user_id, {})}
    try:
        res = client.table(USER_PROFILES_TABLE).select("*").eq("user_id", user_id).limit(1).execute()
        row = (res.data or [None])[0]
        return {**default_state(), **(row or {})}
    except Exception as exc:
        logger.warning("Could not read onboarding state from DB for user %s, falling back to memory: %s", user_id, str(exc))
        return {**default_state(), **_memory_state.get(user_id, {})}


def set_user_state(user_id: str, **fields: Any) -> Dict[str, Any]:
    allowed = {"onboarding_complete", "onboarding_skipped", "cv_document_id"}
    payload = {k: v for k, v in fields.items() if k in allowed}
    state = {**default_state(), **_memory_state.get(user_id, {}), **payload}
    _memory_state[user_id] = state

    client = _client_or_none()
    if client is None or not _is_uuid(user_id):
        return state
    try:
        record = {"user_id": user_id, "updated_at": _now(), **payload}
        res = client.table(USER_PROFILES_TABLE).upsert(record, on_conflict="user_id").execute()
        return {**default_state(), **((res.data or [record])[0])}
    except Exception as exc:
        logger.warning("Could not save onboarding state to DB for user %s, cached in memory: %s", user_id, str(exc))
        return state


# ---------------------------------------------------------------------------
# Passport
# ---------------------------------------------------------------------------

def get_passport_record(user_id: str) -> Dict[str, Any]:
    """Return {'passport_data', 'extracted_profile', 'field_sources'} for this user only."""
    empty = {"passport_data": {}, "extracted_profile": {}, "field_sources": {}}
    client = _client_or_none()
    if client is None or not _is_uuid(user_id):
        return {**empty, **_memory_passports.get(user_id, {})}
    try:
        res = client.table(PASSPORTS_TABLE).select("*").eq("user_id", user_id).limit(1).execute()
        row = (res.data or [None])[0]
        if not row:
            return {**empty, **_memory_passports.get(user_id, {})}
        return {
            "passport_data": row.get("passport_data") or {},
            "extracted_profile": row.get("extracted_profile") or {},
            "field_sources": row.get("field_sources") or {},
        }
    except Exception as exc:
        logger.warning("Could not read passport from DB for user %s, falling back to memory: %s", user_id, str(exc))
        return {**empty, **_memory_passports.get(user_id, {})}


def save_passport_record(
    user_id: str,
    passport_data: Dict[str, Any],
    extracted_profile: Optional[Dict[str, Any]] = None,
    field_sources: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    current = get_passport_record(user_id)
    record_view = {
        "passport_data": passport_data,
        "extracted_profile": extracted_profile if extracted_profile is not None else current["extracted_profile"],
        "field_sources": field_sources if field_sources is not None else current["field_sources"],
    }
    _memory_passports[user_id] = record_view

    client = _client_or_none()
    if client is None or not _is_uuid(user_id):
        return record_view
    try:
        client.table(PASSPORTS_TABLE).upsert(
            {"user_id": user_id, "updated_at": _now(), **record_view},
            on_conflict="user_id",
        ).execute()
        return record_view
    except Exception as exc:
        logger.warning("Could not save passport to DB for user %s, saved to memory: %s", user_id, str(exc))
        return record_view


# ---------------------------------------------------------------------------
# Passport -> readable text (for RAG indexing)
# ---------------------------------------------------------------------------

PASSPORT_TEXT_LABELS = [
    ("fullName", "Full name"),
    ("email", "Email"),
    ("phone", "Phone"),
    ("location", "Location"),
    ("address", "Address"),
    ("dob", "Date of birth"),
    ("nationality", "Nationality"),
    ("passportNumber", "Passport number"),
    ("passportExpiry", "Passport expiry date"),
    ("professionalSummary", "Professional summary"),
    ("education", "Education"),
    ("workExperience", "Work experience"),
    ("skills", "Skills"),
    ("languages", "Languages"),
    ("certifications", "Certifications"),
    ("projects", "Projects"),
    ("linkedinUrl", "LinkedIn"),
    ("githubUrl", "GitHub"),
    ("portfolioUrl", "Portfolio"),
    ("idDetails", "ID details"),
    ("accommodationNotes", "Accommodation notes"),
]


def passport_to_text(passport_data: Dict[str, Any]) -> str:
    """Turn the structured passport into labelled text lines. Empty fields are omitted."""
    lines = []
    for key, label in PASSPORT_TEXT_LABELS:
        value = (passport_data or {}).get(key)
        if isinstance(value, str) and value.strip():
            lines.append(f"{label}: {value.strip()}")
    if not lines:
        return ""
    return "USER PROFILE (Accessibility Passport)\n" + "\n".join(lines)
