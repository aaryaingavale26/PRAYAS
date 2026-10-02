import logging
from typing import List, Optional

from app.schemas.chunk import TextChunk

logger = logging.getLogger(__name__)


def chunk_document_text(
    text: Optional[str],
    chunk_size: int = 1000,
    chunk_overlap: int = 200,
) -> List[TextChunk]:
    """
    Split document text into smaller chunks with character positions and overlap.

    Args:
        text: The source plain text to chunk.
        chunk_size: Maximum character length for each chunk (default 1000).
        chunk_overlap: Number of characters to overlap between consecutive chunks (default 200).

    Returns:
        List of TextChunk objects containing chunk_index, text, start_char, and end_char.

    Raises:
        ValueError: If chunk_size <= 0, chunk_overlap < 0, or chunk_overlap >= chunk_size.
    """
    # 1. Validate chunk size and overlap parameters
    if isinstance(chunk_size, bool) or not isinstance(chunk_size, int) or chunk_size <= 0:
        raise ValueError(f"chunk_size must be a positive integer, got {chunk_size}")

    if isinstance(chunk_overlap, bool) or not isinstance(chunk_overlap, int) or chunk_overlap < 0:
        raise ValueError(f"chunk_overlap must be a non-negative integer, got {chunk_overlap}")

    if chunk_overlap >= chunk_size:
        raise ValueError(
            f"chunk_overlap ({chunk_overlap}) must be strictly less than chunk_size ({chunk_size})"
        )

    # 2. Handle empty, whitespace-only, or invalid input safely
    if text is None or not isinstance(text, str):
        return []

    if not text.strip():
        return []

    total_len = len(text)

    # 3. Short text produces a single chunk
    if total_len <= chunk_size:
        return [
            TextChunk(
                chunk_index=0,
                text=text,
                start_char=0,
                end_char=total_len,
            )
        ]

    # 4. Multi-chunk sliding window segmentation
    chunks: List[TextChunk] = []
    step = chunk_size - chunk_overlap
    start = 0
    chunk_idx = 0

    while start < total_len:
        end = min(start + chunk_size, total_len)
        chunk_slice = text[start:end]

        chunks.append(
            TextChunk(
                chunk_index=chunk_idx,
                text=chunk_slice,
                start_char=start,
                end_char=end,
            )
        )
        chunk_idx += 1

        if end >= total_len:
            break

        start += step

    return chunks


def chunk_text(
    text: Optional[str],
    chunk_size: int = 1000,
    chunk_overlap: int = 200,
) -> List[str]:
    """
    Split document text into a list of chunk strings.

    Args:
        text: The source plain text to chunk.
        chunk_size: Maximum character length for each chunk (default 1000).
        chunk_overlap: Number of characters to overlap between consecutive chunks (default 200).

    Returns:
        List of chunk strings.
    """
    chunks = chunk_document_text(text, chunk_size=chunk_size, chunk_overlap=chunk_overlap)
    return [c.text for c in chunks]


# Convenience aliases for caller flexibility and internal integration
create_chunks = chunk_document_text
chunk_extracted_text = chunk_document_text
