import logging
from fastapi import APIRouter, Depends, HTTPException, status

from app.core.auth import AuthenticatedUser, get_current_user
from app.schemas.simplification import SimplificationRequest, SimplificationResponse
from app.services.text_simplifier import SimplificationServiceError, simplify_text

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Text Simplification"])


@router.post(
    "/simplify",
    response_model=SimplificationResponse,
    status_code=status.HTTP_200_OK,
    summary="Simplify complex career and job application text",
)
async def simplify_text_endpoint(
    payload: SimplificationRequest,
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Simplify complex or academic text using Gemini in clear, accessible language
    while strictly preserving meaning, requirements, dates, and numbers.
    Requires authentication.

    Supports 'basic' (default) and 'very_simple' simplification levels.
    """
    try:
        result = simplify_text(
            text=payload.text,
            level=payload.level,
        )

        return SimplificationResponse(
            original_text=result["original_text"],
            simplified_text=result["simplified_text"],
            level=result["level"],
        )

    except SimplificationServiceError as exc:
        err_msg = str(exc)
        logger.warning("Text simplification failed: %s", err_msg)

        if "not configured" in err_msg.lower():
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=err_msg,
            )
        if (
            "invalid" in err_msg.lower()
            or "exceeds" in err_msg.lower()
            or "empty" in err_msg.lower()
        ):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=err_msg,
            )

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while simplifying the text.",
        )
