import io
from typing import Optional
import docx
import pymupdf


class DocumentProcessingError(Exception):
    """
    Raised when a document cannot be processed due to invalid format,
    corruption, or empty input data.
    """
    pass


def extract_text_from_pdf(file_bytes: bytes) -> str:
    """
    Extract text content from raw PDF bytes entirely in memory using PyMuPDF.

    Args:
        file_bytes: Binary content of the PDF file.

    Returns:
        Extracted plain text joined across pages by newlines, or an empty string
        if the document contains no extractable text.

    Raises:
        DocumentProcessingError: If the input bytes are empty, invalid, or corrupted.
    """
    if not file_bytes:
        raise DocumentProcessingError("Cannot process empty file: provided PDF bytes are empty.")

    doc: Optional[pymupdf.Document] = None
    try:
        doc = pymupdf.open(stream=file_bytes, filetype="pdf")

        if not doc.is_pdf:
            raise DocumentProcessingError("Invalid document: file stream is not a recognized PDF.")

        extracted_pages = []
        for page in doc:
            text = page.get_text()
            if text and text.strip():
                extracted_pages.append(text.strip())

        return "\n\n".join(extracted_pages) if extracted_pages else ""

    except DocumentProcessingError:
        raise
    except Exception:
        # Prevent leaking low-level C++ / MuPDF memory traces
        raise DocumentProcessingError("Failed to extract text from PDF: Invalid or corrupted file.") from None
    finally:
        if doc is not None:
            try:
                doc.close()
            except Exception:
                pass


def extract_text_from_docx(file_bytes: bytes) -> str:
    """
    Extract text content from raw DOCX bytes entirely in memory using python-docx.
    Extracts text from paragraphs and table cells in document order.

    Args:
        file_bytes: Binary content of the DOCX file.

    Returns:
        Extracted plain text joined by newlines, or an empty string
        if the document contains no text.

    Raises:
        DocumentProcessingError: If the input bytes are empty, invalid, or corrupted.
    """
    if not file_bytes:
        raise DocumentProcessingError("Cannot process empty file: provided DOCX bytes are empty.")

    try:
        file_stream = io.BytesIO(file_bytes)
        doc = docx.Document(file_stream)

        extracted_lines = []

        # 1. Extract paragraphs in document order
        for paragraph in doc.paragraphs:
            text = paragraph.text.strip()
            if text:
                extracted_lines.append(text)

        # 2. Extract table cell contents (resumes, credentials, tables)
        for table in doc.tables:
            for row in table.rows:
                row_cells = []
                seen_cells = set()
                for cell in row.cells:
                    if cell._tc not in seen_cells:
                        seen_cells.add(cell._tc)
                        cell_text = cell.text.strip()
                        if cell_text:
                            row_cells.append(cell_text)
                if row_cells:
                    extracted_lines.append(" | ".join(row_cells))

        return "\n\n".join(extracted_lines) if extracted_lines else ""

    except DocumentProcessingError:
        raise
    except Exception:
        # Prevent leaking low-level ZIP / XML parser traces
        raise DocumentProcessingError("Failed to extract text from DOCX: Invalid or corrupted file.") from None
