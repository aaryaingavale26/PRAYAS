from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, field_validator


class DocumentMetadata(BaseModel):
    """
    Pydantic schema representing document metadata for uploaded user files.
    """

    document_id: Optional[str] = Field(default=None, description="Unique document ID (UUID)")
    user_id: Optional[str] = Field(default=None, description="Owner user ID (UUID)")
    file_name: str = Field(..., min_length=1, description="Original filename with extension (required)")
    file_type: Optional[str] = Field(default=None, description="MIME type or file extension (e.g. application/pdf)")
    file_size: Optional[int] = Field(default=None, ge=0, description="File size in bytes (must be non-negative)")
    storage_path: Optional[str] = Field(default=None, description="Supabase storage bucket path")
    uploaded_at: Optional[datetime] = Field(default=None, description="Upload timestamp")

    @field_validator("file_size")
    @classmethod
    def validate_file_size(cls, v: Optional[int]) -> Optional[int]:
        if v is not None and v < 0:
            raise ValueError("File size cannot be negative")
        return v

    model_config = {
        "json_schema_extra": {
            "example": {
                "document_id": "987fcdeb-51a2-43f1-b890-123456789abc",
                "user_id": "123e4567-e89b-12d3-a456-426614174000",
                "file_name": "Resume_Accessible.pdf",
                "file_type": "application/pdf",
                "file_size": 1048576,
                "storage_path": "documents/123e4567-e89b-12d3-a456-426614174000/Resume_Accessible.pdf",
            }
        }
    }


class DocumentUploadResponse(BaseModel):
    """
    Pydantic schema returned upon successful document upload and text extraction.
    """

    document_id: str = Field(description="Unique document ID (UUID)")
    file_name: str = Field(description="Original filename")
    file_type: str = Field(description="MIME type of uploaded document")
    file_size: int = Field(description="File size in bytes")
    storage_path: str = Field(description="Path in private Supabase Storage bucket")
    status: str = Field(default="uploaded", description="Processing status")
    extracted_text: str = Field(default="", description="Extracted plain text content")
    indexed: bool = Field(default=False, description="Whether document text was successfully indexed into vector storage")
    chunks_count: int = Field(default=0, description="Total number of chunks created and stored")

    model_config = {
        "json_schema_extra": {
            "example": {
                "document_id": "987fcdeb-51a2-43f1-b890-123456789abc",
                "file_name": "Resume_Accessible.pdf",
                "file_type": "application/pdf",
                "file_size": 1048576,
                "storage_path": "123e4567-e89b-12d3-a456-426614174000/987fcdeb_Resume_Accessible.pdf",
                "status": "uploaded",
                "extracted_text": "John Doe\nSoftware Engineer Resume\nSkills: Python, FastAPI...",
            }
        }
    }


class DocumentRetrievalResponse(BaseModel):
    """
    Pydantic schema returned when retrieving a document's metadata and extracted text.
    """

    document_id: str = Field(description="Unique document ID (UUID)")
    file_name: str = Field(description="Original filename")
    file_type: str = Field(description="MIME type of the document")
    file_size: int = Field(description="File size in bytes")
    storage_path: str = Field(description="Path in private Supabase Storage bucket")
    status: str = Field(default="ready", description="Document status")
    extracted_text: str = Field(default="", description="Extracted plain text content")

    model_config = {
        "json_schema_extra": {
            "example": {
                "document_id": "987fcdeb-51a2-43f1-b890-123456789abc",
                "file_name": "Resume_Accessible.pdf",
                "file_type": "application/pdf",
                "file_size": 1048576,
                "storage_path": "123e4567-e89b-12d3-a456-426614174000/987fcdeb_Resume_Accessible.pdf",
                "status": "ready",
                "extracted_text": "John Doe\nSoftware Engineer Resume\nSkills: Python, FastAPI...",
            }
        }
    }
