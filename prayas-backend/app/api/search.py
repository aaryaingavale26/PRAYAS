import logging
from fastapi import APIRouter, Depends, HTTPException, status

from app.core.auth import AuthenticatedUser, get_current_user
from app.schemas.search import ChunkSearchResult, SemanticSearchRequest, SemanticSearchResponse
from app.services.semantic_search import SemanticSearchError, search_similar_chunks

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/search", tags=["Semantic Search"])


@router.post(
    "",
    response_model=SemanticSearchResponse,
    status_code=status.HTTP_200_OK,
    summary="Semantic vector search across document chunks",
)
async def semantic_search_endpoint(
    payload: SemanticSearchRequest,
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Search document chunks by vector similarity using Gemini embeddings and pgvector.
    Requires authentication. Search is strictly scoped to documents owned by the authenticated user.
    """
    try:
        raw_results = search_similar_chunks(
            query=payload.query,
            limit=payload.limit,
            document_id=payload.document_id,
            user_id=current_user.user_id,
        )

        formatted_results = [
            ChunkSearchResult(
                id=r["id"],
                document_id=r["document_id"],
                chunk_index=r["chunk_index"],
                content=r["content"],
                start_char=r["start_char"],
                end_char=r["end_char"],
                similarity=r["similarity"],
            )
            for r in raw_results
        ]

        return SemanticSearchResponse(
            query=payload.query,
            results=formatted_results,
        )

    except SemanticSearchError as exc:
        err_msg = str(exc)
        logger.warning("Semantic search failed: %s", err_msg)

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
        if "invalid" in err_msg.lower() or "limit must be" in err_msg.lower() or "empty" in err_msg.lower():
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
            detail="An error occurred while executing vector similarity search.",
        )
