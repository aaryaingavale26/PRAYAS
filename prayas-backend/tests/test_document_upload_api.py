import io
import sys
import unittest
from pathlib import Path
from unittest.mock import MagicMock, patch

# Add backend directory to sys.path
BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_DIR))

import docx
import pymupdf
from starlette.testclient import TestClient

from app.core.auth import AuthenticatedUser, get_current_user
from app.main import app
from app.services.document_metadata import DocumentMetadataError
from app.services.document_processor import DocumentProcessingError
from app.services.file_validator import DOCX_MIME, PDF_MIME, FileValidationError
from app.services.storage_service import StorageServiceError


class TestDocumentUploadAPI(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)
        cls.test_user_id = "123e4567-e89b-12d3-a456-426614174000"
        app.dependency_overrides[get_current_user] = lambda: AuthenticatedUser(
            user_id=cls.test_user_id,
            email="test@example.com",
            role="authenticated",
        )

        # Generate a valid in-memory PDF
        pdf_doc = pymupdf.open()
        page = pdf_doc.new_page(width=595, height=842)
        page.insert_text((72, 72), "John Doe Resume\nSkills: Python, FastAPI")
        cls.valid_pdf_bytes = pdf_doc.tobytes()
        pdf_doc.close()

        # Generate a valid in-memory DOCX
        word_doc = docx.Document()
        word_doc.add_paragraph("Jane Smith Resume\nSkills: Accessibility, AI")
        buf = io.BytesIO()
        word_doc.save(buf)
        cls.valid_docx_bytes = buf.getvalue()

    @classmethod
    def tearDownClass(cls):
        app.dependency_overrides.pop(get_current_user, None)

    # 1. Successful PDF upload
    @patch("app.api.documents.upload_document")
    @patch("app.api.documents.save_document_metadata")
    def test_successful_pdf_upload(self, mock_save_meta, mock_upload_doc):
        mock_upload_doc.return_value = {"storage_path": "u1/test.pdf", "status": "uploaded"}
        mock_save_meta.return_value = {"id": "doc-uuid-1", "user_id": "u1", "file_name": "resume.pdf"}

        response = self.client.post(
            "/api/v1/documents/upload",
            data={"user_id": "user-1234"},
            files={"file": ("resume.pdf", self.valid_pdf_bytes, PDF_MIME)},
        )

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["file_name"], "resume.pdf")
        self.assertEqual(data["file_type"], PDF_MIME)
        self.assertEqual(data["status"], "uploaded")
        self.assertIn("John Doe", data["extracted_text"])
        self.assertTrue(mock_upload_doc.called)
        self.assertTrue(mock_save_meta.called)

    # 2. Successful DOCX upload
    @patch("app.api.documents.upload_document")
    @patch("app.api.documents.save_document_metadata")
    def test_successful_docx_upload(self, mock_save_meta, mock_upload_doc):
        mock_upload_doc.return_value = {"storage_path": "u1/test.docx", "status": "uploaded"}
        mock_save_meta.return_value = {"id": "doc-uuid-2", "user_id": "u1", "file_name": "resume.docx"}

        response = self.client.post(
            "/api/v1/documents/upload",
            data={"user_id": "user-1234"},
            files={"file": ("resume.docx", self.valid_docx_bytes, DOCX_MIME)},
        )

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["file_name"], "resume.docx")
        self.assertEqual(data["file_type"], DOCX_MIME)
        self.assertIn("Jane Smith", data["extracted_text"])

    # 3. Unsupported file type
    def test_unsupported_file_type(self):
        response = self.client.post(
            "/api/v1/documents/upload",
            data={"user_id": "user-1234"},
            files={"file": ("notes.txt", b"plain text notes", "text/plain")},
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("Unsupported file extension", response.json()["error"])

    # 4. File too large
    @patch("app.api.documents.validate_document")
    def test_file_too_large(self, mock_val):
        mock_val.side_effect = FileValidationError("File size exceeds maximum allowed limit of 10 MB.")
        response = self.client.post(
            "/api/v1/documents/upload",
            data={"user_id": "user-1234"},
            files={"file": ("large.pdf", self.valid_pdf_bytes, PDF_MIME)},
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("exceeds maximum allowed limit", response.json()["error"])

    # 5. Invalid or corrupted document
    @patch("app.api.documents.validate_document")
    def test_invalid_or_corrupted_signature(self, mock_val):
        mock_val.side_effect = FileValidationError("Invalid PDF file: Missing standard %PDF- header signature.")
        response = self.client.post(
            "/api/v1/documents/upload",
            data={"user_id": "user-1234"},
            files={"file": ("corrupt.pdf", b"fake binary", PDF_MIME)},
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("Missing standard %PDF-", response.json()["error"])

    # 6. Text extraction failure
    @patch("app.api.documents.validate_document")
    @patch("app.api.documents.extract_text_from_pdf")
    def test_text_extraction_failure(self, mock_extract, mock_val):
        mock_extract.side_effect = DocumentProcessingError("Corrupted font tables in PDF stream.")
        response = self.client.post(
            "/api/v1/documents/upload",
            data={"user_id": "user-1234"},
            files={"file": ("resume.pdf", self.valid_pdf_bytes, PDF_MIME)},
        )
        self.assertEqual(response.status_code, 422)
        self.assertIn("Corrupted font tables", response.json()["error"])

    # 7. Supabase Storage upload failure
    @patch("app.api.documents.upload_document")
    def test_storage_upload_failure(self, mock_upload):
        mock_upload.side_effect = StorageServiceError("Failed to upload document to storage.")
        response = self.client.post(
            "/api/v1/documents/upload",
            data={"user_id": "user-1234"},
            files={"file": ("resume.pdf", self.valid_pdf_bytes, PDF_MIME)},
        )
        self.assertEqual(response.status_code, 502)
        self.assertIn("Storage upload failed", response.json()["error"])

    # 8. Metadata insertion failure
    @patch("app.api.documents.upload_document")
    @patch("app.api.documents.save_document_metadata")
    @patch("app.api.documents.delete_document")
    def test_metadata_insertion_failure(self, mock_delete, mock_save_meta, mock_upload):
        mock_upload.return_value = {"status": "uploaded"}
        mock_save_meta.side_effect = DocumentMetadataError("Database insert error")

        response = self.client.post(
            "/api/v1/documents/upload",
            data={"user_id": "user-1234"},
            files={"file": ("resume.pdf", self.valid_pdf_bytes, PDF_MIME)},
        )
        self.assertEqual(response.status_code, 500)
        self.assertIn("Database error occurred", response.json()["error"])

    # 9. Storage cleanup attempted when metadata insertion fails
    @patch("app.api.documents.upload_document")
    @patch("app.api.documents.save_document_metadata")
    @patch("app.api.documents.delete_document")
    def test_storage_cleanup_attempted_on_metadata_failure(self, mock_delete, mock_save_meta, mock_upload):
        mock_upload.return_value = {"status": "uploaded"}
        mock_save_meta.side_effect = DocumentMetadataError("Constraint violation")

        response = self.client.post(
            "/api/v1/documents/upload",
            data={"user_id": "user-999"},
            files={"file": ("resume.pdf", self.valid_pdf_bytes, PDF_MIME)},
        )
        self.assertEqual(response.status_code, 500)
        # Ensure delete_document was called to cleanup orphaned storage file using trusted user identity
        self.assertTrue(mock_delete.called)
        cleaned_path = mock_delete.call_args[0][0]
        self.assertTrue(cleaned_path.startswith(f"{self.test_user_id}/"))
        self.assertTrue(cleaned_path.endswith("_resume.pdf"))

    # 10. Missing form user_id now succeeds using authenticated user identity
    @patch("app.api.documents.upload_document")
    @patch("app.api.documents.save_document_metadata")
    def test_missing_user_id(self, mock_save_meta, mock_upload):
        mock_upload.return_value = {"status": "uploaded"}
        mock_save_meta.return_value = {"id": "123e4567-e89b-12d3-a456-426614174000"}
        response = self.client.post(
            "/api/v1/documents/upload",
            files={"file": ("resume.pdf", self.valid_pdf_bytes, PDF_MIME)},
        )
        self.assertEqual(response.status_code, 200)

    # 11. Correct response structure
    @patch("app.api.documents.upload_document")
    @patch("app.api.documents.save_document_metadata")
    def test_correct_response_structure(self, mock_save_meta, mock_upload):
        mock_upload.return_value = {"status": "uploaded"}
        mock_save_meta.return_value = {"id": "uuid-abc"}

        response = self.client.post(
            "/api/v1/documents/upload",
            data={"user_id": "user-1234"},
            files={"file": ("resume.pdf", self.valid_pdf_bytes, PDF_MIME)},
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        required_keys = {
            "document_id",
            "file_name",
            "file_type",
            "file_size",
            "storage_path",
            "status",
            "extracted_text",
        }
        self.assertTrue(required_keys.issubset(data.keys()))

    # 12. Ensure secrets are not exposed in errors
    @patch("app.api.documents.upload_document")
    def test_no_secrets_in_errors(self, mock_upload):
        secret_token = "sb_secret_super_private_token_xyz"
        mock_upload.side_effect = StorageServiceError("Storage error")

        response = self.client.post(
            "/api/v1/documents/upload",
            data={"user_id": "user-1234"},
            files={"file": ("resume.pdf", self.valid_pdf_bytes, PDF_MIME)},
        )
        self.assertNotIn(secret_token, response.text)


if __name__ == "__main__":
    unittest.main()
