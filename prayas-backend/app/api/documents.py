import logging
from pathlib import Path
import uuid
from typing import Optional
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status

from app.core.auth import AuthenticatedUser, get_current_user
from app.schemas.document import DocumentRetrievalResponse, DocumentUploadResponse
from app.services.chunk_storage import delete_document_chunks
from app.services.document_indexer import index_document
from app.services.document_metadata import (
    DocumentMetadataError,
    get_document_metadata,
    save_document_metadata,
)
from app.services.document_processor import (
    DocumentProcessingError,
    extract_text_from_docx,
    extract_text_from_pdf,
)
from app.services.file_validator import FileValidationError, validate_document
from app.services.storage_service import (
    StorageServiceError,
    delete_document,
    download_document,
    upload_document,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/documents", tags=["Documents"])


@router.post(
    "/upload",
    response_model=DocumentUploadResponse,
    status_code=status.HTTP_200_OK,
    summary="Upload, validate, extract, and store document metadata",
)
async def upload_document_endpoint(
    file: UploadFile = File(..., description="PDF or DOCX document binary"),
    user_id: Optional[str] = Form(None, description="Optional legacy user ID (ignored, authenticated token identity used)"),
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Accepts a PDF or DOCX file, validates format and signatures, extracts plain text,
    stores the file in private Supabase Storage, and records metadata in the database.
    Ownership is strictly bound to the verified authenticated user.
    """
    clean_user_id = current_user.user_id
    file_name = file.filename or "uploaded_document"
    content_type = file.content_type or ""

    # 1. Read file bytes
    try:
        file_bytes = await file.read()
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Could not read uploaded file.",
        )

    file_size = len(file_bytes)

    # 2. Validate file extension, MIME type, size, and file signature
    try:
        validate_document(
            file_name=file_name,
            content_type=content_type,
            file_bytes=file_bytes,
        )
    except FileValidationError as val_err:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(val_err),
        )

    # 3. Extract text content before uploading
    ext = Path(file_name).suffix.lower()
    try:
        if ext == ".pdf":
            extracted_text = extract_text_from_pdf(file_bytes)
        elif ext == ".docx":
            extracted_text = extract_text_from_docx(file_bytes)
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported file format: {ext}",
            )
    except DocumentProcessingError as proc_err:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=str(proc_err),
        )

    # 4. Generate unique document ID and storage path
    doc_id = str(uuid.uuid4())
    safe_filename = "".join(c for c in file_name if c.isalnum() or c in (".", "_", "-")).strip()
    if not safe_filename:
        safe_filename = f"doc{ext}"
    storage_path = f"{clean_user_id}/{doc_id}_{safe_filename}"

    # 5. Upload original file to private Supabase Storage bucket
    try:
        upload_document(
            file_bytes=file_bytes,
            storage_path=storage_path,
            content_type=content_type,
        )
    except StorageServiceError as storage_err:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Storage upload failed: {str(storage_err)}",
        )

    # 6. Save metadata to database with orphan cleanup on failure
    try:
        saved_record = save_document_metadata(
            user_id=clean_user_id,
            file_name=file_name,
            storage_path=storage_path,
            file_type=content_type,
            file_size=file_size,
            document_id=doc_id,
        )
    except DocumentMetadataError:
        # Clean up orphaned storage file to avoid storage bloat
        try:
            delete_document(storage_path)
        except Exception:
            logger.error("Failed to cleanup orphaned storage file at %s", storage_path)

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database error occurred while saving document metadata.",
        )

    # 7. Index document text (chunking, embedding, and vector storage)
    final_doc_id = str(saved_record.get("id", doc_id))
    indexed = False
    chunks_count = 0

    if extracted_text and extracted_text.strip():
        try:
            index_result = index_document(
                document_id=final_doc_id,
                extracted_text=extracted_text,
            )
            indexed = bool(index_result.get("success", False))
            chunks_count = int(index_result.get("chunks_count", 0))
        except Exception as exc:
            logger.warning("Indexing failed for document %s: %s", final_doc_id, str(exc))
            # Clean up partial chunks if indexing failed midway
            try:
                delete_document_chunks(final_doc_id)
            except Exception:
                pass
            indexed = False
            chunks_count = 0

    # 8. Return structured response
    return DocumentUploadResponse(
        document_id=final_doc_id,
        file_name=file_name,
        file_type=content_type,
        file_size=file_size,
        storage_path=storage_path,
        status="uploaded",
        extracted_text=extracted_text,
        indexed=indexed,
        chunks_count=chunks_count,
    )


@router.get(
    "/{document_id}",
    response_model=DocumentRetrievalResponse,
    status_code=status.HTTP_200_OK,
    summary="Retrieve document metadata and extracted text by ID",
)
async def get_document_endpoint(
    document_id: str,
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Retrieves document metadata by ID, downloads the file from private Supabase Storage,
    extracts its text content, and returns a unified response.
    Enforces ownership: only the owner can retrieve the document.
    """
    if not document_id or not document_id.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="document_id is required and cannot be empty.",
        )

    clean_doc_id = document_id.strip()
    try:
        uuid.UUID(clean_doc_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid document ID format: Must be a valid UUID.",
        )

    # 1. Fetch metadata from database and verify ownership
    try:
        metadata = get_document_metadata(clean_doc_id)
    except DocumentMetadataError:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database error occurred while retrieving document metadata.",
        )

    if not metadata or str(metadata.get("user_id", "")).strip() != current_user.user_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document with ID '{clean_doc_id}' not found.",
        )

    storage_path = metadata.get("storage_path")
    if not storage_path:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document storage path is missing in metadata record.",
        )

    # 2. Download original binary from Supabase Storage
    try:
        file_bytes = download_document(storage_path)
    except StorageServiceError as storage_err:
        err_msg = str(storage_err).lower()
        if "not found" in err_msg:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Original document file not found in storage bucket.",
            )
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Failed to retrieve document file from storage.",
        )

    # 3. Extract text content in-memory
    file_name = metadata.get("file_name", "")
    ext = Path(file_name).suffix.lower()
    try:
        if ext == ".pdf":
            extracted_text = extract_text_from_pdf(file_bytes)
        elif ext == ".docx":
            extracted_text = extract_text_from_docx(file_bytes)
        else:
            extracted_text = ""
    except DocumentProcessingError as proc_err:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=f"Failed to extract text from document: {str(proc_err)}",
        )

    return DocumentRetrievalResponse(
        document_id=str(metadata.get("id", clean_doc_id)),
        file_name=file_name,
        file_type=metadata.get("file_type") or "application/octet-stream",
        file_size=metadata.get("file_size") or len(file_bytes),
        storage_path=storage_path,
        status="ready",
        extracted_text=extracted_text,
    )
