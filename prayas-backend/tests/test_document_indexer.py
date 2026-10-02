import os
import sys
import unittest
import uuid
from pathlib import Path
from unittest.mock import MagicMock, patch

# Add backend directory to sys.path
BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_DIR))

import pymupdf
from starlette.testclient import TestClient

from app.core.auth import AuthenticatedUser, get_current_user
from app.core.config import settings
from app.db.supabase import get_supabase_client, is_supabase_configured
from app.main import app
from app.schemas.chunk import EmbeddedTextChunk, TextChunk
from app.services.chunk_storage import ChunkStorageError
from app.services.document_indexer import (
    DocumentIndexingError,
    index_document,
)
from app.services.embedding_service import EmbeddingServiceError
from app.services.file_validator import PDF_MIME


class TestDocumentIndexer(unittest.TestCase):
    """
    Unit and integration tests for document extraction, text chunking,
    embedding generation, and vector storage integration.
    """

    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)
        cls.user_id = "11111111-2222-3333-4444-555555555555"
        app.dependency_overrides[get_current_user] = lambda: AuthenticatedUser(user_id=cls.user_id)
        cls.doc_id = "987fcdeb-51a2-43f1-b890-123456789abc"
        cls.dummy_vector = [0.02] * settings.EMBEDDING_DIMENSION

        # Generate sample PDF bytes
        pdf_doc = pymupdf.open()
        page = pdf_doc.new_page(width=595, height=842)
        page.insert_text((72, 72), "Accessible Design Lead\nSpecializing in WCAG compliance and AI tools.")
        cls.valid_pdf_bytes = pdf_doc.tobytes()
        pdf_doc.close()

    @classmethod
    def tearDownClass(cls):
        app.dependency_overrides.pop(get_current_user, None)

    # 1. Successful document indexing
    @patch("app.services.document_indexer.delete_document_chunks")
    @patch("app.services.document_indexer.save_document_chunks")
    @patch("app.services.document_indexer.embed_text_chunks")
    @patch("app.services.document_indexer.chunk_document_text")
    def test_successful_document_indexing(
        self, mock_chunk, mock_embed, mock_save, mock_delete
    ):
        chunk1 = TextChunk(chunk_index=0, text="Paragraph one text.", start_char=0, end_char=20)
        chunk2 = TextChunk(chunk_index=1, text="Paragraph two text.", start_char=15, end_char=35)
        mock_chunk.return_value = [chunk1, chunk2]

        emb1 = EmbeddedTextChunk(chunk_index=0, text="Paragraph one text.", start_char=0, end_char=20, embedding=self.dummy_vector)
        emb2 = EmbeddedTextChunk(chunk_index=1, text="Paragraph two text.", start_char=15, end_char=35, embedding=self.dummy_vector)
        mock_embed.return_value = [emb1, emb2]
        mock_save.return_value = [{"id": "c1"}, {"id": "c2"}]

        result = index_document(self.doc_id, "Sample document text content.")

        self.assertTrue(result["success"])
        self.assertEqual(result["document_id"], self.doc_id)
        self.assertEqual(result["chunks_count"], 2)
        self.assertEqual(result["embeddings_count"], 2)
        mock_delete.assert_called_once_with(self.doc_id)
        mock_save.assert_called_once_with(self.doc_id, [emb1, emb2])

    # 2. Correct chunk count and embedding count
    @patch("app.services.document_indexer.delete_document_chunks")
    @patch("app.services.document_indexer.save_document_chunks")
    @patch("app.services.document_indexer.embed_text_chunks")
    @patch("app.services.document_indexer.chunk_document_text")
    def test_correct_chunk_and_embedding_count(
        self, mock_chunk, mock_embed, mock_save, mock_delete
    ):
        chunks = [
            TextChunk(chunk_index=i, text=f"Chunk {i}", start_char=i * 10, end_char=(i + 1) * 10)
            for i in range(5)
        ]
        embedded = [
            EmbeddedTextChunk(chunk_index=i, text=f"Chunk {i}", start_char=i * 10, end_char=(i + 1) * 10, embedding=self.dummy_vector)
            for i in range(5)
        ]
        mock_chunk.return_value = chunks
        mock_embed.return_value = embedded
        mock_save.return_value = [{"id": f"chunk-{i}"} for i in range(5)]

        result = index_document(self.doc_id, "Some text content")

        self.assertEqual(result["chunks_count"], 5)
        self.assertEqual(result["embeddings_count"], 5)

    # 3. Preservation of chunk metadata
    @patch("app.services.document_indexer.delete_document_chunks")
    @patch("app.services.document_indexer.save_document_chunks")
    @patch("app.services.document_indexer.embed_text_chunks")
    @patch("app.services.document_indexer.chunk_document_text")
    def test_correct_preservation_of_chunk_metadata(
        self, mock_chunk, mock_embed, mock_save, mock_delete
    ):
        chunk = TextChunk(chunk_index=0, text="Metadata preservation test.", start_char=10, end_char=37)
        mock_chunk.return_value = [chunk]

        emb = EmbeddedTextChunk(
            chunk_index=0,
            text="Metadata preservation test.",
            start_char=10,
            end_char=37,
            embedding=self.dummy_vector,
        )
        mock_embed.return_value = [emb]

        index_document(self.doc_id, "Metadata preservation test.")

        # Check arguments passed to save_document_chunks
        saved_chunks = mock_save.call_args[0][1]
        self.assertEqual(len(saved_chunks), 1)
        self.assertEqual(saved_chunks[0].chunk_index, 0)
        self.assertEqual(saved_chunks[0].text, "Metadata preservation test.")
        self.assertEqual(saved_chunks[0].start_char, 10)
        self.assertEqual(saved_chunks[0].end_char, 37)
        self.assertEqual(len(saved_chunks[0].embedding), settings.EMBEDDING_DIMENSION)

    # 4. Empty extracted text handled safely
    @patch("app.services.document_indexer.embed_text_chunks")
    def test_empty_extracted_text_handled_safely(self, mock_embed):
        for empty_val in ["", "   ", "\n\t  \r\n", None]:
            result = index_document(self.doc_id, empty_val)
            self.assertTrue(result["success"])
            self.assertEqual(result["chunks_count"], 0)
            self.assertEqual(result["embeddings_count"], 0)
            self.assertIn("No text content", result["message"])

        mock_embed.assert_not_called()

    # 5. Embedding generation failure
    @patch("app.services.document_indexer.delete_document_chunks")
    @patch("app.services.document_indexer.embed_text_chunks")
    @patch("app.services.document_indexer.chunk_document_text")
    def test_embedding_generation_failure(self, mock_chunk, mock_embed, mock_delete):
        mock_chunk.return_value = [TextChunk(chunk_index=0, text="Valid text", start_char=0, end_char=10)]
        mock_embed.side_effect = EmbeddingServiceError("Gemini API quota exceeded.")

        with self.assertRaises(DocumentIndexingError) as ctx:
            index_document(self.doc_id, "Valid text for indexing.")

        self.assertIn("Embedding generation failed", str(ctx.exception))

    # 6. Chunk storage failure
    @patch("app.services.document_indexer.delete_document_chunks")
    @patch("app.services.document_indexer.save_document_chunks")
    @patch("app.services.document_indexer.embed_text_chunks")
    @patch("app.services.document_indexer.chunk_document_text")
    def test_chunk_storage_failure(self, mock_chunk, mock_embed, mock_save, mock_delete):
        mock_chunk.return_value = [TextChunk(chunk_index=0, text="Valid text", start_char=0, end_char=10)]
        mock_embed.return_value = [
            EmbeddedTextChunk(chunk_index=0, text="Valid text", start_char=0, end_char=10, embedding=self.dummy_vector)
        ]
        mock_save.side_effect = ChunkStorageError("Database connection lost.")

        with self.assertRaises(DocumentIndexingError) as ctx:
            index_document(self.doc_id, "Valid text for indexing.")

        self.assertIn("Failed to store document chunks", str(ctx.exception))
        # Ensure cleanup is attempted on failure
        self.assertTrue(mock_delete.called)

    # 7. Invalid document ID rejected
    def test_invalid_document_id_rejected(self):
        with self.assertRaises(DocumentIndexingError):
            index_document("not-a-valid-uuid", "Some valid text.")

    # 8. Upload integration with successful indexing
    @patch("app.api.documents.index_document")
    @patch("app.api.documents.save_document_metadata")
    @patch("app.api.documents.upload_document")
    def test_upload_integration_with_successful_indexing(
        self, mock_upload, mock_save_meta, mock_index
    ):
        mock_upload.return_value = {"storage_path": "path/test.pdf", "status": "uploaded"}
        mock_save_meta.return_value = {
            "id": self.doc_id,
            "user_id": "u123",
            "file_name": "resume.pdf",
        }
        mock_index.return_value = {
            "document_id": self.doc_id,
            "chunks_count": 2,
            "embeddings_count": 2,
            "success": True,
            "message": "Indexed 2 chunks.",
        }

        response = self.client.post(
            "/api/v1/documents/upload",
            data={"user_id": "11111111-2222-3333-4444-555555555555"},
            files={"file": ("resume.pdf", self.valid_pdf_bytes, PDF_MIME)},
        )

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["status"], "uploaded")
        self.assertTrue(data["indexed"])
        self.assertEqual(data["chunks_count"], 2)
        mock_index.assert_called_once()

    # 9. Upload integration with indexing failure
    @patch("app.api.documents.delete_document_chunks")
    @patch("app.api.documents.index_document")
    @patch("app.api.documents.save_document_metadata")
    @patch("app.api.documents.upload_document")
    def test_upload_integration_with_indexing_failure(
        self, mock_upload, mock_save_meta, mock_index, mock_delete_chunks
    ):
        mock_upload.return_value = {"storage_path": "path/test.pdf", "status": "uploaded"}
        mock_save_meta.return_value = {
            "id": self.doc_id,
            "user_id": "u123",
            "file_name": "resume.pdf",
        }
        mock_index.side_effect = DocumentIndexingError("Embedding service unavailable.")

        response = self.client.post(
            "/api/v1/documents/upload",
            data={"user_id": "11111111-2222-3333-4444-555555555555"},
            files={"file": ("resume.pdf", self.valid_pdf_bytes, PDF_MIME)},
        )

        # Upload itself succeeded, but indexed is False and partial chunks cleaned
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["status"], "uploaded")
        self.assertFalse(data["indexed"])
        self.assertEqual(data["chunks_count"], 0)
        mock_delete_chunks.assert_called_once_with(self.doc_id)

    # 10. No duplicate chunks on a retry
    @patch("app.services.document_indexer.delete_document_chunks")
    @patch("app.services.document_indexer.save_document_chunks")
    @patch("app.services.document_indexer.embed_text_chunks")
    @patch("app.services.document_indexer.chunk_document_text")
    def test_no_duplicate_chunks_on_retry(
        self, mock_chunk, mock_embed, mock_save, mock_delete
    ):
        mock_chunk.return_value = [TextChunk(chunk_index=0, text="Retry test", start_char=0, end_char=10)]
        mock_embed.return_value = [
            EmbeddedTextChunk(chunk_index=0, text="Retry test", start_char=0, end_char=10, embedding=self.dummy_vector)
        ]
        mock_save.return_value = [{"id": "c1"}]

        # Call indexing twice for the same document ID
        res1 = index_document(self.doc_id, "Retry test text.")
        res2 = index_document(self.doc_id, "Retry test text.")

        self.assertTrue(res1["success"])
        self.assertTrue(res2["success"])
        # Verify that delete_document_chunks is called on every run to clear prior chunks
        self.assertEqual(mock_delete.call_count, 2)

    # 11. Live Supabase end-to-end indexing smoke test (opt-in)
    def test_live_supabase_pipeline_opt_in(self):
        """
        Opt-in live verification of end-to-end document indexing against Supabase.
        Guarded by RUN_LIVE_SUPABASE_TESTS=1.
        Creates a test document in 'documents', indexes text, verifies chunks in 'document_chunks',
        and cleans up all test records.
        """
        if os.getenv("RUN_LIVE_SUPABASE_TESTS") != "1":
            self.skipTest("Live Supabase test skipped (enable with RUN_LIVE_SUPABASE_TESTS=1)")

        if not is_supabase_configured():
            self.skipTest("Supabase credentials not configured in environment")

        client = get_supabase_client()
        self.assertIsNotNone(client, "Supabase client must be available")

        test_doc_id = str(uuid.uuid4())
        test_user_id = str(uuid.uuid4())

        try:
            # 1. Create parent document
            client.table("documents").insert({
                "id": test_doc_id,
                "user_id": test_user_id,
                "file_name": "_automated_indexer_test.pdf",
                "storage_path": f"_automated_smoke_tests/{test_doc_id}.pdf",
                "file_type": "application/pdf",
                "file_size": 2048,
            }).execute()

            # 2. Run index_document (mocking only the external Gemini API call to avoid rate limits)
            with patch(
                "app.services.embedding_service.generate_embeddings",
                return_value=[[0.015] * settings.EMBEDDING_DIMENSION],
            ):
                summary = index_document(test_doc_id, "Accessible job application indexing test content.")

            self.assertTrue(summary["success"])
            self.assertGreater(summary["chunks_count"], 0)

            # 3. Verify chunks actually exist in live Supabase database
            chunks = client.table("document_chunks").select("id,chunk_index,content").eq("document_id", test_doc_id).execute()
            self.assertEqual(len(chunks.data), summary["chunks_count"])

        finally:
            # 4. Clean up test records
            try:
                client.table("document_chunks").delete().eq("document_id", test_doc_id).execute()
            except Exception:
                pass
            try:
                client.table("documents").delete().eq("id", test_doc_id).execute()
            except Exception:
                pass


if __name__ == "__main__":
    unittest.main()
