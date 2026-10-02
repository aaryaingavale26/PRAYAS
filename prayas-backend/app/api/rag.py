import logging
from fastapi import APIRouter, Depends, HTTPException, status

from app.core.auth import AuthenticatedUser, get_current_user
from app.schemas.rag import RAGRequest, RAGResponse, RAGSourceChunk
from app.services.rag_service import RAGServiceError, answer_question

logger = logging.getLogger(__name__)

router = APIRouter(tags=["RAG / Q&A"])


@router.post(
    "/ask",
    response_model=RAGResponse,
    status_code=status.HTTP_200_OK,
    summary="Ask a question answered via RAG grounded on uploaded document content",
)
async def ask_question_endpoint(
    payload: RAGRequest,
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Answer a question using Retrieval-Augmented Generation (RAG).
    Requires authentication. RAG search is strictly restricted to documents owned by the authenticated user.
    """
    try:
        result = answer_question(
            question=payload.question,
            document_id=payload.document_id,
            limit=payload.limit,
            user_id=current_user.user_id,
        )

        formatted_sources = [
            RAGSourceChunk(
                id=s["id"],
                document_id=s["document_id"],
                chunk_index=s["chunk_index"],
                content=s["content"],
                start_char=s["start_char"],
                end_char=s["end_char"],
                similarity=s["similarity"],
            )
            for s in result.get("sources", [])
        ]

        return RAGResponse(
            question=result["question"],
            answer=result["answer"],
            sources=formatted_sources,
            has_context=result["has_context"],
        )

    except RAGServiceError as exc:
        err_msg = str(exc)
        logger.warning("RAG answer generation failed: %s", err_msg)

        if "not found" in err_msg.lower():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=err_msg,
            )
        if "not configured" in err_msg.lower():
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=err_msg,
            )
        if (
            "invalid" in err_msg.lower()
            or "limit must be" in err_msg.lower()
            or "empty" in err_msg.lower()
        ):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=err_msg,
            )
        if "not installed" in err_msg.lower():
            raise HTTPException(
                status_code=status.HTTP_501_NOT_IMPLEMENTED,
                detail=err_msg,
            )

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while generating the answer from documents.",
        )
