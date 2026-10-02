import io
import os
from pathlib import Path
import sys
import unittest
import uuid
from unittest.mock import MagicMock, patch

# Add backend directory to sys.path
BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_DIR))

from starlette.testclient import TestClient

from app.core.auth import AuthenticatedUser, get_current_user
from app.core.config import settings
from app.db.supabase import get_supabase_client, is_supabase_configured
from app.main import app
from app.schemas.chunk import EmbeddedTextChunk
from app.schemas.rag import RAGSourceChunk
from app.schemas.search import ChunkSearchResult
from app.services.gemini_service import is_gemini_configured


class TestBackendIntegrationAudit(unittest.TestCase):
    """
    End-to-End Integration Audit & Cross-Service Verification.
    Verifies that all Stage 1-4 backend components work together seamlessly:
    Document Upload -> Indexing -> Retrieval -> Semantic Search -> RAG -> Simplification.
    """

    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)
        cls.user_id = str(uuid.uuid4())
        cls.doc_id = str(uuid.uuid4())
        app.dependency_overrides[get_current_user] = lambda: AuthenticatedUser(user_id=cls.user_id)
        cls.dummy_vector = [0.025] * settings.EMBEDDING_DIMENSION
        # PDF with valid header and accessible content
        cls.sample_pdf_bytes = (
            b"%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n"
            b"2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n"
            b"3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >>\nendobj\n"
            b"4 0 obj\n<< /Length 200 >>\nstream\nBT\n/F1 12 Tf\n100 700 Td\n"
            b"(John Doe is an accessibility engineer specializing in WCAG 2.1 compliance and screen reader testing.) Tj\n"
            b"ET\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f \n0000000010 00000 n \n0000000060 00000 n \n"
            b"0000000117 00000 n \n0000000198 00000 n \ntrailer\n<< /Size 5 /Root 1 0 R >>\nstartxref\n450\n%%EOF"
        )
        cls.extracted_text = (
            "John Doe is an accessibility engineer specializing in WCAG 2.1 compliance and screen reader testing."
        )

    @classmethod
    def tearDownClass(cls):
        app.dependency_overrides.pop(get_current_user, None)

    # 1. Full E2E Workflow: Upload -> Index -> Retrieve -> Search -> RAG -> Simplify
    @patch("app.services.semantic_search.get_user_document_metadata")
    @patch("app.api.documents.upload_document")
    @patch("app.api.documents.save_document_metadata")
    @patch("app.services.document_indexer.delete_document_chunks")
    @patch("app.services.document_indexer.embed_text_chunks")
    @patch("app.services.document_indexer.save_document_chunks")
    @patch("app.api.documents.download_document")
    @patch("app.api.documents.get_document_metadata")
    @patch("app.api.documents.extract_text_from_pdf")
    @patch("app.services.semantic_search.generate_embedding")
    @patch("app.services.semantic_search.is_gemini_configured", return_value=True)
    @patch("app.services.rag_service.is_gemini_configured", return_value=True)
    @patch("app.services.text_simplifier.is_gemini_configured", return_value=True)
    @patch("app.services.semantic_search.is_supabase_configured", return_value=True)
    @patch("app.services.semantic_search.get_supabase_client")
    @patch("app.services.rag_service.generate_text")
    @patch("app.services.text_simplifier.generate_text")
    def test_full_lifecycle_integration_workflow(
        self,
        mock_simp_gen_text,
        mock_rag_gen_text,
        mock_supa_client,
        mock_supa_conf,
        mock_simp_cfg,
        mock_rag_cfg,
        mock_gemini_conf,
        mock_search_gen_emb,
        mock_pdf_extract,
        mock_get_metadata,
        mock_download,
        mock_save_chunks,
        mock_embed_chunks,
        mock_del_chunks,
        mock_save_metadata,
        mock_upload,
        mock_get_user_doc_meta,
    ):
        """
        Tests the complete pipeline:
        1. Upload PDF -> document is validated, uploaded, metadata saved, and indexed.
        2. Retrieve document by ID -> metadata and extracted text returned.
        3. Semantic search -> matching chunks returned with similarity scores.
        4. RAG ask -> question answered from chunks.
        5. Text simplification -> excerpt simplified to accessible language.
        """
        # Step 1: Mock Document Upload & Indexing
        mock_get_user_doc_meta.return_value = {"id": self.doc_id, "user_id": self.user_id}
        mock_upload.return_value = {
            "path": f"{self.user_id}/{self.doc_id}_resume.pdf",
            "full_path": f"documents/{self.user_id}/{self.doc_id}_resume.pdf",
        }
        mock_save_metadata.return_value = {
            "id": self.doc_id,
            "user_id": self.user_id,
            "file_name": "resume.pdf",
            "storage_path": f"{self.user_id}/{self.doc_id}_resume.pdf",
            "file_type": "application/pdf",
            "file_size": len(self.sample_pdf_bytes),
        }
        mock_pdf_extract.return_value = self.extracted_text
        mock_embed_chunks.return_value = [
            EmbeddedTextChunk(
                chunk_index=0,
                text=self.extracted_text,
                start_char=0,
                end_char=len(self.extracted_text),
                embedding=self.dummy_vector,
            )
        ]
        mock_save_chunks.return_value = [
            {
                "id": "chunk-101",
                "document_id": self.doc_id,
                "chunk_index": 0,
                "content": self.extracted_text,
            }
        ]

        upload_res = self.client.post(
            "/api/v1/documents/upload",
            data={"user_id": self.user_id},
            files={"file": ("resume.pdf", io.BytesIO(self.sample_pdf_bytes), "application/pdf")},
        )
        self.assertEqual(upload_res.status_code, 200)
        upload_data = upload_res.json()
        self.assertEqual(upload_data["document_id"], self.doc_id)
        self.assertTrue(upload_data["indexed"])
        self.assertEqual(upload_data["chunks_count"], 1)

        # Step 2: Retrieve document by ID
        mock_get_metadata.return_value = mock_save_metadata.return_value
        mock_download.return_value = self.sample_pdf_bytes

        retrieval_res = self.client.get(f"/api/v1/documents/{self.doc_id}")
        self.assertEqual(retrieval_res.status_code, 200)
        retrieval_data = retrieval_res.json()
        self.assertEqual(retrieval_data["document_id"], self.doc_id)
        self.assertEqual(retrieval_data["status"], "ready")
        self.assertIn("accessibility engineer", retrieval_data["extracted_text"])

        # Step 3: Semantic Search across indexed chunks
        mock_search_gen_emb.return_value = self.dummy_vector
        mock_rpc_res = MagicMock()
        mock_rpc_res.data = [
            {
                "id": "chunk-101",
                "document_id": self.doc_id,
                "chunk_index": 0,
                "content": self.extracted_text,
                "start_char": 0,
                "end_char": len(self.extracted_text),
                "similarity": 0.945,
            }
        ]
        mock_db_client = MagicMock()
        mock_db_client.rpc.return_value.execute.return_value = mock_rpc_res
        mock_supa_client.return_value = mock_db_client

        search_res = self.client.post(
            "/api/v1/search",
            json={"query": "WCAG compliance experience", "document_id": self.doc_id},
        )
        self.assertEqual(search_res.status_code, 200)
        search_data = search_res.json()
        self.assertEqual(len(search_data["results"]), 1)
        self.assertEqual(search_data["results"][0]["id"], "chunk-101")
        self.assertEqual(search_data["results"][0]["similarity"], 0.945)

        # Step 4: RAG question answering grounded on retrieved chunks
        mock_rag_gen_text.return_value = (
            "Based on the provided documents, John Doe specializes in WCAG 2.1 compliance."
        )

        rag_res = self.client.post(
            "/api/v1/ask",
            json={"question": "What is John's primary specialization?", "document_id": self.doc_id},
        )
        self.assertEqual(rag_res.status_code, 200)
        rag_data = rag_res.json()
        self.assertTrue(rag_data["has_context"])
        self.assertIn("WCAG 2.1 compliance", rag_data["answer"])
        self.assertEqual(len(rag_data["sources"]), 1)
        self.assertEqual(rag_data["sources"][0]["id"], "chunk-101")

        # Step 5: Text simplification of the generated or retrieved excerpt
        mock_simp_gen_text.return_value = (
            "John Doe helps build accessible websites that follow WCAG 2.1 rules."
        )

        simplify_res = self.client.post(
            "/api/v1/simplify",
            json={"text": rag_data["answer"], "level": "very_simple"},
        )
        self.assertEqual(simplify_res.status_code, 200)
        simp_data = simplify_res.json()
        self.assertEqual(simp_data["level"], "very_simple")
        self.assertIn("accessible websites", simp_data["simplified_text"])

    # 2. Schema Compatibility: ChunkSearchResult vs RAGSourceChunk
    def test_search_and_rag_source_schema_compatibility(self):
        """
        Ensures that ChunkSearchResult from /search and RAGSourceChunk from /ask
        expose the exact same field contract so client consumers (frontend/extension/voice)
        can reuse UI components across search and RAG sources.
        """
        search_fields = set(ChunkSearchResult.model_fields.keys())
        rag_fields = set(RAGSourceChunk.model_fields.keys())

        self.assertEqual(
            search_fields,
            rag_fields,
            f"Schema mismatch between ChunkSearchResult and RAGSourceChunk: {search_fields ^ rag_fields}",
        )
        # Expected fields contract
        expected_fields = {
            "id",
            "document_id",
            "chunk_index",
            "content",
            "start_char",
            "end_char",
            "similarity",
        }
        self.assertEqual(search_fields, expected_fields)

    # 3. Graceful Degradation: Upload succeeds even if indexing fails
    @patch("app.api.documents.upload_document")
    @patch("app.api.documents.save_document_metadata")
    @patch("app.api.documents.index_document")
    @patch("app.api.documents.extract_text_from_pdf")
    @patch("app.api.documents.delete_document_chunks")
    def test_upload_resilience_when_indexing_fails(
        self,
        mock_delete_chunks,
        mock_pdf_extract,
        mock_index_doc,
        mock_save_metadata,
        mock_upload,
    ):
        """
        Verifies that if indexing encounters an error (e.g. temporary Gemini downtime),
        the document upload still completes successfully with indexed=False and partial chunks cleaned up.
        """
        mock_upload.return_value = {"path": f"{self.user_id}/{self.doc_id}_test.pdf"}
        mock_save_metadata.return_value = {
            "id": self.doc_id,
            "user_id": self.user_id,
            "file_name": "test.pdf",
            "storage_path": f"{self.user_id}/{self.doc_id}_test.pdf",
            "file_type": "application/pdf",
            "file_size": len(self.sample_pdf_bytes),
        }
        mock_pdf_extract.return_value = self.extracted_text
        mock_index_doc.side_effect = Exception("Simulated Gemini quota error during indexing")

        res = self.client.post(
            "/api/v1/documents/upload",
            data={"user_id": self.user_id},
            files={"file": ("test.pdf", io.BytesIO(self.sample_pdf_bytes), "application/pdf")},
        )

        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["status"], "uploaded")
        self.assertFalse(data["indexed"])
        self.assertEqual(data["chunks_count"], 0)
        mock_delete_chunks.assert_called_once_with(self.doc_id)

    # 4. Error Handling across Service Boundaries (RAG handles DB failure safely)
    @patch("app.services.rag_service.is_gemini_configured", return_value=True)
    @patch("app.services.rag_service.search_similar_chunks")
    def test_rag_handles_search_failure_without_exposing_internals(self, mock_search, mock_gemini_conf):
        mock_search.side_effect = Exception("Postgres connection dropped: connection timeout")

        res = self.client.post("/api/v1/ask", json={"question": "What is my experience?"})
        self.assertEqual(res.status_code, 500)
        # Verify no database connection or raw error text leaked
        self.assertNotIn("Postgres", res.text)
        self.assertNotIn("connection timeout", res.text)
        self.assertEqual(
            res.json()["error"],
            "An error occurred while generating the answer from documents.",
        )

    # 5. Text Simplification Input Validation & Error Boundaries
    def test_simplification_validation_and_error_handling(self):
        # Empty text
        res_empty = self.client.post("/api/v1/simplify", json={"text": ""})
        self.assertEqual(res_empty.status_code, 422)

        # Invalid level
        res_level = self.client.post("/api/v1/simplify", json={"text": "Hello", "level": "super_advanced"})
        self.assertEqual(res_level.status_code, 422)

    # 6. Opt-in Live End-to-End Pipeline Smoke Test
    @unittest.skipUnless(
        os.getenv("RUN_LIVE_SUPABASE_TESTS") == "1",
        "Live Supabase / Gemini integration audit skipped. Enable with RUN_LIVE_SUPABASE_TESTS=1.",
    )
    def test_live_full_pipeline_smoke_test(self):
        """
        Opt-in live integration audit verifying Supabase storage, database,
        Gemini embeddings, pgvector search, RAG, and Simplification.
        """
        if not is_supabase_configured() or not is_gemini_configured():
            self.skipTest("Live credentials not configured.")

        client = get_supabase_client()
        test_doc_id = str(uuid.uuid4())
        test_user_id = str(uuid.uuid4())

        try:
            # 1. Insert test document metadata
            client.table("documents").insert({
                "id": test_doc_id,
                "user_id": test_user_id,
                "file_name": "_audit_test_doc.pdf",
                "storage_path": f"_automated_smoke_tests/{test_doc_id}.pdf",
                "file_type": "application/pdf",
                "file_size": 1024,
            }).execute()

            # 2. Insert test chunk with real Gemini embedding
            from app.services.embedding_service import generate_embedding

            chunk_text = "Expert in JAWS screen reader navigation and section 508 accessibility compliance."
            emb = generate_embedding(chunk_text)

            client.table("document_chunks").insert({
                "document_id": test_doc_id,
                "chunk_index": 0,
                "content": chunk_text,
                "start_char": 0,
                "end_char": len(chunk_text),
                "embedding": emb,
            }).execute()

            # 3. Test live search endpoint
            search_res = self.client.post(
                "/api/v1/search",
                json={"query": "screen reader navigation", "document_id": test_doc_id},
            )
            self.assertEqual(search_res.status_code, 200)
            self.assertGreater(len(search_res.json()["results"]), 0)

            # 4. Test live simplification
            simp_res = self.client.post(
                "/api/v1/simplify",
                json={"text": chunk_text, "level": "basic"},
            )
            self.assertEqual(simp_res.status_code, 200)
            self.assertIn("simplified_text", simp_res.json())

        except Exception as exc:
            err_msg = str(exc)
            if "unavailable" in err_msg.lower() or "not found" in err_msg.lower():
                self.skipTest(f"Live Gemini model restriction: {err_msg}")
            else:
                raise
        finally:
            # Clean up test records
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
