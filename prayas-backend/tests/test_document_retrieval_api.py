import io
import sys
import unittest
from pathlib import Path
from unittest.mock import patch

# Add backend directory to sys.path
BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_DIR))

import docx
import pymupdf
from starlette.testclient import TestClient

from app.core.auth import AuthenticatedUser, get_current_user
from app.main import app
from app.services.document_processor import DocumentProcessingError
from app.services.file_validator import DOCX_MIME, PDF_MIME
from app.services.storage_service import StorageServiceError


class TestDocumentRetrievalAPI(unittest.TestCase):
    current_user_id = "test-user-id"

    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)
        app.dependency_overrides[get_current_user] = lambda: AuthenticatedUser(user_id=cls.current_user_id)

        # In-memory valid PDF
        pdf_doc = pymupdf.open()
        page = pdf_doc.new_page(width=595, height=842)
        page.insert_text((72, 72), "Sample Extracted PDF Resume Text")
        cls.valid_pdf_bytes = pdf_doc.tobytes()
        pdf_doc.close()

        # In-memory valid DOCX
        word_doc = docx.Document()
        word_doc.add_paragraph("Sample Extracted DOCX Resume Text")
        buf = io.BytesIO()
        word_doc.save(buf)
        cls.valid_docx_bytes = buf.getvalue()

        cls.sample_doc_id = "123e4567-e89b-12d3-a456-426614174000"

    @classmethod
    def tearDownClass(cls):
        app.dependency_overrides.pop(get_current_user, None)

    def setUp(self):
        TestDocumentRetrievalAPI.current_user_id = "test-user-id"

    # 1. Successful PDF retrieval
    @patch("app.api.documents.get_document_metadata")
    @patch("app.api.documents.download_document")
    def test_successful_pdf_retrieval(self, mock_download, mock_get_meta):
        TestDocumentRetrievalAPI.current_user_id = "user-uuid-1"
        mock_get_meta.return_value = {
            "id": self.sample_doc_id,
            "user_id": "user-uuid-1",
            "file_name": "resume.pdf",
            "file_type": PDF_MIME,
            "file_size": len(self.valid_pdf_bytes),
            "storage_path": f"user-uuid-1/{self.sample_doc_id}_resume.pdf",
        }
        mock_download.return_value = self.valid_pdf_bytes

        response = self.client.get(f"/api/v1/documents/{self.sample_doc_id}")

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["document_id"], self.sample_doc_id)
        self.assertEqual(data["file_name"], "resume.pdf")
        self.assertEqual(data["file_type"], PDF_MIME)
        self.assertEqual(data["status"], "ready")
        self.assertIn("Sample Extracted PDF Resume Text", data["extracted_text"])

    # 2. Successful DOCX retrieval
    @patch("app.api.documents.get_document_metadata")
    @patch("app.api.documents.download_document")
    def test_successful_docx_retrieval(self, mock_download, mock_get_meta):
        TestDocumentRetrievalAPI.current_user_id = "user-uuid-2"
        mock_get_meta.return_value = {
            "id": self.sample_doc_id,
            "user_id": "user-uuid-2",
            "file_name": "portfolio.docx",
            "file_type": DOCX_MIME,
            "file_size": len(self.valid_docx_bytes),
            "storage_path": f"user-uuid-2/{self.sample_doc_id}_portfolio.docx",
        }
        mock_download.return_value = self.valid_docx_bytes

        response = self.client.get(f"/api/v1/documents/{self.sample_doc_id}")

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["document_id"], self.sample_doc_id)
        self.assertEqual(data["file_name"], "portfolio.docx")
        self.assertEqual(data["file_type"], DOCX_MIME)
        self.assertIn("Sample Extracted DOCX Resume Text", data["extracted_text"])

    # 3. Missing document (404)
    @patch("app.api.documents.get_document_metadata", return_value=None)
    def test_missing_document_returns_404(self, mock_get_meta):
        response = self.client.get(f"/api/v1/documents/{self.sample_doc_id}")
        self.assertEqual(response.status_code, 404)
        self.assertIn("not found", response.json()["error"].lower())

    # 4. Invalid document ID (400)
    def test_invalid_document_id_returns_400(self):
        response = self.client.get("/api/v1/documents/not-a-valid-uuid")
        self.assertEqual(response.status_code, 400)
        self.assertIn("Invalid document ID format", response.json()["error"])

    # 5. Storage download failure (502)
    @patch("app.api.documents.get_document_metadata")
    @patch("app.api.documents.download_document")
    def test_storage_download_failure(self, mock_download, mock_get_meta):
        mock_get_meta.return_value = {
            "id": self.sample_doc_id,
            "user_id": "test-user-id",
            "file_name": "resume.pdf",
            "storage_path": "path/resume.pdf",
        }
        mock_download.side_effect = StorageServiceError("Network timeout connecting to bucket")

        response = self.client.get(f"/api/v1/documents/{self.sample_doc_id}")
        self.assertEqual(response.status_code, 502)
        self.assertIn("Failed to retrieve document file from storage", response.json()["error"])

    # 6. Text extraction failure (422)
    @patch("app.api.documents.get_document_metadata")
    @patch("app.api.documents.download_document")
    @patch("app.api.documents.extract_text_from_pdf")
    def test_text_extraction_failure(self, mock_extract, mock_download, mock_get_meta):
        mock_get_meta.return_value = {
            "id": self.sample_doc_id,
            "user_id": "test-user-id",
            "file_name": "resume.pdf",
            "storage_path": "path/resume.pdf",
        }
        mock_download.return_value = self.valid_pdf_bytes
        mock_extract.side_effect = DocumentProcessingError("Corrupted font tables in PDF")

        response = self.client.get(f"/api/v1/documents/{self.sample_doc_id}")
        self.assertEqual(response.status_code, 422)
        self.assertIn("Corrupted font tables", response.json()["error"])

    # 7. Correct response fields
    @patch("app.api.documents.get_document_metadata")
    @patch("app.api.documents.download_document")
    def test_correct_response_fields(self, mock_download, mock_get_meta):
        mock_get_meta.return_value = {
            "id": self.sample_doc_id,
            "user_id": "test-user-id",
            "file_name": "resume.pdf",
            "file_type": PDF_MIME,
            "file_size": 2048,
            "storage_path": "path/resume.pdf",
        }
        mock_download.return_value = self.valid_pdf_bytes

        response = self.client.get(f"/api/v1/documents/{self.sample_doc_id}")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        required_fields = {
            "document_id",
            "file_name",
            "file_type",
            "file_size",
            "storage_path",
            "status",
            "extracted_text",
        }
        self.assertTrue(required_fields.issubset(data.keys()))

    # 8. No credential leakage in errors
    @patch("app.api.documents.get_document_metadata")
    @patch("app.api.documents.download_document")
    def test_no_credential_leakage(self, mock_download, mock_get_meta):
        mock_get_meta.return_value = {
            "id": self.sample_doc_id,
            "user_id": "test-user-id",
            "file_name": "resume.pdf",
            "storage_path": "path/resume.pdf",
        }
        sensitive_token = "sb_secret_token_private_789"
        mock_download.side_effect = StorageServiceError(f"Connection failed: {sensitive_token}")

        response = self.client.get(f"/api/v1/documents/{self.sample_doc_id}")
        self.assertNotIn(sensitive_token, response.text)

    # 9. Ensure the correct storage path is used
    @patch("app.api.documents.get_document_metadata")
    @patch("app.api.documents.download_document")
    def test_correct_storage_path_used(self, mock_download, mock_get_meta):
        expected_path = "unique-user-123/doc-456_my_resume.pdf"
        mock_get_meta.return_value = {
            "id": self.sample_doc_id,
            "user_id": "test-user-id",
            "file_name": "my_resume.pdf",
            "storage_path": expected_path,
        }
        mock_download.return_value = self.valid_pdf_bytes

        self.client.get(f"/api/v1/documents/{self.sample_doc_id}")
        mock_download.assert_called_once_with(expected_path)


if __name__ == "__main__":
    unittest.main()
