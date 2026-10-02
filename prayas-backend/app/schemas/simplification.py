from enum import Enum
from typing import Optional
from pydantic import BaseModel, Field, field_validator

MAX_SIMPLIFY_TEXT_LENGTH = 10000


class SimplificationLevel(str, Enum):
    BASIC = "basic"
    VERY_SIMPLE = "very_simple"


class SimplificationRequest(BaseModel):
    """
    Request payload for text simplification using Gemini.
    """
    text: str = Field(
        ...,
        min_length=1,
        max_length=MAX_SIMPLIFY_TEXT_LENGTH,
        description=f"Original text to simplify (maximum {MAX_SIMPLIFY_TEXT_LENGTH} characters)",
    )
    level: Optional[SimplificationLevel] = Field(
        default=SimplificationLevel.BASIC,
        description="Simplification level ('basic' or 'very_simple')",
    )

    @field_validator("text")
    @classmethod
    def validate_text(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("Text cannot be empty or whitespace only.")
        clean_text = v.strip()
        if len(clean_text) > MAX_SIMPLIFY_TEXT_LENGTH:
            raise ValueError(
                f"Text length exceeds maximum allowed limit of {MAX_SIMPLIFY_TEXT_LENGTH} characters."
            )
        return clean_text

    model_config = {
        "json_schema_extra": {
            "example": {
                "text": "The candidate must possess demonstrable proficiency in architecting and orchestrating asynchronous microservices utilizing Python and FastAPI.",
                "level": "basic",
            }
        }
    }


class SimplificationResponse(BaseModel):
    """
    Response payload containing original text, simplified text, and applied level.
    """
    original_text: str = Field(description="The submitted original text")
    simplified_text: str = Field(description="The simplified and accessible rewritten text")
    level: str = Field(description="The simplification level used ('basic' or 'very_simple')")

    model_config = {
        "json_schema_extra": {
            "example": {
                "original_text": "The candidate must possess demonstrable proficiency in architecting and orchestrating asynchronous microservices utilizing Python and FastAPI.",
                "simplified_text": "The applicant must know how to build fast Python and FastAPI web services.",
                "level": "basic",
            }
        }
    }
