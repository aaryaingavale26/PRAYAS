import io
from pathlib import Path
from typing import Optional, Set
import zipfile

from app.core.config import settings

# Supported extensions
ALLOWED_EXTENSIONS: Set[str] = {".pdf", ".docx"}

# Official MIME types
PDF_MIME: str = "application/pdf"
DOCX_MIME: str = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"

ALLOWED_MIME_TYPES = {
    ".pdf": {PDF_MIME},
    ".docx": {DOCX_MIME},
}

# Magic signatures
PDF_MAGIC: bytes = b"%PDF-"
ZIP_MAGIC: bytes = b"PK\x03\x04"


class FileValidationError(Exception):
    """
    Raised when an uploaded document fails validation criteria
    (unsupported extension, invalid MIME type, invalid signature, or size limit).
    """
    pass


def validate_document(
    file_name: str,
    content_type: str,
    file_bytes: bytes,
    max_size_mb: Optional[int] = None,
) -> None:
    """
    Validate an uploaded document before storage or processing.

    Enforces:
    1. Empty file detection (must not be 0 bytes).
    2. File size limit (configurable, defaults to settings.MAX_UPLOAD_SIZE_MB).
    3. File extension (.pdf or .docx, case-insensitive).
    4. MIME type matching (must match expected type for the extension).
    5. File signature check (header bytes and internal archive structure).

    Args:
        file_name: Original filename with extension (e.g. "resume.pdf").
        content_type: Declared MIME type from client/browser.
        file_bytes: Binary contents of the document.
        max_size_mb: Optional override for max allowed size in megabytes.

    Raises:
        FileValidationError: If any validation rule fails.
    """
    # 1. Empty file check
    if not file_bytes or len(file_bytes) == 0:
        raise FileValidationError("File is empty. Uploaded documents must not be 0 bytes.")

    # 2. File size check
    effective_max_mb = max_size_mb if max_size_mb is not None else settings.MAX_UPLOAD_SIZE_MB
    max_bytes = effective_max_mb * 1024 * 1024
    if len(file_bytes) > max_bytes:
        raise FileValidationError(
            f"File size ({len(file_bytes) / (1024 * 1024):.2f} MB) exceeds maximum allowed limit of {effective_max_mb} MB."
        )

    # 3. File extension check (case-insensitive)
    if not file_name or "." not in file_name:
        raise FileValidationError(
            "Invalid file name: missing extension. Supported formats are .pdf and .docx."
        )

    ext = Path(file_name).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise FileValidationError(
            f"Unsupported file extension '{ext}'. Only .pdf and .docx documents are accepted."
        )

    # 4. MIME type check
    clean_content_type = content_type.strip().lower() if content_type else ""
    expected_mimes = ALLOWED_MIME_TYPES.get(ext, set())
    if clean_content_type not in expected_mimes:
        expected_mime_str = list(expected_mimes)[0]
        raise FileValidationError(
            f"Invalid MIME type '{clean_content_type}' for {ext} file. Expected '{expected_mime_str}'."
        )

    # 5. File signature / Magic bytes check
    if ext == ".pdf":
        if not file_bytes.startswith(PDF_MAGIC):
            raise FileValidationError("Invalid PDF file: Missing standard %PDF- header signature.")

    elif ext == ".docx":
        if not file_bytes.startswith(ZIP_MAGIC):
            raise FileValidationError("Invalid DOCX file: Missing standard ZIP archive signature.")

        try:
            stream = io.BytesIO(file_bytes)
            if not zipfile.is_zipfile(stream):
                raise FileValidationError("Invalid DOCX file: Content is not a recognized ZIP archive.")

            with zipfile.ZipFile(stream) as zf:
                namelist = zf.namelist()
                # Confirm OpenXML WordprocessingML structure
                if "[Content_Types].xml" not in namelist and "word/document.xml" not in namelist:
                    raise FileValidationError(
                        "Invalid DOCX file: Archive is missing Word document structure."
                    )
        except FileValidationError:
            raise
        except Exception:
            raise FileValidationError("Invalid DOCX file: Could not parse Word document package structure.")
