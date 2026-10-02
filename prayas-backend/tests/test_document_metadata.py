import sys
import unittest
from pathlib import Path
from unittest.mock import MagicMock, patch

# Add backend directory to sys.path
BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_DIR))

from app.services.document_metadata import (
    DOCUMENTS_TABLE,
    DocumentMetadataError,
    delete_document_metadata,
    get_document_metadata,
    save_document_metadata,
)


class TestDocumentMetadata(unittest.TestCase):
    def setUp(self):
        self.mock_client = MagicMock()
        self.mock_table = MagicMock()
        self.mock_client.table.return_value = self.mock_table

    # 1. Successful metadata insertion
    @patch("app.services.document_metadata.is_supabase_configured", return_value=True)
    @patch("app.services.document_metadata.get_supabase_client")
    def test_save_metadata_success(self, mock_get_client, mock_is_configured):
        mock_get_client.return_value = self.mock_client

        mock_response = MagicMock()
        mock_response.data = [{
            "id": "doc-uuid-1234",
            "user_id": "user-uuid-5678",
            "file_name": "resume.pdf",
            "file_type": "application/pdf",
            "file_size": 1048576,
            "storage_path": "user-uuid-5678/resume.pdf",
            "uploaded_at": "2026-10-02T10:00:00Z",
        }]
        self.mock_table.insert.return_value.execute.return_value = mock_response

        saved_record = save_document_metadata(
            user_id="user-uuid-5678",
            file_name="resume.pdf",
            storage_path="user-uuid-5678/resume.pdf",
            file_type="application/pdf",
            file_size=1048576,
        )

        self.mock_client.table.assert_called_with(DOCUMENTS_TABLE)
        self.assertEqual(saved_record["id"], "doc-uuid-1234")
        self.assertEqual(saved_record["file_name"], "resume.pdf")

    # 2. Insert failure
    @patch("app.services.document_metadata.is_supabase_configured", return_value=True)
    @patch("app.services.document_metadata.get_supabase_client")
    def test_save_metadata_failure(self, mock_get_client, mock_is_configured):
        mock_get_client.return_value = self.mock_client
        self.mock_table.insert.return_value.execute.side_effect = Exception("Database write error")

        with self.assertRaises(DocumentMetadataError) as ctx:
            save_document_metadata(
                user_id="user-uuid-5678",
                file_name="resume.pdf",
                storage_path="user-uuid-5678/resume.pdf",
            )
        self.assertIn("error occurred while saving", str(ctx.exception).lower())

    # 3. Successful metadata retrieval
    @patch("app.services.document_metadata.is_supabase_configured", return_value=True)
    @patch("app.services.document_metadata.get_supabase_client")
    def test_get_metadata_success(self, mock_get_client, mock_is_configured):
        mock_get_client.return_value = self.mock_client

        mock_response = MagicMock()
        mock_response.data = [{
            "id": "doc-uuid-1234",
            "user_id": "user-uuid-5678",
            "file_name": "resume.pdf",
            "storage_path": "user-uuid-5678/resume.pdf",
        }]
        self.mock_table.select.return_value.eq.return_value.execute.return_value = mock_response

        record = get_document_metadata("doc-uuid-1234")

        self.mock_client.table.assert_called_with(DOCUMENTS_TABLE)
        self.mock_table.select.assert_called_with("*")
        self.mock_table.select.return_value.eq.assert_called_with("id", "doc-uuid-1234")
        self.assertIsNotNone(record)
        self.assertEqual(record["id"], "doc-uuid-1234")

    # 4. Retrieval of a nonexistent document
    @patch("app.services.document_metadata.is_supabase_configured", return_value=True)
    @patch("app.services.document_metadata.get_supabase_client")
    def test_get_metadata_nonexistent(self, mock_get_client, mock_is_configured):
        mock_get_client.return_value = self.mock_client

        mock_response = MagicMock()
        mock_response.data = []
        self.mock_table.select.return_value.eq.return_value.execute.return_value = mock_response

        record = get_document_metadata("non-existent-uuid")
        self.assertIsNone(record)

    # 5. Successful metadata deletion
    @patch("app.services.document_metadata.is_supabase_configured", return_value=True)
    @patch("app.services.document_metadata.get_supabase_client")
    def test_delete_metadata_success(self, mock_get_client, mock_is_configured):
        mock_get_client.return_value = self.mock_client

        mock_response = MagicMock()
        mock_response.data = [{"id": "doc-uuid-1234"}]
        self.mock_table.delete.return_value.eq.return_value.execute.return_value = mock_response

        deleted = delete_document_metadata("doc-uuid-1234")

        self.mock_client.table.assert_called_with(DOCUMENTS_TABLE)
        self.mock_table.delete.return_value.eq.assert_called_with("id", "doc-uuid-1234")
        self.assertTrue(deleted)

    # 6. Delete failure
    @patch("app.services.document_metadata.is_supabase_configured", return_value=True)
    @patch("app.services.document_metadata.get_supabase_client")
    def test_delete_metadata_failure(self, mock_get_client, mock_is_configured):
        mock_get_client.return_value = self.mock_client
        self.mock_table.delete.return_value.eq.return_value.execute.side_effect = Exception("Database network error")

        with self.assertRaises(DocumentMetadataError) as ctx:
            delete_document_metadata("doc-uuid-1234")
        self.assertIn("error occurred while deleting", str(ctx.exception).lower())

    # 7. Correct table and document ID usage
    @patch("app.services.document_metadata.is_supabase_configured", return_value=True)
    @patch("app.services.document_metadata.get_supabase_client")
    def test_correct_table_and_fields(self, mock_get_client, mock_is_configured):
        mock_get_client.return_value = self.mock_client

        mock_response = MagicMock()
        mock_response.data = [{"id": "custom-id-999"}]
        self.mock_table.insert.return_value.execute.return_value = mock_response

        save_document_metadata(
            user_id="user-123",
            file_name="diploma.docx",
            storage_path="user-123/diploma.docx",
            file_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            file_size=2048,
            document_id="custom-id-999",
        )

        self.mock_client.table.assert_called_with("documents")
        called_payload = self.mock_table.insert.call_args[0][0]
        self.assertEqual(called_payload["user_id"], "user-123")
        self.assertEqual(called_payload["file_name"], "diploma.docx")
        self.assertEqual(called_payload["storage_path"], "user-123/diploma.docx")
        self.assertEqual(called_payload["id"], "custom-id-999")
        self.assertEqual(called_payload["file_size"], 2048)

    # 8. Error messages do not expose secrets
    @patch("app.services.document_metadata.is_supabase_configured", return_value=True)
    @patch("app.services.document_metadata.get_supabase_client")
    def test_no_secrets_in_errors(self, mock_get_client, mock_is_configured):
        mock_get_client.return_value = self.mock_client
        sensitive_token = "sb_secret_super_confidential_98765"
        self.mock_table.insert.return_value.execute.side_effect = Exception(f"Database error with {sensitive_token}")

        with self.assertRaises(DocumentMetadataError) as ctx:
            save_document_metadata(
                user_id="user-123",
                file_name="doc.pdf",
                storage_path="user-123/doc.pdf",
            )
        self.assertNotIn(sensitive_token, str(ctx.exception))


if __name__ == "__main__":
    unittest.main()
