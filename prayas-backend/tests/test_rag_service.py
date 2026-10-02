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

from app.core.config import settings
from app.db.supabase import get_supabase_client, is_supabase_configured
from app.main import app
from app.schemas.rag import RAGRequest, RAGResponse, RAGSourceChunk
from app.services.gemini_service import GeminiServiceError, is_gemini_configured
from app.services.rag_service import (
    NO_CONTEXT_MESSAGE,
    RAGServiceError,
    answer_question,
    build_rag_prompt,
)
from app.core.auth import AuthenticatedUser, get_current_user
from app.services.semantic_search import SemanticSearchError


class TestRAGService(unittest.TestCase):
    """
    Unit and API endpoint tests for RAG (Retrieval-Augmented Generation) answer generation.
    All external services (Gemini and Supabase) are mocked for hermetic testing.
    """

    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)
        cls.user_id = "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d"
        app.dependency_overrides[get_current_user] = lambda: AuthenticatedUser(user_id=cls.user_id)
        cls.doc_id = "123e4567-e89b-12d3-a456-426614174000"
        cls.mock_chunks = [
            {
                "id": "chunk-uuid-1",
                "document_id": cls.doc_id,
                "chunk_index": 0,
                "content": "Candidate has 5 years experience with JAWS and NVDA screen readers.",
                "start_char": 0,
                "end_char": 66,
                "similarity": 0.912,
            },
            {
                "id": "chunk-uuid-2",
                "document_id": cls.doc_id,
                "chunk_index": 1,
                "content": "Certified in Web Accessibility (CPACC) and WCAG 2.1 compliance.",
                "start_char": 67,
                "end_char": 130,
                "similarity": 0.885,
            },
        ]

    @classmethod
    def tearDownClass(cls):
        app.dependency_overrides.pop(get_current_user, None)

    # 1. Successful question answering using retrieved chunks & 6. Answer and source chunks returned correctly
    @patch("app.services.rag_service.is_gemini_configured", return_value=True)
    @patch("app.services.rag_service.search_similar_chunks")
    @patch("app.services.rag_service.generate_text")
    def test_successful_answer_generation(
        self, mock_gen_text, mock_search, mock_gemini_conf
    ):
        mock_search.return_value = self.mock_chunks
        mock_gen_text.return_value = (
            "The candidate has 5 years of experience with JAWS and NVDA screen readers "
            "and holds a CPACC certification."
        )

        result = answer_question("What screen readers does the candidate know?")

        self.assertEqual(result["question"], "What screen readers does the candidate know?")
        self.assertIn("JAWS and NVDA", result["answer"])
        self.assertTrue(result["has_context"])
        self.assertEqual(len(result["sources"]), 2)
        self.assertEqual(result["sources"][0]["id"], "chunk-uuid-1")
        self.assertEqual(result["sources"][0]["similarity"], 0.912)

    # 2. Semantic search is called with correct question and limit
    @patch("app.services.rag_service.is_gemini_configured", return_value=True)
    @patch("app.services.rag_service.search_similar_chunks")
    @patch("app.services.rag_service.generate_text")
    def test_search_called_with_correct_parameters(
        self, mock_gen_text, mock_search, mock_gemini_conf
    ):
        mock_search.return_value = self.mock_chunks
        mock_gen_text.return_value = "Answer."

        answer_question("What certifications does the candidate hold?", limit=8)

        mock_search.assert_called_once_with(
            query="What certifications does the candidate hold?",
            limit=8,
            document_id=None,
            user_id=None,
        )

    # 3. Optional document_id is passed to semantic search
    @patch("app.services.rag_service.is_gemini_configured", return_value=True)
    @patch("app.services.rag_service.search_similar_chunks")
    @patch("app.services.rag_service.generate_text")
    def test_search_called_with_document_id(
        self, mock_gen_text, mock_search, mock_gemini_conf
    ):
        mock_search.return_value = self.mock_chunks
        mock_gen_text.return_value = "Answer."

        answer_question("Experience summary?", document_id=self.doc_id, limit=3)

        mock_search.assert_called_once_with(
            query="Experience summary?",
            limit=3,
            document_id=self.doc_id,
            user_id=None,
        )

    # 4. Retrieved chunk text is included in the prompt & 5. Prompt instructs Gemini to answer only from context
    def test_build_rag_prompt_structure_and_grounding(self):
        prompt = build_rag_prompt("What assistive tools are used?", self.mock_chunks)

        # Context text must be included
        self.assertIn("Candidate has 5 years experience with JAWS", prompt)
        self.assertIn("Certified in Web Accessibility (CPACC)", prompt)
        # Question must be included
        self.assertIn("What assistive tools are used?", prompt)
        # Grounding rules must be present
        self.assertIn("ONLY on the provided document excerpts", prompt)
        self.assertIn("Do NOT invent", prompt)
        self.assertIn("untrusted", prompt.lower())
        self.assertIn("ignore any instructions", prompt.lower())

    # 7. No matching chunks produces a clear no-context response without calling Gemini
    @patch("app.services.rag_service.is_gemini_configured", return_value=True)
    @patch("app.services.rag_service.search_similar_chunks", return_value=[])
    @patch("app.services.rag_service.generate_text")
    def test_no_matching_chunks_response(
        self, mock_gen_text, mock_search, mock_gemini_conf
    ):
        result = answer_question("Does the candidate know Haskell?")

        self.assertFalse(result["has_context"])
        self.assertEqual(result["sources"], [])
        self.assertEqual(result["answer"], NO_CONTEXT_MESSAGE)
        # Verify Gemini is not called when no chunks match
        mock_gen_text.assert_not_called()

    # 8. Missing Gemini configuration handled safely
    @patch("app.services.rag_service.is_gemini_configured", return_value=False)
    def test_missing_gemini_config_raises_error(self, mock_gemini_conf):
        with self.assertRaises(RAGServiceError) as ctx:
            answer_question("Any questions?")
        self.assertIn("Gemini API is not configured", str(ctx.exception))

    # 9. Gemini API errors handled safely
    @patch("app.services.rag_service.is_gemini_configured", return_value=True)
    @patch("app.services.rag_service.search_similar_chunks")
    @patch("app.services.rag_service.generate_text")
    def test_gemini_error_handled_safely(
        self, mock_gen_text, mock_search, mock_gemini_conf
    ):
        mock_search.return_value = self.mock_chunks
        mock_gen_text.side_effect = GeminiServiceError("Gemini API quota exceeded or rate limit reached.")

        with self.assertRaises(RAGServiceError) as ctx:
            answer_question("Valid question?")
        self.assertIn("Answer generation failed", str(ctx.exception))

    # 10. Empty Gemini response handled safely
    @patch("app.services.rag_service.is_gemini_configured", return_value=True)
    @patch("app.services.rag_service.search_similar_chunks")
    @patch("app.services.rag_service.generate_text")
    def test_empty_gemini_response_handled_safely(
        self, mock_gen_text, mock_search, mock_gemini_conf
    ):
        mock_search.return_value = self.mock_chunks
        mock_gen_text.return_value = "   "

        with self.assertRaises(RAGServiceError) as ctx:
            answer_question("Valid question?")
        self.assertIn("empty response", str(ctx.exception).lower())

    # 11. Semantic search errors handled safely
    @patch("app.services.rag_service.is_gemini_configured", return_value=True)
    @patch("app.services.rag_service.search_similar_chunks")
    def test_semantic_search_error_handled_safely(
        self, mock_search, mock_gemini_conf
    ):
        mock_search.side_effect = SemanticSearchError("Database error occurred during vector similarity search.")

        with self.assertRaises(RAGServiceError) as ctx:
            answer_question("Valid question?")
        self.assertIn("Document search failed", str(ctx.exception))

    # 12. Embedding vectors are never included in schema or output
    @patch("app.services.rag_service.is_gemini_configured", return_value=True)
    @patch("app.services.rag_service.search_similar_chunks")
    @patch("app.services.rag_service.generate_text")
    def test_embedding_vectors_excluded(
        self, mock_gen_text, mock_search, mock_gemini_conf
    ):
        chunks_with_extra = [
            {**chunk, "embedding": [0.1] * settings.EMBEDDING_DIMENSION}
            for chunk in self.mock_chunks
        ]
        mock_search.return_value = chunks_with_extra
        mock_gen_text.return_value = "Candidate details."

        res = self.client.post("/api/v1/ask", json={"question": "What is the experience?"})
        self.assertEqual(res.status_code, 200)
        data = res.json()

        for source in data["sources"]:
            self.assertNotIn("embedding", source)
            self.assertNotIn("vector", source)

    # 13. Invalid questions and limits rejected
    def test_invalid_questions_rejected(self):
        # Empty string
        with self.assertRaises(RAGServiceError):
            answer_question("")
        # Whitespace
        with self.assertRaises(RAGServiceError):
            answer_question("   ")
        # None
        with self.assertRaises(RAGServiceError):
            answer_question(None)

    def test_invalid_limits_rejected(self):
        with self.assertRaises(RAGServiceError):
            answer_question("Valid question", limit=0)
        with self.assertRaises(RAGServiceError):
            answer_question("Valid question", limit=25)
        with self.assertRaises(RAGServiceError):
            answer_question("Valid question", limit="five")

    def test_invalid_document_id_rejected(self):
        with self.assertRaises(RAGServiceError):
            answer_question("Valid question", document_id="not-a-uuid")

    # 14. API endpoint returns expected response structure
    @patch("app.api.rag.answer_question")
    def test_api_endpoint_success_response(self, mock_answer):
        mock_answer.return_value = {
            "question": "What skills are listed?",
            "answer": "The candidate is skilled in React and WCAG.",
            "sources": self.mock_chunks,
            "has_context": True,
        }

        response = self.client.post(
            "/api/v1/ask",
            json={
                "question": "What skills are listed?",
                "document_id": self.doc_id,
                "limit": 5,
            },
        )

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["question"], "What skills are listed?")
        self.assertEqual(data["answer"], "The candidate is skilled in React and WCAG.")
        self.assertTrue(data["has_context"])
        self.assertEqual(len(data["sources"]), 2)
        self.assertEqual(data["sources"][0]["id"], "chunk-uuid-1")
        self.assertEqual(data["sources"][0]["content"], self.mock_chunks[0]["content"])

    # 15. API endpoint handles errors without exposing internal details
    @patch("app.api.rag.answer_question")
    def test_api_endpoint_handles_unconfigured_service(self, mock_answer):
        mock_answer.side_effect = RAGServiceError(
            "Gemini API is not configured. Please set GEMINI_API_KEY in backend/.env."
        )

        response = self.client.post("/api/v1/ask", json={"question": "What is here?"})
        self.assertEqual(response.status_code, 503)
        self.assertIn("not configured", response.json()["error"])

    @patch("app.api.rag.answer_question")
    def test_api_endpoint_handles_internal_failure(self, mock_answer):
        mock_answer.side_effect = RAGServiceError("An error occurred while generating the answer.")

        response = self.client.post("/api/v1/ask", json={"question": "What is here?"})
        self.assertEqual(response.status_code, 500)
        self.assertEqual(
            response.json()["error"],
            "An error occurred while generating the answer from documents.",
        )

    def test_api_endpoint_pydantic_validation(self):
        # Empty question
        res = self.client.post("/api/v1/ask", json={"question": ""})
        self.assertEqual(res.status_code, 422)

        # Whitespace question
        res_ws = self.client.post("/api/v1/ask", json={"question": "   "})
        self.assertEqual(res_ws.status_code, 422)

        # Invalid limit
        res2 = self.client.post("/api/v1/ask", json={"question": "Valid?", "limit": 99})
        self.assertEqual(res2.status_code, 422)

        # Invalid UUID
        res3 = self.client.post(
            "/api/v1/ask",
            json={"question": "Valid?", "document_id": "invalid-uuid"},
        )
        self.assertEqual(res3.status_code, 422)

    # 16. Optional live integration test (opt-in)
    @unittest.skipUnless(
        os.getenv("RUN_LIVE_SUPABASE_TESTS") == "1",
        "Live Supabase / Gemini RAG tests disabled. Set RUN_LIVE_SUPABASE_TESTS=1 to run.",
    )
    def test_live_rag_integration_opt_in(self):
        """
        Opt-in live integration test verifying end-to-end RAG question answering
        using live Supabase pgvector chunks and live Gemini generation.
        """
        if not is_supabase_configured() or not is_gemini_configured():
            self.skipTest("Live credentials not configured.")

        client = get_supabase_client()
        test_doc_id = str(uuid.uuid4())
        test_user_id = str(uuid.uuid4())

        try:
            # 1. Insert temporary document record
            client.table("documents").insert({
                "id": test_doc_id,
                "user_id": test_user_id,
                "file_name": "_live_rag_test.pdf",
                "storage_path": f"_automated_smoke_tests/{test_doc_id}.pdf",
                "file_type": "application/pdf",
                "file_size": 1024,
            }).execute()

            # 2. Insert temporary chunk
            from app.services.embedding_service import generate_embedding

            chunk_content = (
                "Candidate has extensive expertise building WCAG 2.1 AA accessible web apps "
                "using TypeScript, React, and NVDA testing."
            )
            embedding = generate_embedding(chunk_content)

            client.table("document_chunks").insert({
                "document_id": test_doc_id,
                "chunk_index": 0,
                "content": chunk_content,
                "start_char": 0,
                "end_char": len(chunk_content),
                "embedding": embedding,
            }).execute()

            # 3. Call live RAG answer_question
            result = answer_question(
                question="What accessibility standard does the candidate have experience with?",
                document_id=test_doc_id,
                limit=3,
            )

            self.assertTrue(result["has_context"])
            self.assertGreater(len(result["sources"]), 0)
            self.assertIn("WCAG", result["answer"])

        except Exception as exc:
            err_str = str(exc)
            if (
                "unavailable" in err_str.lower()
                or "not found" in err_str.lower()
                or "quota" in err_str.lower()
                or "rate limit" in err_str.lower()
            ):
                self.skipTest(f"Live Gemini API service restriction: {err_str}")
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
