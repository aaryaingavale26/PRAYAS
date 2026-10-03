from typing import Any, Dict, Optional
from app.db.supabase import get_supabase_client, is_supabase_configured

DOCUMENTS_TABLE = "documents"


class DocumentMetadataError(Exception):
    """
    Raised when an operation on document metadata fails.
    Does not expose sensitive system details, internal tracebacks, or credentials.
    """
    pass


def save_document_metadata(
    user_id: str,
    file_name: str,
    storage_path: str,
    file_type: Optional[str] = None,
    file_size: Optional[int] = None,
    document_id: Optional[str] = None,
    doc_type: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Save metadata for an uploaded document into the Supabase 'documents' table.

    Args:
        user_id: UUID string of the document owner.
        file_name: Original file name.
        storage_path: Path in the private storage bucket.
        file_type: MIME type or extension.
        file_size: Size in bytes (must be non-negative).
        document_id: Optional UUID to use as primary key.

    Returns:
        The saved database record as a dictionary.

    Raises:
        DocumentMetadataError: If validation fails, client is unconfigured,
                              or database insertion fails.
    """
    if not is_supabase_configured():
        raise DocumentMetadataError("Database service is unavailable: Supabase credentials not configured.")

    if not user_id or not str(user_id).strip():
        raise DocumentMetadataError("Invalid metadata: user_id is required.")

    if not file_name or not str(file_name).strip():
        raise DocumentMetadataError("Invalid metadata: file_name is required.")

    if not storage_path or not str(storage_path).strip():
        raise DocumentMetadataError("Invalid metadata: storage_path is required.")

    if file_size is not None and file_size < 0:
        raise DocumentMetadataError("Invalid metadata: file_size cannot be negative.")

    client = get_supabase_client()
    if client is None:
        raise DocumentMetadataError("Database service is unavailable: Failed to initialize Supabase client.")

    record_payload: Dict[str, Any] = {
        "user_id": str(user_id).strip(),
        "file_name": str(file_name).strip(),
        "storage_path": str(storage_path).strip(),
    }

    if file_type:
        record_payload["file_type"] = str(file_type).strip()
    if file_size is not None:
        record_payload["file_size"] = file_size
    if document_id:
        record_payload["id"] = str(document_id).strip()
    if doc_type:
        record_payload["doc_type"] = str(doc_type).strip()

    try:
        try:
            response = client.table(DOCUMENTS_TABLE).insert(record_payload).execute()
        except Exception as first_exc:
            if "doc_type" in record_payload and "doc_type" in str(first_exc).lower():
                record_payload.pop("doc_type", None)
                response = client.table(DOCUMENTS_TABLE).insert(record_payload).execute()
            else:
                raise
        if not response.data:
            raise DocumentMetadataError("Failed to save document metadata: No record returned by database.")
        return response.data[0]
    except DocumentMetadataError:
        raise
    except Exception as exc:
        err_msg = str(exc)
        if "violates foreign key" in err_msg.lower():
            raise DocumentMetadataError("Failed to save document metadata: Invalid user_id reference.") from None
        if "duplicate key" in err_msg.lower() or "unique constraint" in err_msg.lower():
            raise DocumentMetadataError("Failed to save document metadata: A document with this ID already exists.") from None
        raise DocumentMetadataError("Database error occurred while saving document metadata.") from None


def get_document_metadata(document_id: str) -> Optional[Dict[str, Any]]:
    """
    Retrieve document metadata by document ID.

    Args:
        document_id: The UUID of the document.

    Returns:
        The document metadata dictionary, or None if not found.

    Raises:
        DocumentMetadataError: If client is unconfigured or database query fails.
    """
    if not is_supabase_configured():
        raise DocumentMetadataError("Database service is unavailable: Supabase credentials not configured.")

    if not document_id or not str(document_id).strip():
        raise DocumentMetadataError("Invalid query: document_id is required.")

    client = get_supabase_client()
    if client is None:
        raise DocumentMetadataError("Database service is unavailable: Failed to initialize Supabase client.")

    try:
        response = client.table(DOCUMENTS_TABLE).select("*").eq("id", str(document_id).strip()).execute()
        if not response.data:
            return None
        return response.data[0]
    except DocumentMetadataError:
        raise
    except Exception:
        raise DocumentMetadataError("Database error occurred while retrieving document metadata.") from None


def get_user_document_metadata(document_id: str, user_id: str) -> Optional[Dict[str, Any]]:
    """
    Retrieve document metadata verified against document ownership.
    Returns metadata only if the document exists AND belongs to user_id.

    Args:
        document_id: UUID of the document.
        user_id: UUID of the authenticated user.

    Returns:
        Document metadata dict if authorized, None otherwise.
    """
    metadata = get_document_metadata(document_id)
    if not metadata:
        return None
    if str(metadata.get("user_id", "")).strip() != str(user_id).strip():
        return None
    return metadata


def get_user_document_ids(user_id: str) -> list:
    """
    Retrieve all document UUIDs owned by the specified user.

    Args:
        user_id: UUID string of the authenticated user.

    Returns:
        List of document UUID strings owned by user_id.
    """
    if not is_supabase_configured():
        raise DocumentMetadataError("Database service is unavailable: Supabase credentials not configured.")

    if not user_id or not str(user_id).strip():
        return []

    client = get_supabase_client()
    if client is None:
        raise DocumentMetadataError("Database service is unavailable: Failed to initialize Supabase client.")

    try:
        response = client.table(DOCUMENTS_TABLE).select("id").eq("user_id", str(user_id).strip()).execute()
        return [str(row["id"]) for row in (response.data or []) if "id" in row]
    except Exception:
        raise DocumentMetadataError("Database error occurred while querying user documents.") from None


def delete_document_metadata(document_id: str) -> bool:
    """
    Delete document metadata by document ID.

    Args:
        document_id: The UUID of the document to delete.

    Returns:
        True if the record was successfully deleted, False if the record was not found.

    Raises:
        DocumentMetadataError: If client is unconfigured or database deletion fails.
    """
    if not is_supabase_configured():
        raise DocumentMetadataError("Database service is unavailable: Supabase credentials not configured.")

    if not document_id or not str(document_id).strip():
        raise DocumentMetadataError("Invalid request: document_id is required.")

    client = get_supabase_client()
    if client is None:
        raise DocumentMetadataError("Database service is unavailable: Failed to initialize Supabase client.")

    try:
        response = client.table(DOCUMENTS_TABLE).delete().eq("id", str(document_id).strip()).execute()
        # PostgREST returns deleted records in response.data
        if response.data and len(response.data) > 0:
            return True
        return False
    except DocumentMetadataError:
        raise
    except Exception:
        raise DocumentMetadataError("Database error occurred while deleting document metadata.") from None
