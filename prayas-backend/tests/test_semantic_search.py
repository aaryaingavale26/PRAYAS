import os
import sys
import unittest
import uuid
from pathlib import Path
from unittest.mock import MagicMock, patch

# Add backend directory to sys.path
BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_DIR))

from starlette.testclient import TestClient

from app.core.auth import AuthenticatedUser, get_current_user
from app.core.config import settings
from app.db.supabase import get_supabase_client, is_supabase_configured
from app.main import app
from app.schemas.search import ChunkSearchResult, SemanticSearchRequest, SemanticSearchResponse
from app.services.semantic_search import (
    DEFAULT_SEARCH_LIMIT,
    MAX_SEARCH_LIMIT,
    MIN_SEARCH_LIMIT,
    SemanticSearchError,
    search_similar_chunks,
)


class TestSemanticSearch(unittest.TestCase):
    """
    Unit and API tests for semantic vector similarity search.
    External services (Gemini embedding API and Supabase RPC) are mocked.
    """

    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)
        cls.user_id = "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d"
        app.dependency_overrides[get_current_user] = lambda: AuthenticatedUser(user_id=cls.user_id)
        cls.doc_id = "123e4567-e89b-12d3-a456-426614174000"
        cls.dummy_vector = [0.015] * settings.EMBEDDING_DIMENSION
        cls.mock_rpc_data = [
            {
                "id": "chunk-uuid-1",
                "document_id": cls.doc_id,
                "chunk_index": 0,
                "content": "Specializes in accessible form controls and ARIA attributes.",
                "start_char": 0,
                "end_char": 61,
                "similarity": 0.8845,
            },
            {
                "id": "chunk-uuid-2",
                "document_id": cls.doc_id,
                "chunk_index": 1,
                "content": "Conducts accessibility testing using screen readers.",
                "start_char": 55,
                "end_char": 107,
                "similarity": 0.9234,
            },
        ]

    @classmethod
    def tearDownClass(cls):
        app.dependency_overrides.pop(get_current_user, None)

    # 1. Successful semantic search & 2. Query embedding generation
    @patch("app.services.semantic_search.is_supabase_configured", return_value=True)
    @patch("app.services.semantic_search.is_gemini_configured", return_value=True)
    @patch("app.services.semantic_search.get_supabase_client")
    @patch("app.services.semantic_search.generate_embedding")
    def test_successful_semantic_search(
        self, mock_gen_emb, mock_get_client, mock_gemini_conf, mock_supa_conf
    ):
        mock_gen_emb.return_value = self.dummy_vector
        mock_client = MagicMock()
        mock_response = MagicMock()
        mock_response.data = self.mock_rpc_data
        mock_client.rpc.return_value.execute.return_value = mock_response
        mock_get_client.return_value = mock_client

        results = search_similar_chunks("accessible form controls", limit=5)

        mock_gen_emb.assert_called_once_with("accessible form controls")
        self.assertEqual(len(results), 2)
        # Results should be ordered by similarity descending
        self.assertEqual(results[0]["similarity"], 0.9234)
        self.assertEqual(results[1]["similarity"], 0.8845)

    # 3. Correct RPC function invocation
    @patch("app.services.semantic_search.is_supabase_configured", return_value=True)
    @patch("app.services.semantic_search.is_gemini_configured", return_value=True)
    @patch("app.services.semantic_search.get_supabase_client")
    @patch("app.services.semantic_search.generate_embedding")
    def test_correct_rpc_invocation(
        self, mock_gen_emb, mock_get_client, mock_gemini_conf, mock_supa_conf
    ):
        mock_gen_emb.return_value = self.dummy_vector
        mock_client = MagicMock()
        mock_response = MagicMock(data=[])
        mock_client.rpc.return_value.execute.return_value = mock_response
        mock_get_client.return_value = mock_client

        search_similar_chunks("testing query", limit=3, document_id=self.doc_id)

        mock_client.rpc.assert_called_once()
        rpc_name, rpc_params = mock_client.rpc.call_args[0]
        self.assertEqual(rpc_name, "match_document_chunks")
        self.assertEqual(rpc_params["match_count"], 3)
        self.assertEqual(rpc_params["filter_document_id"], self.doc_id)
        self.assertEqual(len(rpc_params["query_embedding"]), settings.EMBEDDING_DIMENSION)

    # 4. Results ordered by similarity descending
    @patch("app.services.semantic_search.is_supabase_configured", return_value=True)
    @patch("app.services.semantic_search.is_gemini_configured", return_value=True)
    @patch("app.services.semantic_search.get_supabase_client")
    @patch("app.services.semantic_search.generate_embedding")
    def test_results_ordered_by_similarity(
        self, mock_gen_emb, mock_get_client, mock_gemini_conf, mock_supa_conf
    ):
        mock_gen_emb.return_value = self.dummy_vector
        mock_client = MagicMock()
        mock_response = MagicMock(
            data=[
                {"id": "1", "similarity": 0.50},
                {"id": "2", "similarity": 0.95},
                {"id": "3", "similarity": 0.75},
            ]
        )
        mock_client.rpc.return_value.execute.return_value = mock_response
        mock_get_client.return_value = mock_client

        results = search_similar_chunks("query")

        similarities = [r["similarity"] for r in results]
        self.assertEqual(similarities, [0.95, 0.75, 0.50])

    # 5. Optional document ID filtering
    @patch("app.services.semantic_search.is_supabase_configured", return_value=True)
    @patch("app.services.semantic_search.is_gemini_configured", return_value=True)
    @patch("app.services.semantic_search.get_supabase_client")
    @patch("app.services.semantic_search.generate_embedding")
    def test_optional_document_id_filtering(
        self, mock_gen_emb, mock_get_client, mock_gemini_conf, mock_supa_conf
    ):
        mock_gen_emb.return_value = self.dummy_vector
        mock_client = MagicMock()
        mock_client.rpc.return_value.execute.return_value = MagicMock(data=[])
        mock_get_client.return_value = mock_client

        # Without document_id
        search_similar_chunks("global search", document_id=None)
        _, params_without = mock_client.rpc.call_args[0]
        self.assertNotIn("filter_document_id", params_without)

        # With document_id
        search_similar_chunks("scoped search", document_id=self.doc_id)
        _, params_with = mock_client.rpc.call_args[0]
        self.assertEqual(params_with["filter_document_id"], self.doc_id)

    # 6. Default result limit
    @patch("app.services.semantic_search.is_supabase_configured", return_value=True)
    @patch("app.services.semantic_search.is_gemini_configured", return_value=True)
    @patch("app.services.semantic_search.get_supabase_client")
    @patch("app.services.semantic_search.generate_embedding")
    def test_default_result_limit(
        self, mock_gen_emb, mock_get_client, mock_gemini_conf, mock_supa_conf
    ):
        mock_gen_emb.return_value = self.dummy_vector
        mock_client = MagicMock()
        mock_client.rpc.return_value.execute.return_value = MagicMock(data=[])
        mock_get_client.return_value = mock_client

        search_similar_chunks("default limit test")
        _, params = mock_client.rpc.call_args[0]
        self.assertEqual(params["match_count"], DEFAULT_SEARCH_LIMIT)

    # 7. Maximum and minimum result limit validation
    def test_result_limit_validation(self):
        invalid_limits = [0, -1, 21, 100, True, False, "5"]
        for bad_limit in invalid_limits:
            with self.assertRaises(SemanticSearchError):
                search_similar_chunks("query", limit=bad_limit)  # type: ignore

    # 8. Empty or invalid query handling
    def test_empty_or_invalid_query_handling(self):
        invalid_queries = ["", "   ", "\t\n  ", None, 12345]
        for bad_q in invalid_queries:
            with self.assertRaises(SemanticSearchError):
                search_similar_chunks(bad_q)  # type: ignore

    # 9. Missing Gemini configuration
    @patch("app.services.semantic_search.is_gemini_configured", return_value=False)
    def test_missing_gemini_configuration(self, mock_gemini_conf):
        with self.assertRaises(SemanticSearchError) as ctx:
            search_similar_chunks("valid query")
        self.assertIn("gemini api is not configured", str(ctx.exception).lower())

    # 10. Supabase RPC errors handled safely
    @patch("app.services.semantic_search.is_supabase_configured", return_value=True)
    @patch("app.services.semantic_search.is_gemini_configured", return_value=True)
    @patch("app.services.semantic_search.get_supabase_client")
    @patch("app.services.semantic_search.generate_embedding")
    def test_supabase_rpc_errors(
        self, mock_gen_emb, mock_get_client, mock_gemini_conf, mock_supa_conf
    ):
        mock_gen_emb.return_value = self.dummy_vector
        mock_client = MagicMock()
        mock_client.rpc.return_value.execute.side_effect = Exception("500 Internal Postgres Error")
        mock_get_client.return_value = mock_client

        with self.assertRaises(SemanticSearchError) as ctx:
            search_similar_chunks("search query")
        self.assertIn("Database error occurred", str(ctx.exception))

    # 11. API request and response validation (POST /api/v1/search)
    @patch("app.api.search.search_similar_chunks")
    def test_api_request_and_response_validation(self, mock_search):
        mock_search.return_value = [
            {
                "id": "chunk-1",
                "document_id": self.doc_id,
                "chunk_index": 0,
                "content": "WCAG 2.1 compliance developer.",
                "start_char": 0,
                "end_char": 31,
                "similarity": 0.895,
            }
        ]

        response = self.client.post(
            "/api/v1/search",
            json={
                "query": "WCAG developer",
                "limit": 3,
                "document_id": self.doc_id,
            },
        )

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["query"], "WCAG developer")
        self.assertEqual(len(data["results"]), 1)
        res = data["results"][0]
        self.assertEqual(res["id"], "chunk-1")
        self.assertEqual(res["document_id"], self.doc_id)
        self.assertEqual(res["chunk_index"], 0)
        self.assertEqual(res["content"], "WCAG 2.1 compliance developer.")
        self.assertEqual(res["similarity"], 0.895)

    # 12. API errors handled safely without exposing secrets
    def test_api_errors_handled_safely(self):
        # Empty query
        res_empty = self.client.post("/api/v1/search", json={"query": "   "})
        self.assertEqual(res_empty.status_code, 422)  # Pydantic validation error

        # Exceeding limit
        res_limit = self.client.post("/api/v1/search", json={"query": "test", "limit": 50})
        self.assertEqual(res_limit.status_code, 422)

        # Invalid document_id
        res_bad_uuid = self.client.post(
            "/api/v1/search", json={"query": "test", "document_id": "not-a-uuid"}
        )
        self.assertEqual(res_bad_uuid.status_code, 422)

    # 13. Embedding vectors are not returned to API callers
    @patch("app.api.search.search_similar_chunks")
    def test_no_embedding_vectors_returned_to_callers(self, mock_search):
        mock_search.return_value = [
            {
                "id": "chunk-1",
                "document_id": self.doc_id,
                "chunk_index": 0,
                "content": "Search result",
                "start_char": 0,
                "end_char": 13,
                "similarity": 0.91,
                "embedding": self.dummy_vector,  # Simulated internal key
            }
        ]

        response = self.client.post(
            "/api/v1/search",
            json={"query": "Search result"},
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        first_result = data["results"][0]
        self.assertNotIn("embedding", first_result)

    # 14. Live Supabase verification test (opt-in)
    def test_live_supabase_semantic_search_opt_in(self):
        """
        Opt-in live verification of vector similarity search against Supabase.
        Guarded by RUN_LIVE_SUPABASE_TESTS=1.
        """
        if os.getenv("RUN_LIVE_SUPABASE_TESTS") != "1":
            self.skipTest("Live Supabase test skipped (enable with RUN_LIVE_SUPABASE_TESTS=1)")

        if not is_supabase_configured():
            self.skipTest("Supabase credentials not configured in environment")

        client = get_supabase_client()
        self.assertIsNotNone(client)

        test_doc_id = str(uuid.uuid4())
        test_user_id = str(uuid.uuid4())

        try:
            # 1. Insert parent test document
            client.table("documents").insert({
                "id": test_doc_id,
                "user_id": test_user_id,
                "file_name": "_live_search_test.pdf",
                "storage_path": f"_automated_smoke_tests/{test_doc_id}.pdf",
                "file_type": "application/pdf",
                "file_size": 1024,
            }).execute()

            # 2. Insert test chunk
            client.table("document_chunks").insert({
                "document_id": test_doc_id,
                "chunk_index": 0,
                "content": "Specialist in screen reader accessibility and voice synthesis.",
                "start_char": 0,
                "end_char": 64,
                "embedding": [0.01] * settings.EMBEDDING_DIMENSION,
            }).execute()

            # 3. Call live RPC
            rpc_res = client.rpc(
                "match_document_chunks",
                {
                    "query_embedding": [0.01] * settings.EMBEDDING_DIMENSION,
                    "match_count": 1,
                    "filter_document_id": test_doc_id,
                },
            ).execute()

            # If RPC is installed in Supabase, verify result
            self.assertIsNotNone(rpc_res.data)
            self.assertGreater(len(rpc_res.data), 0)
            self.assertEqual(rpc_res.data[0]["document_id"], test_doc_id)

        except Exception as exc:
            err_str = str(exc)
            if "pgrst202" in err_str.lower() or "not find the function" in err_str.lower():
                # RPC pending manual execution in SQL editor
                self.skipTest("match_document_chunks RPC function pending execution in Supabase SQL editor")
            else:
                raise
        finally:
            # Cleanup test records
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
