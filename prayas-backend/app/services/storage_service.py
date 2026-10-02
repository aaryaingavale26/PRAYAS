from typing import Any, Dict
from app.db.supabase import get_supabase_client, is_supabase_configured

# Dedicated private storage bucket name
DOCUMENTS_BUCKET: str = "documents"


class StorageServiceError(Exception):
    """
    Raised when an operation against Supabase Storage fails.
    Does not expose sensitive system details or credentials.
    """
    pass


def sanitize_storage_path(storage_path: str) -> str:
    """
    Sanitize and validate a storage path to prevent directory traversal
    and illegal characters.
    """
    if not storage_path or not storage_path.strip():
        raise StorageServiceError("Invalid storage path: Path cannot be empty.")

    # Normalize slashes and eliminate traversal sequences
    normalized = storage_path.strip().replace("\\", "/")
    segments = [s for s in normalized.split("/") if s and s != "." and s != ".."]

    if not segments:
        raise StorageServiceError("Invalid storage path: Resolved path is empty or invalid.")

    return "/".join(segments)


def upload_document(
    file_bytes: bytes,
    storage_path: str,
    content_type: str,
) -> Dict[str, Any]:
    """
    Upload document bytes to the private 'documents' Supabase Storage bucket.

    Args:
        file_bytes: Raw binary content of the file.
        storage_path: Relative destination path within the bucket (e.g. 'user_id/resume.pdf').
        content_type: MIME type of the document.

    Returns:
        Dictionary containing storage_path, bucket name, and status.

    Raises:
        StorageServiceError: If the client is unconfigured, upload fails, or file already exists.
    """
    if not is_supabase_configured():
        raise StorageServiceError("Storage service is unavailable: Supabase credentials not configured.")

    if not file_bytes:
        raise StorageServiceError("Cannot upload empty file.")

    client = get_supabase_client()
    if client is None:
        raise StorageServiceError("Storage service is unavailable: Failed to initialize Supabase client.")

    clean_path = sanitize_storage_path(storage_path)

    try:
        # file_options with upsert='false' prevents accidental overwriting of existing files
        file_options = {
            "content-type": content_type,
            "upsert": "false",
        }
        client.storage.from_(DOCUMENTS_BUCKET).upload(
            path=clean_path,
            file=file_bytes,
            file_options=file_options,
        )

        return {
            "storage_path": clean_path,
            "bucket": DOCUMENTS_BUCKET,
            "status": "uploaded",
        }
    except StorageServiceError:
        raise
    except Exception as exc:
        err_msg = str(exc)
        if "duplicate" in err_msg.lower() or "already exists" in err_msg.lower() or "409" in err_msg:
            raise StorageServiceError(f"A file already exists at storage path: {clean_path}") from None
        if "bucket not found" in err_msg.lower():
            raise StorageServiceError(f"Storage bucket '{DOCUMENTS_BUCKET}' not found in Supabase project. Please create it in the Supabase Dashboard.") from None
        raise StorageServiceError("Failed to upload document to storage.") from None


def download_document(storage_path: str) -> bytes:
    """
    Download a document from the private 'documents' Supabase Storage bucket.

    Args:
        storage_path: Relative storage path within the bucket.

    Returns:
        File contents as raw bytes.

    Raises:
        StorageServiceError: If the client is unconfigured, file does not exist, or download fails.
    """
    if not is_supabase_configured():
        raise StorageServiceError("Storage service is unavailable: Supabase credentials not configured.")

    client = get_supabase_client()
    if client is None:
        raise StorageServiceError("Storage service is unavailable: Failed to initialize Supabase client.")

    clean_path = sanitize_storage_path(storage_path)

    try:
        data = client.storage.from_(DOCUMENTS_BUCKET).download(clean_path)
        if data is None:
            raise StorageServiceError(f"Document not found at path: {clean_path}")
        return data
    except StorageServiceError:
        raise
    except Exception:
        raise StorageServiceError(f"Failed to download document from path: {clean_path}") from None


def delete_document(storage_path: str) -> bool:
    """
    Delete a document from the private 'documents' Supabase Storage bucket.

    Args:
        storage_path: Relative storage path within the bucket.

    Returns:
        True if the deletion request succeeded.

    Raises:
        StorageServiceError: If the client is unconfigured or deletion fails.
    """
    if not is_supabase_configured():
        raise StorageServiceError("Storage service is unavailable: Supabase credentials not configured.")

    client = get_supabase_client()
    if client is None:
        raise StorageServiceError("Storage service is unavailable: Failed to initialize Supabase client.")

    clean_path = sanitize_storage_path(storage_path)

    try:
        client.storage.from_(DOCUMENTS_BUCKET).remove([clean_path])
        return True
    except StorageServiceError:
        raise
    except Exception:
        raise StorageServiceError(f"Failed to delete document at path: {clean_path}") from None
