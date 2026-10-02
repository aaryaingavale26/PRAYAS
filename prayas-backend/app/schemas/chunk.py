from pydantic import BaseModel, Field


class TextChunk(BaseModel):
    """
    Schema representing a segmented text chunk from a document.
    """
    chunk_index: int = Field(..., ge=0, description="Zero-based sequential position of the chunk")
    text: str = Field(..., description="The chunk text content")
    start_char: int = Field(..., ge=0, description="Starting character index in the original text")
    end_char: int = Field(..., ge=0, description="Ending character index in the original text")

    model_config = {
        "json_schema_extra": {
            "example": {
                "chunk_index": 0,
                "text": "Experienced software engineer specializing in accessible frontend interfaces...",
                "start_char": 0,
                "end_char": 1000,
            }
        }
    }


class EmbeddedTextChunk(BaseModel):
    """
    Schema representing a segmented text chunk with its vector embedding.
    """
    chunk_index: int = Field(..., ge=0, description="Zero-based sequential position of the chunk")
    text: str = Field(..., description="The chunk text content")
    start_char: int = Field(..., ge=0, description="Starting character index in the original text")
    end_char: int = Field(..., ge=0, description="Ending character index in the original text")
    embedding: list[float] = Field(..., description="Numerical vector embedding representing the chunk")

    model_config = {
        "json_schema_extra": {
            "example": {
                "chunk_index": 0,
                "text": "Experienced software engineer specializing in accessible frontend interfaces...",
                "start_char": 0,
                "end_char": 1000,
                "embedding": [0.0123, -0.0456, 0.0789],
            }
        }
    }


class DocumentChunkRecord(BaseModel):
    """
    Schema representing a stored document chunk record in Supabase.
    """
    id: str | None = Field(default=None, description="UUID primary key of the chunk record")
    document_id: str = Field(..., description="Foreign key UUID referencing documents table")
    chunk_index: int = Field(..., ge=0, description="Sequential position of chunk in the document")
    content: str = Field(..., description="Text content of the chunk")
    start_char: int = Field(..., ge=0, description="Character start offset in original document")
    end_char: int = Field(..., ge=0, description="Character end offset in original document")
    embedding: list[float] = Field(..., description="Vector embedding representation (3072 dims)")
    created_at: str | None = Field(default=None, description="Creation timestamp ISO string")

    model_config = {
        "json_schema_extra": {
            "example": {
                "id": "123e4567-e89b-12d3-a456-426614174000",
                "document_id": "987fcdeb-51a2-43f1-b890-123456789abc",
                "chunk_index": 0,
                "content": "Experienced software engineer specializing in accessible frontend interfaces...",
                "start_char": 0,
                "end_char": 1000,
                "embedding": [0.0123, -0.0456, 0.0789],
                "created_at": "2026-10-02T12:00:00Z",
            }
        }
    }


class DocumentIndexSummary(BaseModel):
    """
    Summary returned after indexing a document's extracted text into vector storage.
    """
    document_id: str = Field(description="UUID of the indexed document")
    chunks_count: int = Field(ge=0, description="Total number of chunks created and stored")
    embeddings_count: int = Field(ge=0, description="Total number of embeddings generated")
    success: bool = Field(description="Whether the indexing operation succeeded")
    message: str | None = Field(default=None, description="Status or detail message")

    model_config = {
        "json_schema_extra": {
            "example": {
                "document_id": "987fcdeb-51a2-43f1-b890-123456789abc",
                "chunks_count": 3,
                "embeddings_count": 3,
                "success": True,
                "message": "Document successfully indexed.",
            }
        }
    }



