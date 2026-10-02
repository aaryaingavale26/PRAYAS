import logging
from fastapi import APIRouter, Depends, HTTPException, status

from app.core.auth import AuthenticatedUser, get_current_user
from app.core.config import settings
from app.schemas.gemini import GeminiTestRequest, GeminiTestResponse
from app.services.gemini_service import (
    GeminiServiceError,
    generate_text,
    is_gemini_configured,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/gemini", tags=["Gemini AI"])


@router.post(
    "/test",
    response_model=GeminiTestResponse,
    status_code=status.HTTP_200_OK,
    summary="Test Google Gemini text generation",
)
async def test_gemini_generation(
    payload: GeminiTestRequest,
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Development endpoint to test Google Gemini integration.
    Generates a response from the configured model based on the provided prompt.
    Requires authentication and is restricted to development environments.
    """
    if settings.ENVIRONMENT != "development" and not settings.DEBUG:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="The Gemini test endpoint is only available in development environments.",
        )
    if not payload.prompt or not payload.prompt.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Prompt cannot be empty or whitespace only.",
        )

    if not is_gemini_configured():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Gemini API is not configured. Please set GEMINI_API_KEY in backend/.env.",
        )

    try:
        generated_content = generate_text(payload.prompt)
        return GeminiTestResponse(
            success=True,
            response=generated_content,
        )
    except GeminiServiceError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(exc),
        )
