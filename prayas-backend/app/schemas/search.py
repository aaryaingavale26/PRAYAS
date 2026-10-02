from typing import List, Optional
from pydantic import BaseModel, Field, field_validator
import uuid


class ChunkSearchResult(BaseModel):
    """
    Schema representing a matching document chunk returned from vector similarity search.
    Note: Does NOT expose raw embedding vectors.
    """
    id: str = Field(description="Unique UUID of the chunk record")
    document_id: str = Field(description="UUID of the parent document")
    chunk_index: int = Field(ge=0, description="Sequential position of chunk within the document")
    content: str = Field(description="Extracted text content of the chunk")
    start_char: int = Field(ge=0, description="Character start offset in original document")
    end_char: int = Field(ge=0, description="Character end offset in original document")
    similarity: float = Field(description="Cosine similarity score (higher = closer match)")

    model_config = {
        "json_schema_extra": {
            "example": {
                "id": "123e4567-e89b-12d3-a456-426614174000",
                "document_id": "987fcdeb-51a2-43f1-b890-123456789abc",
                "chunk_index": 0,
                "content": "Experienced software engineer specializing in accessible frontend interfaces...",
                "start_char": 0,
                "end_char": 1000,
                "similarity": 0.8845,
            }
        }
    }


class SemanticSearchRequest(BaseModel):
    """
    Request payload for semantic vector search across document chunks.
    """
    query: str = Field(..., min_length=1, description="Natural language search query")
    limit: int = Field(default=5, ge=1, le=20, description="Maximum number of similar chunks to return (1-20)")
    document_id: Optional[str] = Field(default=None, description="Optional UUID to restrict search to a single document")

    @field_validator("query")
    @classmethod
    def validate_query(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("Query string cannot be empty or whitespace only.")
        return v.strip()

    @field_validator("document_id")
    @classmethod
    def validate_document_id(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v.strip():
            clean_id = v.strip()
            try:
                uuid.UUID(clean_id)
                return clean_id
            except (ValueError, TypeError):
                raise ValueError(f"document_id must be a valid UUID string, got: '{clean_id}'")
        return None

    model_config = {
        "json_schema_extra": {
            "example": {
                "query": "What experience does the candidate have with WCAG accessibility guidelines?",
                "limit": 5,
                "document_id": "987fcdeb-51a2-43f1-b890-123456789abc",
            }
        }
    }


class SemanticSearchResponse(BaseModel):
    """
    Response payload containing query and ordered matching chunks.
    """
    query: str = Field(description="The submitted search query")
    results: List[ChunkSearchResult] = Field(default_factory=list, description="Ordered list of matching chunks by similarity")

    model_config = {
        "json_schema_extra": {
            "example": {
                "query": "What experience does the candidate have with WCAG accessibility guidelines?",
                "results": [
                    {
                        "id": "123e4567-e89b-12d3-a456-426614174000",
                        "document_id": "987fcdeb-51a2-43f1-b890-123456789abc",
                        "chunk_index": 1,
                        "content": "Audited React components for WCAG 2.1 AA compliance and implemented ARIA live regions...",
                        "start_char": 800,
                        "end_char": 1600,
                        "similarity": 0.8921,
                    }
                ],
            }
        }
    }
