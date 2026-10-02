import sys
import unittest
from pathlib import Path
from unittest.mock import MagicMock, patch

# Add backend directory to sys.path
BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_DIR))

from app.services.storage_service import (
    DOCUMENTS_BUCKET,
    StorageServiceError,
    delete_document,
    download_document,
    sanitize_storage_path,
    upload_document,
)


class TestStorageService(unittest.TestCase):
    def setUp(self):
        self.mock_client = MagicMock()
        self.mock_bucket = MagicMock()
        self.mock_client.storage.from_.return_value = self.mock_bucket

    # 1. Successful upload
    @patch("app.services.storage_service.is_supabase_configured", return_value=True)
    @patch("app.services.storage_service.get_supabase_client")
    def test_upload_document_success(self, mock_get_client, mock_is_configured):
        mock_get_client.return_value = self.mock_client
        self.mock_bucket.upload.return_value = {"Key": "documents/user1/resume.pdf"}

        result = upload_document(
            file_bytes=b"sample pdf binary data",
            storage_path="user1/resume.pdf",
            content_type="application/pdf",
        )

        self.mock_client.storage.from_.assert_called_with("documents")
        self.mock_bucket.upload.assert_called_once_with(
            path="user1/resume.pdf",
            file=b"sample pdf binary data",
            file_options={"content-type": "application/pdf", "upsert": "false"},
        )
        self.assertEqual(result["status"], "uploaded")
        self.assertEqual(result["storage_path"], "user1/resume.pdf")
        self.assertEqual(result["bucket"], DOCUMENTS_BUCKET)

    # 2. Upload error
    @patch("app.services.storage_service.is_supabase_configured", return_value=True)
    @patch("app.services.storage_service.get_supabase_client")
    def test_upload_document_error(self, mock_get_client, mock_is_configured):
        mock_get_client.return_value = self.mock_client
        self.mock_bucket.upload.side_effect = Exception("Internal storage error (secret_key_123)")

        with self.assertRaises(StorageServiceError) as ctx:
            upload_document(
                file_bytes=b"sample pdf binary data",
                storage_path="user1/resume.pdf",
                content_type="application/pdf",
            )
        self.assertIn("Failed to upload document", str(ctx.exception))
        # Ensure credentials/internals are not leaked
        self.assertNotIn("secret_key_123", str(ctx.exception))

    # 3. Successful download
    @patch("app.services.storage_service.is_supabase_configured", return_value=True)
    @patch("app.services.storage_service.get_supabase_client")
    def test_download_document_success(self, mock_get_client, mock_is_configured):
        mock_get_client.return_value = self.mock_client
        self.mock_bucket.download.return_value = b"%PDF-1.4 file content"

        content = download_document("user1/resume.pdf")

        self.mock_client.storage.from_.assert_called_with("documents")
        self.mock_bucket.download.assert_called_once_with("user1/resume.pdf")
        self.assertEqual(content, b"%PDF-1.4 file content")

    # 4. Download error or missing file
    @patch("app.services.storage_service.is_supabase_configured", return_value=True)
    @patch("app.services.storage_service.get_supabase_client")
    def test_download_document_error(self, mock_get_client, mock_is_configured):
        mock_get_client.return_value = self.mock_client
        self.mock_bucket.download.side_effect = Exception("404 File not found")

        with self.assertRaises(StorageServiceError) as ctx:
            download_document("user1/nonexistent.pdf")
        self.assertIn("Failed to download document", str(ctx.exception))

    # 5. Successful deletion
    @patch("app.services.storage_service.is_supabase_configured", return_value=True)
    @patch("app.services.storage_service.get_supabase_client")
    def test_delete_document_success(self, mock_get_client, mock_is_configured):
        mock_get_client.return_value = self.mock_client
        self.mock_bucket.remove.return_value = [{"name": "user1/resume.pdf"}]

        success = delete_document("user1/resume.pdf")

        self.mock_client.storage.from_.assert_called_with("documents")
        self.mock_bucket.remove.assert_called_once_with(["user1/resume.pdf"])
        self.assertTrue(success)

    # 6. Delete error
    @patch("app.services.storage_service.is_supabase_configured", return_value=True)
    @patch("app.services.storage_service.get_supabase_client")
    def test_delete_document_error(self, mock_get_client, mock_is_configured):
        mock_get_client.return_value = self.mock_client
        self.mock_bucket.remove.side_effect = Exception("Deletion failed due to network")

        with self.assertRaises(StorageServiceError) as ctx:
            delete_document("user1/resume.pdf")
        self.assertIn("Failed to delete document", str(ctx.exception))

    # 7. Correct bucket name and path sanitization
    @patch("app.services.storage_service.is_supabase_configured", return_value=True)
    @patch("app.services.storage_service.get_supabase_client")
    def test_correct_bucket_and_sanitized_path(self, mock_get_client, mock_is_configured):
        mock_get_client.return_value = self.mock_client
        self.mock_bucket.upload.return_value = {}

        # Traversal and backslashes must be sanitized
        result = upload_document(
            file_bytes=b"content",
            storage_path="user_123\\..\\folder//resume.pdf",
            content_type="application/pdf",
        )

        self.mock_client.storage.from_.assert_called_with(DOCUMENTS_BUCKET)
        self.assertEqual(result["storage_path"], "user_123/folder/resume.pdf")

    # 8. Secret and file content protection in error messages
    @patch("app.services.storage_service.is_supabase_configured", return_value=True)
    @patch("app.services.storage_service.get_supabase_client")
    def test_no_secrets_or_binary_in_error_messages(self, mock_get_client, mock_is_configured):
        mock_get_client.return_value = self.mock_client
        sensitive_secret = "sb_secret_super_private_token"
        sensitive_binary_fragment = "SECRET_USER_RESUME_INFO"
        self.mock_bucket.upload.side_effect = Exception(f"Failed token: {sensitive_secret}")

        with self.assertRaises(StorageServiceError) as ctx:
            upload_document(
                file_bytes=sensitive_binary_fragment.encode(),
                storage_path="test/doc.pdf",
                content_type="application/pdf",
            )
        error_msg = str(ctx.exception)
        self.assertNotIn(sensitive_secret, error_msg)
        self.assertNotIn(sensitive_binary_fragment, error_msg)

    # Path sanitization helper tests
    def test_sanitize_storage_path(self):
        self.assertEqual(sanitize_storage_path("a/b/c.pdf"), "a/b/c.pdf")
        self.assertEqual(sanitize_storage_path("a\\b\\c.pdf"), "a/b/c.pdf")
        self.assertEqual(sanitize_storage_path("/leading/slash.pdf/"), "leading/slash.pdf")
        self.assertEqual(sanitize_storage_path("a/../b/./c.pdf"), "a/b/c.pdf")

        with self.assertRaises(StorageServiceError):
            sanitize_storage_path("")
        with self.assertRaises(StorageServiceError):
            sanitize_storage_path("///")


if __name__ == "__main__":
    unittest.main()
