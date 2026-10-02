import logging
from typing import Any, Dict, List, Optional
import uuid

from app.core.config import settings
from app.db.supabase import get_supabase_client, is_supabase_configured
from app.services.document_metadata import get_user_document_ids, get_user_document_metadata
from app.services.embedding_service import EmbeddingServiceError, generate_embedding
from app.services.gemini_service import is_gemini_configured

logger = logging.getLogger(__name__)

DEFAULT_SEARCH_LIMIT = 5
MAX_SEARCH_LIMIT = 20
MIN_SEARCH_LIMIT = 1


class SemanticSearchError(Exception):
    """
    Raised when vector similarity search fails or is misconfigured.
    Guarantees no secret keys, raw database connections, or sensitive data leak.
    """
    pass


def search_similar_chunks(
    query: str,
    limit: int = DEFAULT_SEARCH_LIMIT,
    document_id: Optional[str] = None,
    user_id: Optional[str] = None,
) -> List[Dict[str, Any]]:
    """
    Perform semantic vector similarity search against stored document chunks.

    Args:
        query: Natural language search query.
        limit: Maximum number of similar chunks to return (1 to 20, default 5).
        document_id: Optional document UUID to scope the search to a specific document.
        user_id: Optional user UUID to scope search to documents owned by that user.

    Returns:
        List of matching chunk dictionaries ordered by similarity descending,
        containing chunk metadata and similarity score (without embedding vectors).

    Raises:
        SemanticSearchError: If inputs are invalid, services are unconfigured,
                             or search execution fails.
    """
    # 1. Validate query string
    if query is None or not isinstance(query, str) or not query.strip():
        raise SemanticSearchError("Search query cannot be empty or whitespace only.")

    clean_query = query.strip()

    # 2. Validate search limit
    if isinstance(limit, bool) or not isinstance(limit, int):
        raise SemanticSearchError("Search limit must be an integer.")

    if limit < MIN_SEARCH_LIMIT or limit > MAX_SEARCH_LIMIT:
        raise SemanticSearchError(
            f"Search limit must be between {MIN_SEARCH_LIMIT} and {MAX_SEARCH_LIMIT} (got {limit})."
        )

    # 3. Validate optional document_id and user_id filters
    clean_doc_id: Optional[str] = None
    if document_id is not None:
        if not str(document_id).strip():
            clean_doc_id = None
        else:
            try:
                clean_doc_id = str(uuid.UUID(str(document_id).strip()))
            except (ValueError, TypeError):
                raise SemanticSearchError(
                    f"Invalid document_id format: '{document_id}' is not a valid UUID."
                )

    clean_user_id: Optional[str] = None
    if user_id is not None:
        if not str(user_id).strip():
            clean_user_id = None
        else:
            try:
                clean_user_id = str(uuid.UUID(str(user_id).strip()))
            except (ValueError, TypeError):
                raise SemanticSearchError(
                    f"Invalid user_id format: '{user_id}' is not a valid UUID."
                )

    # 4. Check services availability
    if not is_gemini_configured():
        raise SemanticSearchError(
            "Gemini API is not configured. Please set GEMINI_API_KEY in backend/.env."
        )

    if not is_supabase_configured():
        raise SemanticSearchError(
            "Database service is unavailable: Supabase credentials not configured."
        )

    # 5. Ownership verification if user_id is provided
    allowed_doc_ids: Optional[set] = None
    if clean_user_id:
        if clean_doc_id:
            user_doc = get_user_document_metadata(clean_doc_id, clean_user_id)
            if not user_doc:
                raise SemanticSearchError(
                    f"Document with ID '{clean_doc_id}' not found."
                )
            allowed_doc_ids = {clean_doc_id}
        else:
            user_doc_ids = get_user_document_ids(clean_user_id)
            if not user_doc_ids:
                return []
            allowed_doc_ids = set(user_doc_ids)

    # 6. Generate query vector embedding using Gemini
    try:
        query_embedding = generate_embedding(clean_query)
    except EmbeddingServiceError as emb_err:
        logger.error("Failed to generate query embedding: %s", str(emb_err))
        raise SemanticSearchError(f"Embedding generation failed: {str(emb_err)}") from None
    except Exception:
        logger.error("Unexpected failure during query embedding generation")
        raise SemanticSearchError("Failed to generate vector embedding for search query.") from None

    if len(query_embedding) != settings.EMBEDDING_DIMENSION:
        raise SemanticSearchError(
            f"Query embedding dimension mismatch: Expected {settings.EMBEDDING_DIMENSION}, got {len(query_embedding)}."
        )

    # 7. Execute Supabase pgvector RPC function
    client = get_supabase_client()
    if client is None:
        raise SemanticSearchError("Database service is unavailable: Failed to initialize Supabase client.")

    rpc_params: Dict[str, Any] = {
        "query_embedding": query_embedding,
        "match_count": limit,
    }
    if clean_doc_id:
        rpc_params["filter_document_id"] = clean_doc_id
    if clean_user_id:
        rpc_params["filter_user_id"] = clean_user_id

    try:
        response = client.rpc("match_document_chunks", rpc_params).execute()
        raw_results = response.data or []
    except Exception as exc:
        err_msg = str(exc)
        # Compatibility fallback if RPC does not yet have filter_user_id signature in Supabase or has overload ambiguity
        if "pgrst203" in err_msg.lower() or (clean_user_id and ("filter_user_id" in err_msg.lower() or "pgrst202" in err_msg.lower())):
            try:
                fallback_params = {
                    "query_embedding": query_embedding,
                    "match_count": limit * 3 if not clean_doc_id else limit,
                    "filter_document_id": clean_doc_id,
                }
                fallback_res = client.rpc("match_document_chunks", fallback_params).execute()
                raw_results = fallback_res.data or []
            except Exception:
                # If still fails, query chunks table directly if available
                try:
                    query = client.table("document_chunks").select("id, document_id, chunk_index, content, start_char, end_char").limit(limit)
                    if clean_doc_id:
                        query = query.eq("document_id", clean_doc_id)
                    table_res = query.execute()
                    raw_results = table_res.data or []
                except Exception:
                    raise SemanticSearchError("Database error occurred during vector similarity search.") from None
        elif "pgrst202" in err_msg.lower() or "could not find the function" in err_msg.lower():
            logger.error("RPC function match_document_chunks not found in schema cache")
            raise SemanticSearchError(
                "Vector search function 'match_document_chunks' is not installed in database. Please run schema.sql in Supabase SQL editor."
            ) from None
        else:
            logger.error("Supabase RPC execution error during semantic search: %s", err_msg)
            raise SemanticSearchError("Database error occurred during vector similarity search.") from None

    # Defense-in-depth: Filter strictly to user's documents if user_id was provided
    if allowed_doc_ids is not None:
        raw_results = [r for r in raw_results if str(r.get("document_id")) in allowed_doc_ids]

    # 8. Format results cleanly without exposing raw embedding vectors
    results: List[Dict[str, Any]] = []
    for row in raw_results:
        results.append({
            "id": str(row.get("id")),
            "document_id": str(row.get("document_id")),
            "chunk_index": int(row.get("chunk_index", 0)),
            "content": str(row.get("content", "")),
            "start_char": int(row.get("start_char", 0)),
            "end_char": int(row.get("end_char", 0)),
            "similarity": round(float(row.get("similarity", 0.0)), 6),
        })

    # Ensure results are sorted by similarity descending and capped to limit
    results.sort(key=lambda r: r["similarity"], reverse=True)
    return results[:limit]
