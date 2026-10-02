import logging
from typing import Optional
from google import genai
from app.core.config import settings

logger = logging.getLogger(__name__)

# Cached singleton client instance for lazy initialization
_gemini_client: Optional[genai.Client] = None


class GeminiServiceError(Exception):
    """
    Raised when an operation against the Google Gemini API fails or is misconfigured.
    Guarantees no secret keys or internal tracebacks are leaked.
    """
    pass


def is_gemini_configured() -> bool:
    """
    Check whether a Gemini API key is configured.
    """
    return bool(settings.GEMINI_API_KEY and str(settings.GEMINI_API_KEY).strip())


def get_gemini_client() -> Optional[genai.Client]:
    """
    Retrieve the lazily-initialized Google Gen AI client.
    Returns None if the API key is not configured.
    """
    global _gemini_client

    if not is_gemini_configured():
        return None

    if _gemini_client is None:
        try:
            api_key = str(settings.GEMINI_API_KEY).strip()
            _gemini_client = genai.Client(api_key=api_key)
        except Exception:
            # Mask credentials on client initialization errors
            return None

    return _gemini_client


def generate_text(prompt: str, model: Optional[str] = None) -> str:
    """
    Generate text using the configured Google Gemini model.

    Args:
        prompt: User or system prompt string.
        model: Optional override for the model identifier (defaults to settings.GEMINI_MODEL).

    Returns:
        Generated text string.

    Raises:
        GeminiServiceError: If the prompt is invalid, client is unconfigured,
                            or generation fails.
    """
    if not prompt or not prompt.strip():
        raise GeminiServiceError("Prompt cannot be empty or whitespace only.")

    if not is_gemini_configured():
        raise GeminiServiceError(
            "Gemini API is not configured. Please set GEMINI_API_KEY in backend/.env."
        )

    client = get_gemini_client()
    if client is None:
        raise GeminiServiceError("Failed to initialize Google Gen AI client.")

    target_model = model or settings.GEMINI_MODEL

    try:
        response = client.models.generate_content(
            model=target_model,
            contents=prompt.strip(),
        )

        if not response or not hasattr(response, "text") or response.text is None:
            raise GeminiServiceError("Gemini model returned an empty response.")

        return response.text.strip()

    except GeminiServiceError:
        raise
    except Exception as exc:
        err_msg = str(exc)
        # Check for model not found / quota / permission issues cleanly without echoing secrets
        if "404" in err_msg or "not found" in err_msg.lower():
            raise GeminiServiceError(f"Gemini model '{target_model}' was not found or is unavailable.") from None
        if "429" in err_msg or "quota" in err_msg.lower():
            raise GeminiServiceError("Gemini API quota exceeded or rate limit reached.") from None
        if "401" in err_msg or "403" in err_msg or "api_key" in err_msg.lower() or "permission" in err_msg.lower():
            raise GeminiServiceError("Authentication failed: Invalid or unauthorized Gemini API key.") from None

        raise GeminiServiceError("Failed to generate response from Gemini API.") from None
