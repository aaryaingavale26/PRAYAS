import logging
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from app.core.auth import AuthenticatedUser, get_current_user
from app.core.rate_limit import rate_limited_user
from app.services.bhashini_service import (
    get_supported_languages,
    normalize_language_code,
    speech_to_text,
    text_to_speech,
    translate_text,
)
from app.services.knowledge_service import KnowledgeServiceError, answer_for_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/bhashini", tags=["Bhashini & Multilingual AI"])


# ---------------------------------------------------------------------------
# Request & Response Schemas
# ---------------------------------------------------------------------------

class TranslateRequest(BaseModel):
    text: str = Field(..., min_length=1, description="Text to translate")
    source_language: Optional[str] = Field("en", description="Source ISO/BCP47 language code")
    target_language: Optional[str] = Field("hi", description="Target ISO/BCP47 language code")


class TranslateResponse(BaseModel):
    success: bool = True
    translated_text: str
    source_language: str
    target_language: str
    provider: str


class TTSRequest(BaseModel):
    text: str = Field(..., min_length=1, description="Text to synthesize to speech")
    language: Optional[str] = Field("hi", description="Language code (e.g. 'hi', 'ta', 'te')")
    gender: Optional[str] = Field("female", description="Voice gender preference (female/male)")


class TTSResponse(BaseModel):
    success: bool = True
    audio_base64: Optional[str] = None
    audio_format: str
    language: str
    bcp47: str
    gender: str
    provider: str
    text: Optional[str] = None


class ASRRequest(BaseModel):
    audio_base64: str = Field(..., description="Base64 encoded audio bytes (WAV/MP3)")
    language: Optional[str] = Field("hi", description="Spoken language code")


class ASRResponse(BaseModel):
    success: bool = True
    transcript: str
    language: str
    bcp47: str
    confidence: float
    provider: str


class MultilingualChatRequest(BaseModel):
    question: str = Field(..., min_length=1, description="User question in any Indian language or English")
    language: Optional[str] = Field("hi", description="User's preferred response language (e.g. 'hi', 'ta', 'te')")
    include_tts: Optional[bool] = Field(True, description="Whether to generate TTS audio for the answer")
    gender: Optional[str] = Field("female", description="Preferred voice gender for TTS")


class MultilingualChatResponse(BaseModel):
    success: bool = True
    question: str
    answer: str
    language: str
    language_name: str
    bcp47: str
    found: bool
    empty_state: bool
    sources: List[Dict[str, Any]]
    upload_url: Optional[str] = None
    tts: Optional[TTSResponse] = None


# ---------------------------------------------------------------------------
# API Endpoints
# ---------------------------------------------------------------------------

@router.get(
    "/languages",
    summary="Get all supported Indian languages, dialects, and scripts",
)
def list_languages():
    """
    Returns full catalog of supported Indian languages and regional dialects (e.g. Hindi, Tamil, Telugu,
    Bengali, Marathi, Gujarati, Kannada, Malayalam, Punjabi, Odia, Assamese, Urdu, English)
    with BCP-47 tags, native names, and scripts.
    """
    return {
        "success": True,
        "languages": get_supported_languages(),
    }


@router.post(
    "/translate",
    response_model=TranslateResponse,
    summary="Translate text across Indian languages via Bhashini & Indic models",
)
def translate(payload: TranslateRequest):
    """
    Translates text between Indian languages and English.
    Uses Bhashini ULCA NMT services with resilient Gemini Indic fallback.
    """
    result = translate_text(
        text=payload.text,
        source_lang=payload.source_language or "en",
        target_lang=payload.target_language or "hi",
    )
    return TranslateResponse(
        success=True,
        translated_text=result["translated_text"],
        source_language=result["source_lang"],
        target_language=result["target_lang"],
        provider=result["provider"],
    )


@router.post(
    "/tts",
    response_model=TTSResponse,
    summary="Convert text to speech audio in specified Indian language",
)
def text_to_speech_endpoint(payload: TTSRequest):
    """
    Synthesizes speech audio in Indian languages.
    Returns base64 audio data from Bhashini or client-side Web Speech API playback parameters.
    """
    result = text_to_speech(
        text=payload.text,
        language=payload.language or "hi",
        gender=payload.gender or "female",
    )
    return TTSResponse(
        success=True,
        audio_base64=result.get("audio_base64"),
        audio_format=result.get("audio_format", "wav"),
        language=result["language"],
        bcp47=result["bcp47"],
        gender=result.get("gender", "female"),
        provider=result["provider"],
        text=result.get("text", payload.text),
    )


@router.post(
    "/asr",
    response_model=ASRResponse,
    summary="Transcribe spoken Indian language voice to text",
)
def speech_to_text_endpoint(payload: ASRRequest):
    """
    Transcribes audio bytes to text in the specified Indian language using Bhashini ASR.
    """
    result = speech_to_text(
        audio_base64=payload.audio_base64,
        language=payload.language or "hi",
    )
    return ASRResponse(
        success=True,
        transcript=result["transcript"],
        language=result["language"],
        bcp47=result["bcp47"],
        confidence=result.get("confidence", 0.0),
        provider=result["provider"],
    )


@router.post(
    "/chat",
    response_model=MultilingualChatResponse,
    summary="Multilingual AI Assistant chat with RAG grounding and Voice TTS",
)
async def multilingual_chat(
    payload: MultilingualChatRequest,
    current_user: AuthenticatedUser = Depends(rate_limited_user),
):
    """
    All-in-one conversational endpoint:
    1. Understands questions asked in any Indian language, dialect, or English.
    2. Performs grounded RAG retrieval on candidate's uploaded CV/documents and passport.
    3. Generates the response directly in the candidate's chosen Indian language.
    4. Automatically provides Text-To-Speech (TTS) voice audio for natural voice output.
    """
    target_lang = normalize_language_code(payload.language or "hi")
    try:
        rag_res = answer_for_user(
            user_id=current_user.user_id,
            question=payload.question,
            language=target_lang,
        )
    except KnowledgeServiceError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        )

    tts_data = None
    if payload.include_tts and rag_res.get("answer"):
        try:
            tts_res = text_to_speech(
                text=rag_res["answer"],
                language=target_lang,
                gender=payload.gender or "female",
            )
            tts_data = TTSResponse(
                success=True,
                audio_base64=tts_res.get("audio_base64"),
                audio_format=tts_res.get("audio_format", "wav"),
                language=tts_res["language"],
                bcp47=tts_res["bcp47"],
                gender=tts_res.get("gender", "female"),
                provider=tts_res["provider"],
                text=rag_res["answer"],
            )
        except Exception as exc:
            logger.debug("TTS generation for chat response failed: %s", str(exc))

    return MultilingualChatResponse(
        success=True,
        question=payload.question,
        answer=rag_res["answer"],
        language=rag_res.get("language", target_lang),
        language_name=rag_res.get("language_name", "Hindi"),
        bcp47=rag_res.get("bcp47", "hi-IN"),
        found=rag_res.get("found", False),
        empty_state=rag_res.get("empty_state", False),
        sources=rag_res.get("sources", []),
        upload_url=rag_res.get("upload_url", "/documents"),
        tts=tts_data,
    )
