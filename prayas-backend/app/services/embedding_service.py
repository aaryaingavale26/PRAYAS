import logging
from typing import List, Optional

from app.core.config import settings
from app.schemas.chunk import EmbeddedTextChunk, TextChunk
from app.services.gemini_service import get_gemini_client, is_gemini_configured

logger = logging.getLogger(__name__)


class EmbeddingServiceError(Exception):
    """
    Raised when embedding generation fails or is misconfigured.
    Guarantees no secret keys or internal tracebacks are leaked.
    """
    pass


def generate_embeddings(
    texts: List[str],
    model: Optional[str] = None,
) -> List[List[float]]:
    """
    Generate vector embeddings for a list of text strings using Google Gemini.

    Args:
        texts: List of text strings to embed.
        model: Optional model identifier override (defaults to settings.GEMINI_EMBEDDING_MODEL).

    Returns:
        List of embedding vectors, where each vector is a list of floats.

    Raises:
        EmbeddingServiceError: If input is invalid, API is unconfigured, or generation fails.
    """
    # 1. Input validation
    if texts is None or not isinstance(texts, list):
        raise EmbeddingServiceError("Input texts must be a list of strings.")

    if len(texts) == 0:
        return []

    for idx, t in enumerate(texts):
        if not isinstance(t, str):
            raise EmbeddingServiceError(
                f"Element at index {idx} must be a string, got {type(t).__name__}."
            )
        if not t.strip():
            raise EmbeddingServiceError(
                f"Element at index {idx} cannot be empty or whitespace only."
            )

    # 2. Check configuration
    if not is_gemini_configured():
        raise EmbeddingServiceError(
            "Gemini API is not configured. Please set GEMINI_API_KEY in backend/.env."
        )

    client = get_gemini_client()
    if client is None:
        raise EmbeddingServiceError("Failed to initialize Google Gen AI client.")

    target_model = model or settings.GEMINI_EMBEDDING_MODEL

    # 3. Call Google Gen AI API
    try:
        response = client.models.embed_content(
            model=target_model,
            contents=texts,
        )

        if not response:
            raise EmbeddingServiceError("Gemini embedding model returned an empty response.")

        embeddings_list: List[List[float]] = []

        if hasattr(response, "embeddings") and response.embeddings:
            for item in response.embeddings:
                if hasattr(item, "values") and item.values is not None:
                    embeddings_list.append([float(val) for val in item.values])
                elif isinstance(item, (list, tuple)):
                    embeddings_list.append([float(val) for val in item])
                else:
                    raise EmbeddingServiceError("Invalid embedding structure received from Gemini API.")
        elif hasattr(response, "embedding") and response.embedding:
            item = response.embedding
            if hasattr(item, "values") and item.values is not None:
                embeddings_list.append([float(val) for val in item.values])
            elif isinstance(item, (list, tuple)):
                embeddings_list.append([float(val) for val in item])
            else:
                raise EmbeddingServiceError("Invalid embedding structure received from Gemini API.")
        else:
            raise EmbeddingServiceError("Gemini embedding model returned no embeddings.")

        if len(embeddings_list) != len(texts):
            raise EmbeddingServiceError(
                f"Expected {len(texts)} embeddings, but received {len(embeddings_list)}."
            )

        return embeddings_list

    except EmbeddingServiceError:
        raise
    except Exception as exc:
        err_msg = str(exc)
        if "404" in err_msg or "not found" in err_msg.lower():
            raise EmbeddingServiceError(
                f"Gemini embedding model '{target_model}' was not found or is unavailable."
            ) from None
        if "429" in err_msg or "quota" in err_msg.lower():
            raise EmbeddingServiceError(
                "Gemini API quota exceeded or rate limit reached."
            ) from None
        if "401" in err_msg or "403" in err_msg or "api_key" in err_msg.lower() or "permission" in err_msg.lower():
            raise EmbeddingServiceError(
                "Authentication failed: Invalid or unauthorized Gemini API key."
            ) from None

        raise EmbeddingServiceError("Failed to generate embeddings from Gemini API.") from None


def generate_embedding(
    text: str,
    model: Optional[str] = None,
) -> List[float]:
    """
    Generate a vector embedding for a single text string.

    Args:
        text: Text string to embed.
        model: Optional model identifier override.

    Returns:
        List of floating-point values representing the vector embedding.

    Raises:
        EmbeddingServiceError: If input is invalid or generation fails.
    """
    if text is None or not isinstance(text, str):
        raise EmbeddingServiceError("Input text must be a valid string.")

    if not text.strip():
        raise EmbeddingServiceError("Text cannot be empty or whitespace only.")

    results = generate_embeddings([text], model=model)
    if not results:
        raise EmbeddingServiceError("Failed to generate embedding for the provided text.")

    return results[0]


def embed_text_chunks(
    chunks: List[TextChunk],
    model: Optional[str] = None,
) -> List[EmbeddedTextChunk]:
    """
    Generate vector embeddings for a list of TextChunk objects, preserving all chunk metadata.

    Args:
        chunks: List of TextChunk instances to embed.
        model: Optional model identifier override.

    Returns:
        List of EmbeddedTextChunk objects with embedding vectors attached.

    Raises:
        EmbeddingServiceError: If inputs are invalid or embedding generation fails.
    """
    if chunks is None or not isinstance(chunks, list):
        raise EmbeddingServiceError("Input chunks must be a list of TextChunk objects.")

    if len(chunks) == 0:
        return []

    for idx, chunk in enumerate(chunks):
        if not isinstance(chunk, TextChunk):
            raise EmbeddingServiceError(
                f"Element at index {idx} is not a TextChunk instance (got {type(chunk).__name__})."
            )

    texts = [chunk.text for chunk in chunks]
    embeddings = generate_embeddings(texts, model=model)

    embedded_chunks: List[EmbeddedTextChunk] = []
    for chunk, emb in zip(chunks, embeddings):
        embedded_chunks.append(
            EmbeddedTextChunk(
                chunk_index=chunk.chunk_index,
                text=chunk.text,
                start_char=chunk.start_char,
                end_char=chunk.end_char,
                embedding=emb,
            )
        )

    return embedded_chunks


# Convenience alias for caller flexibility
embed_chunks = embed_text_chunks
