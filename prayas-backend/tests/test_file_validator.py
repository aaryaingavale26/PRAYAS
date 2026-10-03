import io
import sys
import unittest
from pathlib import Path

# Add backend to sys.path
BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_DIR))

import docx
import pymupdf
from app.services.file_validator import (
    DOCX_MIME,
    PDF_MIME,
    FileValidationError,
    validate_document,
)


class TestFileValidator(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        # Generate valid in-memory PDF
        doc = pymupdf.open()
        page = doc.new_page(width=595, height=842)
        page.insert_text((72, 72), "Valid PDF document content")
        cls.valid_pdf_bytes = doc.tobytes()
        doc.close()

        # Generate valid in-memory DOCX
        word_doc = docx.Document()
        word_doc.add_paragraph("Valid DOCX document content")
        buf = io.BytesIO()
        word_doc.save(buf)
        cls.valid_docx_bytes = buf.getvalue()

    # 1. Valid PDF
    def test_valid_pdf(self):
        try:
            validate_document("resume.pdf", PDF_MIME, self.valid_pdf_bytes)
        except FileValidationError:
            self.fail("validate_document raised FileValidationError on a valid PDF")

    # 2. Valid DOCX
    def test_valid_docx(self):
        try:
            validate_document("resume.docx", DOCX_MIME, self.valid_docx_bytes)
        except FileValidationError:
            self.fail("validate_document raised FileValidationError on a valid DOCX")

    # 3. Unsupported file extension
    def test_unsupported_file_extension(self):
        with self.assertRaises(FileValidationError) as ctx:
            validate_document("resume.rtf", "application/rtf", b"{\\rtf1 Sample text content}")
        self.assertIn("Unsupported file extension", str(ctx.exception))

        with self.assertRaises(FileValidationError) as ctx_exe:
            validate_document("malware.exe", "application/octet-stream", b"MZ...")
        self.assertIn("Unsupported file extension", str(ctx_exe.exception))

    # 4. Incorrect MIME type
    def test_incorrect_mime_type(self):
        with self.assertRaises(FileValidationError) as ctx:
            validate_document("resume.pdf", "text/html", self.valid_pdf_bytes)
        self.assertIn("Invalid MIME type", str(ctx.exception))

    # 5. Mismatched extension and MIME type
    def test_mismatched_extension_and_mime_type(self):
        # .pdf extension with DOCX MIME type
        with self.assertRaises(FileValidationError) as ctx1:
            validate_document("resume.pdf", DOCX_MIME, self.valid_pdf_bytes)
        self.assertIn("Invalid MIME type", str(ctx1.exception))

        # .docx extension with PDF MIME type
        with self.assertRaises(FileValidationError) as ctx2:
            validate_document("resume.docx", PDF_MIME, self.valid_docx_bytes)
        self.assertIn("Invalid MIME type", str(ctx2.exception))

    # 6. Empty file
    def test_empty_file(self):
        with self.assertRaises(FileValidationError) as ctx:
            validate_document("resume.pdf", PDF_MIME, b"")
        self.assertIn("empty", str(ctx.exception).lower())

    # 7. File exceeding the size limit
    def test_file_exceeding_size_limit(self):
        # Test with an explicit 1 MB limit override
        oversized_bytes = self.valid_pdf_bytes + (b"0" * (1024 * 1024 + 100))
        with self.assertRaises(FileValidationError) as ctx:
            validate_document("resume.pdf", PDF_MIME, oversized_bytes, max_size_mb=1)
        self.assertIn("exceeds maximum allowed limit", str(ctx.exception))

    # 8. Invalid PDF signature
    def test_invalid_pdf_signature(self):
        fake_pdf = b"NOT_A_PDF header text here instead of standard magic bytes"
        with self.assertRaises(FileValidationError) as ctx:
            validate_document("resume.pdf", PDF_MIME, fake_pdf)
        self.assertIn("%PDF-", str(ctx.exception))

    # 9. Invalid DOCX content
    def test_invalid_docx_content(self):
        fake_docx = b"PK\x03\x04 fake corrupted zip content without word structure"
        with self.assertRaises(FileValidationError) as ctx:
            validate_document("resume.docx", DOCX_MIME, fake_docx)
        self.assertIn("Invalid DOCX file", str(ctx.exception))

    # 10. Case-insensitive file extensions
    def test_case_insensitive_file_extensions(self):
        try:
            validate_document("RESUME.PDF", PDF_MIME, self.valid_pdf_bytes)
            validate_document("Document.Docx", DOCX_MIME, self.valid_docx_bytes)
            validate_document("Portfolio.PdF", PDF_MIME, self.valid_pdf_bytes)
        except FileValidationError:
            self.fail("validate_document failed on case-insensitive valid file extensions")


if __name__ == "__main__":
    unittest.main()
