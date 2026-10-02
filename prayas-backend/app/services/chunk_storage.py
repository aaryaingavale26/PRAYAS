import logging
from typing import Any, Dict, List, Union
import uuid

from app.core.config import settings
from app.db.supabase import get_supabase_client, is_supabase_configured
from app.schemas.chunk import EmbeddedTextChunk

logger = logging.getLogger(__name__)


class ChunkStorageError(Exception):
    """
    Raised when storing, querying, or deleting document chunks fails.
    Guarantees no secret keys, raw database connections, or sensitive data leak.
    """
    pass


def validate_document_id(document_id: str) -> str:
    """
    Validate that a document ID is provided and is a valid UUID string.

    Args:
        document_id: UUID string to validate.

    Returns:
        Cleaned lowercase UUID string.

    Raises:
        ChunkStorageError: If document_id is missing, empty, or not a valid UUID.
    """
    if not document_id or not str(document_id).strip():
        raise ChunkStorageError("Invalid request: document_id is required and cannot be empty.")

    clean_id = str(document_id).strip()
    try:
        uuid.UUID(clean_id)
        return clean_id
    except (ValueError, TypeError, AttributeError):
        raise ChunkStorageError(f"Invalid document_id format: '{clean_id}' is not a valid UUID.")


def save_document_chunks(
    document_id: str,
    chunks: Union[List[EmbeddedTextChunk], List[Dict[str, Any]]],
) -> List[Dict[str, Any]]:
    """
    Save document chunks and their vector embeddings into Supabase pgvector table.

    Args:
        document_id: UUID string of the document.
        chunks: List of EmbeddedTextChunk objects or equivalent dictionaries.

    Returns:
        List of saved chunk database records.

    Raises:
        ChunkStorageError: If inputs are invalid, database is unreachable, or save fails.
    """
    clean_doc_id = validate_document_id(document_id)

    if chunks is None or not isinstance(chunks, list):
        raise ChunkStorageError("chunks must be a list of EmbeddedTextChunk objects or dictionaries.")

    # Empty list handling
    if len(chunks) == 0:
        return []

    # Validate and structure each chunk record
    expected_dim = settings.EMBEDDING_DIMENSION
    records: List[Dict[str, Any]] = []

    for idx, chunk in enumerate(chunks):
        # Extract chunk attributes whether object or dict
        if isinstance(chunk, EmbeddedTextChunk):
            chunk_index = chunk.chunk_index
            content = chunk.text
            start_char = chunk.start_char
            end_char = chunk.end_char
            embedding = chunk.embedding
        elif isinstance(chunk, dict):
            chunk_index = chunk.get("chunk_index")
            content = chunk.get("content") if chunk.get("content") is not None else chunk.get("text")
            start_char = chunk.get("start_char")
            end_char = chunk.get("end_char")
            embedding = chunk.get("embedding")
        else:
            raise ChunkStorageError(
                f"Element at index {idx} must be an EmbeddedTextChunk or dict, got {type(chunk).__name__}."
            )

        # Validate chunk index
        if chunk_index is None or not isinstance(chunk_index, int) or isinstance(chunk_index, bool) or chunk_index < 0:
            raise ChunkStorageError(f"Invalid chunk_index at index {idx}: Must be a non-negative integer.")

        # Validate content text
        if content is None or not isinstance(content, str) or not content.strip():
            raise ChunkStorageError(f"Invalid content at chunk {chunk_index}: Content text cannot be empty.")

        # Validate character offsets
        if start_char is None or not isinstance(start_char, int) or isinstance(start_char, bool) or start_char < 0:
            raise ChunkStorageError(f"Invalid start_char at chunk {chunk_index}: Must be a non-negative integer.")

        if end_char is None or not isinstance(end_char, int) or isinstance(end_char, bool) or end_char < start_char:
            raise ChunkStorageError(f"Invalid end_char at chunk {chunk_index}: Must be greater than or equal to start_char.")

        # Validate vector embedding
        if embedding is None or not isinstance(embedding, (list, tuple)):
            raise ChunkStorageError(f"Invalid embedding at chunk {chunk_index}: Must be a list of floats.")

        if len(embedding) != expected_dim:
            raise ChunkStorageError(
                f"Invalid embedding dimension at chunk {chunk_index}: Expected {expected_dim}, got {len(embedding)}."
            )

        # Convert embedding values to floats
        try:
            float_embedding = [float(val) for val in embedding]
        except (ValueError, TypeError):
            raise ChunkStorageError(f"Invalid embedding values at chunk {chunk_index}: All elements must be numeric floats.")

        records.append({
            "document_id": clean_doc_id,
            "chunk_index": chunk_index,
            "content": content,
            "start_char": start_char,
            "end_char": end_char,
            "embedding": float_embedding,
        })

    # Check Supabase client connectivity
    if not is_supabase_configured():
        raise ChunkStorageError("Database service is unavailable: Supabase credentials not configured.")

    client = get_supabase_client()
    if client is None:
        raise ChunkStorageError("Database service is unavailable: Failed to initialize Supabase client.")

    # Upsert chunks in batch with on_conflict resolution matching unique constraint (document_id, chunk_index)
    try:
        response = client.table(settings.CHUNKS_TABLE).upsert(
            records,
            on_conflict="document_id,chunk_index",
        ).execute()

        if not response or response.data is None:
            raise ChunkStorageError("Failed to save document chunks: No data returned from database.")

        return response.data

    except ChunkStorageError:
        raise
    except Exception as exc:
        err_msg = str(exc).lower()
        if "foreign key" in err_msg or "violates foreign key" in err_msg:
            raise ChunkStorageError(
                f"Failed to save document chunks: Document with ID '{clean_doc_id}' does not exist."
            ) from None
        if "duplicate key" in err_msg or "unique constraint" in err_msg:
            raise ChunkStorageError(
                f"Failed to save document chunks: Duplicate chunk index detected for document '{clean_doc_id}'."
            ) from None

        raise ChunkStorageError("Database error occurred while saving document chunks.") from None


