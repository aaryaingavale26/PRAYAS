import logging
from typing import Any, Dict, Optional

from app.schemas.chunk import DocumentIndexSummary
from app.services.chunk_storage import (
    ChunkStorageError,
    delete_document_chunks,
    save_document_chunks,
    validate_document_id,
)
from app.services.embedding_service import (
    EmbeddingServiceError,
    embed_text_chunks,
)
from app.services.text_chunker import chunk_document_text

logger = logging.getLogger(__name__)


class DocumentIndexingError(Exception):
    """
    Raised when document text chunking, embedding generation, or chunk storage fails.
    Guarantees no secret keys, raw database connections, or document text leak in errors.
    """
    pass


def index_document(
    document_id: str,
    extracted_text: Optional[str],
) -> Dict[str, Any]:
    """
    Segment extracted document text into chunks, generate vector embeddings,
    and persist the resulting chunks and vectors in Supabase pgvector storage.

    Args:
        document_id: UUID of the document.
        extracted_text: Plain text extracted from the document.

    Returns:
        Dictionary summary containing document_id, chunks_count, embeddings_count,
        success status, and detail message.

    Raises:
        DocumentIndexingError: If document ID is invalid, or if chunking, embedding,
                               or storage operations fail.
    """
    # 1. Validate document ID format
    try:
        clean_doc_id = validate_document_id(document_id)
    except ChunkStorageError as err:
        raise DocumentIndexingError(str(err)) from None

    # 2. Handle empty or whitespace-only text safely
    if not extracted_text or not extracted_text.strip():
        logger.info("Skipping indexing for document %s: extracted text is empty.", clean_doc_id)
        return {
            "document_id": clean_doc_id,
            "chunks_count": 0,
            "embeddings_count": 0,
            "success": True,
            "message": "No text content to index.",
        }

    # 3. Segment extracted text into chunks with character offsets
    try:
        chunks = chunk_document_text(extracted_text)
    except Exception as exc:
        logger.error("Failed to chunk text for document %s", clean_doc_id)
        raise DocumentIndexingError("Failed to segment document text into chunks.") from None

    if not chunks:
        return {
            "document_id": clean_doc_id,
            "chunks_count": 0,
            "embeddings_count": 0,
            "success": True,
            "message": "No chunks generated from extracted text.",
        }

    # 4. Generate vector embeddings for all chunks
    try:
        embedded_chunks = embed_text_chunks(chunks)
    except EmbeddingServiceError as exc:
        logger.error("Embedding generation failed for document %s: %s", clean_doc_id, str(exc))
        raise DocumentIndexingError(f"Embedding generation failed: {str(exc)}") from None
    except Exception:
        logger.error("Unexpected embedding failure for document %s", clean_doc_id)
        raise DocumentIndexingError("Failed to generate vector embeddings for document chunks.") from None

    # 5. Persist chunks in vector storage with conflict handling and rollback on failure
    try:
        # Clear any prior chunks for this document to ensure clean retries
        delete_document_chunks(clean_doc_id)

        # Batch upsert chunks with embeddings
        save_document_chunks(clean_doc_id, embedded_chunks)

    except ChunkStorageError as exc:
        logger.error("Chunk storage failed for document %s: %s", clean_doc_id, str(exc))
        # Ensure partial/corrupt chunk state is cleaned up
        try:
            delete_document_chunks(clean_doc_id)
        except Exception:
            pass
        raise DocumentIndexingError(f"Failed to store document chunks: {str(exc)}") from None
    except Exception:
        logger.error("Unexpected storage failure for document %s", clean_doc_id)
        try:
            delete_document_chunks(clean_doc_id)
        except Exception:
            pass
        raise DocumentIndexingError("Failed to store document chunks into vector database.") from None

    # 6. Return clear summary
    return {
        "document_id": clean_doc_id,
        "chunks_count": len(chunks),
        "embeddings_count": len(embedded_chunks),
        "success": True,
        "message": f"Successfully indexed {len(chunks)} chunks.",
    }
