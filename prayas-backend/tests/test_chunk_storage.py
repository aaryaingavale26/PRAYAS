import os
import sys
import unittest
import uuid
from pathlib import Path
from unittest.mock import MagicMock, patch

# Add backend directory to sys.path
BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_DIR))

from app.core.config import settings
from app.db.supabase import get_supabase_client, is_supabase_configured
from app.schemas.chunk import EmbeddedTextChunk
from app.services.chunk_storage import (
    ChunkStorageError,
    delete_document_chunks,
    get_document_chunks,
    save_document_chunks,
    validate_document_id,
)


class TestChunkStorage(unittest.TestCase):
    """
    Unit and integration tests for document chunk and embedding storage.
    All external database calls in unit tests are strictly isolated and mocked.
    """

    def setUp(self):
        self.doc_id = "123e4567-e89b-12d3-a456-426614174000"
        self.dummy_embedding = [0.01] * settings.EMBEDDING_DIMENSION
        self.chunk_sample = EmbeddedTextChunk(
            chunk_index=0,
            text="First accessible paragraph content.",
            start_char=0,
            end_char=36,
            embedding=self.dummy_embedding,
        )

    # 1. Successfully saving one chunk
    @patch("app.services.chunk_storage.is_supabase_configured", return_value=True)
    @patch("app.services.chunk_storage.get_supabase_client")
    def test_successfully_saving_one_chunk(self, mock_get_client, mock_is_configured):
        mock_client = MagicMock()
        mock_response = MagicMock()
        mock_response.data = [{"id": "chunk-uuid-1", "chunk_index": 0}]
        mock_client.table.return_value.upsert.return_value.execute.return_value = mock_response
        mock_get_client.return_value = mock_client

        results = save_document_chunks(self.doc_id, [self.chunk_sample])

        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]["chunk_index"], 0)
        mock_client.table.assert_called_with(settings.CHUNKS_TABLE)

    # 2. Successfully saving multiple chunks
    @patch("app.services.chunk_storage.is_supabase_configured", return_value=True)
    @patch("app.services.chunk_storage.get_supabase_client")
    def test_successfully_saving_multiple_chunks(self, mock_get_client, mock_is_configured):
        mock_client = MagicMock()
        mock_response = MagicMock()
        mock_response.data = [
            {"id": "chunk-uuid-1", "chunk_index": 0},
            {"id": "chunk-uuid-2", "chunk_index": 1},
        ]
        mock_client.table.return_value.upsert.return_value.execute.return_value = mock_response
        mock_get_client.return_value = mock_client

        chunk2 = EmbeddedTextChunk(
            chunk_index=1,
            text="Second accessible paragraph content.",
            start_char=30,
            end_char=68,
            embedding=self.dummy_embedding,
        )

        results = save_document_chunks(self.doc_id, [self.chunk_sample, chunk2])

        self.assertEqual(len(results), 2)
        mock_client.table.return_value.upsert.assert_called_once()

    # 3. Correct document ID and chunk metadata being saved
    @patch("app.services.chunk_storage.is_supabase_configured", return_value=True)
    @patch("app.services.chunk_storage.get_supabase_client")
    def test_correct_document_id_and_chunk_metadata_saved(self, mock_get_client, mock_is_configured):
        mock_client = MagicMock()
        mock_response = MagicMock()
        mock_response.data = [{"id": "saved-1"}]
        mock_client.table.return_value.upsert.return_value.execute.return_value = mock_response
        mock_get_client.return_value = mock_client

        save_document_chunks(self.doc_id, [self.chunk_sample])

        call_args, call_kwargs = mock_client.table.return_value.upsert.call_args
        saved_records = call_args[0]
        self.assertEqual(len(saved_records), 1)
        record = saved_records[0]

        self.assertEqual(record["document_id"], self.doc_id)
        self.assertEqual(record["chunk_index"], 0)
        self.assertEqual(record["content"], "First accessible paragraph content.")
        self.assertEqual(record["start_char"], 0)
        self.assertEqual(record["end_char"], 36)
        self.assertEqual(len(record["embedding"]), settings.EMBEDDING_DIMENSION)
        self.assertEqual(call_kwargs.get("on_conflict"), "document_id,chunk_index")

    # 4. Retrieving chunks in the correct order
    @patch("app.services.chunk_storage.is_supabase_configured", return_value=True)
    @patch("app.services.chunk_storage.get_supabase_client")
    def test_retrieving_chunks_in_correct_order(self, mock_get_client, mock_is_configured):
        mock_client = MagicMock()
        mock_response = MagicMock()
        mock_response.data = [
            {"id": "chunk-0", "chunk_index": 0, "content": "First"},
            {"id": "chunk-1", "chunk_index": 1, "content": "Second"},
            {"id": "chunk-2", "chunk_index": 2, "content": "Third"},
        ]
        mock_client.table.return_value.select.return_value.eq.return_value.order.return_value.execute.return_value = mock_response
        mock_get_client.return_value = mock_client

        chunks = get_document_chunks(self.doc_id)

        self.assertEqual(len(chunks), 3)
        self.assertEqual(chunks[0]["chunk_index"], 0)
        self.assertEqual(chunks[1]["chunk_index"], 1)
        self.assertEqual(chunks[2]["chunk_index"], 2)

        # Verify ascending order query was called
        mock_client.table.return_value.select.return_value.eq.return_value.order.assert_called_with(
            "chunk_index", desc=False
        )

    # 5. Handling an empty chunk list
    def test_handling_empty_chunk_list(self):
        result = save_document_chunks(self.doc_id, [])
        self.assertEqual(result, [])

    # 6. Deleting chunks for a document
    @patch("app.services.chunk_storage.is_supabase_configured", return_value=True)
    @patch("app.services.chunk_storage.get_supabase_client")
    def test_deleting_chunks_for_document(self, mock_get_client, mock_is_configured):
        mock_client = MagicMock()
        mock_response = MagicMock()
        mock_response.data = [{"id": "chunk-1"}, {"id": "chunk-2"}]
        mock_client.table.return_value.delete.return_value.eq.return_value.execute.return_value = mock_response
        mock_get_client.return_value = mock_client

        deleted_count = delete_document_chunks(self.doc_id)

        self.assertEqual(deleted_count, 2)
        mock_client.table.return_value.delete.return_value.eq.assert_called_with("document_id", self.doc_id)

    # 7. Handling database errors
    @patch("app.services.chunk_storage.is_supabase_configured", return_value=True)
    @patch("app.services.chunk_storage.get_supabase_client")
    def test_handling_database_errors(self, mock_get_client, mock_is_configured):
        mock_client = MagicMock()
        mock_client.table.return_value.upsert.return_value.execute.side_effect = Exception("500 Internal Database Error")
        mock_get_client.return_value = mock_client

        with self.assertRaises(ChunkStorageError) as ctx:
            save_document_chunks(self.doc_id, [self.chunk_sample])
        self.assertIn("Database error occurred", str(ctx.exception))

    # 8. Rejecting invalid document IDs
    def test_rejecting_invalid_document_ids(self):
        invalid_ids = ["", "   ", "not-a-uuid", "12345", "123e4567-e89b-12d3-a456", None]
        for bad_id in invalid_ids:
            with self.assertRaises(ChunkStorageError):
                validate_document_id(bad_id)  # type: ignore
            with self.assertRaises(ChunkStorageError):
                save_document_chunks(bad_id, [self.chunk_sample])  # type: ignore
            with self.assertRaises(ChunkStorageError):
                get_document_chunks(bad_id)  # type: ignore
            with self.assertRaises(ChunkStorageError):
                delete_document_chunks(bad_id)  # type: ignore

    # 9. Rejecting embeddings with the wrong dimension
    def test_rejecting_embeddings_wrong_dimension(self):
        bad_dimensions = [
            [],
            [0.1, 0.2],
            [0.1] * 768,
            [0.1] * 1536,
            [0.1] * (settings.EMBEDDING_DIMENSION + 1),
        ]
        for bad_emb in bad_dimensions:
            bad_chunk = {
                "chunk_index": 0,
                "content": "Test text",
                "start_char": 0,
                "end_char": 9,
                "embedding": bad_emb,
            }
            with self.assertRaises(ChunkStorageError) as ctx:
                save_document_chunks(self.doc_id, [bad_chunk])
            self.assertIn("Invalid embedding dimension", str(ctx.exception))

    # 10. Ensuring errors do not expose sensitive information
    @patch("app.services.chunk_storage.is_supabase_configured", return_value=True)
    @patch("app.services.chunk_storage.get_supabase_client")
    def test_errors_do_not_expose_sensitive_information(self, mock_get_client, mock_is_configured):
        mock_client = MagicMock()
        secret_token = "sb_secret_very_sensitive_key_9876543210"
        mock_client.table.return_value.upsert.return_value.execute.side_effect = Exception(
            f"PG connection failed with secret {secret_token}"
        )
        mock_get_client.return_value = mock_client

        with self.assertRaises(ChunkStorageError) as ctx:
            save_document_chunks(self.doc_id, [self.chunk_sample])
        self.assertNotIn(secret_token, str(ctx.exception))

    # 11. Live Supabase verification (opt-in smoke test)
    def test_live_supabase_chunk_storage_smoke_test(self):
        """
        Opt-in live verification of document chunk and embedding persistence in Supabase.
        Guarded by RUN_LIVE_SUPABASE_TESTS=1.
        Creates a test document record, saves test chunks with 3072-dim embeddings,
        retrieves them sequentially, and cleans up all created records.
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
            # 1. Create a parent document record to satisfy the foreign key constraint
            client.table("documents").insert({
                "id": test_doc_id,
                "user_id": test_user_id,
                "file_name": "_automated_smoke_test_doc.pdf",
                "storage_path": f"_automated_smoke_tests/{test_doc_id}.pdf",
                "file_type": "application/pdf",
                "file_size": 1024,
            }).execute()

            # 2. Prepare 2 test chunks with exact 3072-dimensional embeddings
            test_chunks = [
                EmbeddedTextChunk(
                    chunk_index=0,
                    text="First automated smoke test chunk for pgvector.",
                    start_char=0,
                    end_char=46,
                    embedding=[0.005] * settings.EMBEDDING_DIMENSION,
                ),
                EmbeddedTextChunk(
                    chunk_index=1,
                    text="Second automated smoke test chunk for pgvector.",
                    start_char=40,
                    end_char=87,
                    embedding=[-0.005] * settings.EMBEDDING_DIMENSION,
                ),
            ]

            # 3. Save chunks into Supabase pgvector table
            saved = save_document_chunks(test_doc_id, test_chunks)
            self.assertEqual(len(saved), 2, "Should save 2 chunk records into Supabase")

            # 4. Retrieve chunks and verify ascending order and data integrity
            retrieved = get_document_chunks(test_doc_id)
            self.assertEqual(len(retrieved), 2, "Should retrieve 2 chunks")
            self.assertEqual(retrieved[0]["chunk_index"], 0)
            self.assertEqual(retrieved[1]["chunk_index"], 1)
            self.assertEqual(retrieved[0]["content"], test_chunks[0].text)
            self.assertEqual(retrieved[1]["content"], test_chunks[1].text)

            # 5. Delete chunks and verify count
            deleted_count = delete_document_chunks(test_doc_id)
            self.assertEqual(deleted_count, 2, "Should report 2 deleted chunk records")

            # Verify no chunks remain
            after_delete = get_document_chunks(test_doc_id)
            self.assertEqual(len(after_delete), 0, "No chunks should remain after deletion")

        finally:
            # 6. Cleanup: delete test chunks and test document
            try:
                delete_document_chunks(test_doc_id)
            except Exception:
                pass
            try:
                client.table("documents").delete().eq("id", test_doc_id).execute()
            except Exception:
                pass


if __name__ == "__main__":
    unittest.main()