def get_document_chunks(document_id: str) -> List[Dict[str, Any]]:
    """
    Retrieve all chunks for a given document ID, ordered sequentially by chunk_index.

    Args:
        document_id: UUID of the document.

    Returns:
        List of chunk records ordered by chunk_index ascending.

    Raises:
        ChunkStorageError: If document_id is invalid or retrieval fails.
    """
    clean_doc_id = validate_document_id(document_id)

    if not is_supabase_configured():
        raise ChunkStorageError("Database service is unavailable: Supabase credentials not configured.")

    client = get_supabase_client()
    if client is None:
        raise ChunkStorageError("Database service is unavailable: Failed to initialize Supabase client.")

    try:
        response = (
            client.table(settings.CHUNKS_TABLE)
            .select("*")
            .eq("document_id", clean_doc_id)
            .order("chunk_index", desc=False)
            .execute()
        )
        return response.data or []

    except ChunkStorageError:
        raise
    except Exception:
        raise ChunkStorageError("Database error occurred while retrieving document chunks.") from None


def delete_document_chunks(document_id: str) -> int:
    """
    Delete all chunks associated with a document ID.

    Args:
        document_id: UUID of the document.

    Returns:
        Number of deleted chunk records.

    Raises:
        ChunkStorageError: If document_id is invalid or database deletion fails.
    """
    clean_doc_id = validate_document_id(document_id)

    if not is_supabase_configured():
        raise ChunkStorageError("Database service is unavailable: Supabase credentials not configured.")

    client = get_supabase_client()
    if client is None:
        raise ChunkStorageError("Database service is unavailable: Failed to initialize Supabase client.")

    try:
        response = (
            client.table(settings.CHUNKS_TABLE)
            .delete()
            .eq("document_id", clean_doc_id)
            .execute()
        )
        deleted_count = len(response.data) if response and response.data else 0
        return deleted_count

    except ChunkStorageError:
        raise
    except Exception:
        raise ChunkStorageError("Database error occurred while deleting document chunks.") from None
