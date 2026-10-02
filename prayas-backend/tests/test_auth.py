import io
import os
from pathlib import Path
import sys
import time
import unittest
import uuid
from unittest.mock import MagicMock, patch
import jwt

# Add backend directory to sys.path
BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_DIR))

from fastapi import HTTPException
from starlette.testclient import TestClient

from app.core.auth import (
    AuthenticatedUser,
    extract_bearer_token,
    get_current_user,
    verify_jwt_token,
)
from app.core.config import settings
from app.main import app


class TestSupabaseAuthAndAuthorization(unittest.TestCase):
    """
    Comprehensive test suite for Supabase Authentication and Authorization.
    Verifies token validation, document ownership, search scoping, and endpoint protection.
    External services are mocked for hermetic execution.
    """

    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)
        cls.test_secret = "test-secret-key-32-bytes-minimum-length-for-hs256"
        cls.user_a_id = "11111111-1111-4111-8111-111111111111"
        cls.user_b_id = "22222222-2222-4222-8222-222222222222"
        cls.doc_a_id = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
        cls.doc_b_id = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"

        cls.user_a = AuthenticatedUser(user_id=cls.user_a_id, email="usera@example.com")
        cls.user_b = AuthenticatedUser(user_id=cls.user_b_id, email="userb@example.com")

        # Generate sample valid JWT for User A using test secret
        now = int(time.time())
        cls.valid_token_a = jwt.encode(
            {
                "sub": cls.user_a_id,
                "email": "usera@example.com",
                "role": "authenticated",
                "exp": now + 3600,
                "iat": now,
            },
            cls.test_secret,
            algorithm="HS256",
        )
        cls.expired_token_a = jwt.encode(
            {
                "sub": cls.user_a_id,
                "email": "usera@example.com",
                "role": "authenticated",
                "exp": now - 3600,
                "iat": now - 7200,
            },
            cls.test_secret,
            algorithm="HS256",
        )
        cls.unsigned_token = jwt.encode(
            {"sub": cls.user_a_id},
            key="",
            algorithm="none",
        )

        cls.sample_pdf_bytes = (
            b"%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n"
            b"2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n"
            b"3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >>\nendobj\n"
            b"4 0 obj\n<< /Length 50 >>\nstream\nBT\n/F1 12 Tf\n(User resume content.) Tj\nET\nendstream\nendobj\n"
            b"xref\n0 5\n0000000000 65535 f \ntrailer\n<< /Size 5 /Root 1 0 R >>\nstartxref\n300\n%%EOF"
        )

    # -------------------------------------------------------------------------
    # PART 1: TOKEN PARSING & VALIDATION TESTS
    # -------------------------------------------------------------------------

    # 1. Missing Authorization header returns 401
    def test_extract_bearer_token_missing_header(self):
        with self.assertRaises(HTTPException) as ctx:
            extract_bearer_token(None)
        self.assertEqual(ctx.exception.status_code, 401)
        self.assertIn("Authorization header is required", ctx.exception.detail)

        with self.assertRaises(HTTPException) as ctx:
            extract_bearer_token("   ")
        self.assertEqual(ctx.exception.status_code, 401)

    # 2. Malformed Bearer header returns 401
    def test_extract_bearer_token_malformed_header(self):
        # Basic scheme instead of Bearer
        with self.assertRaises(HTTPException) as ctx:
            extract_bearer_token("Basic dXNlcjpwYXNz")
        self.assertEqual(ctx.exception.status_code, 401)
        self.assertIn("Bearer scheme required", ctx.exception.detail)

        # Missing token part
        with self.assertRaises(HTTPException) as ctx:
            extract_bearer_token("Bearer ")
        self.assertEqual(ctx.exception.status_code, 401)

    # 3. Invalid token is rejected & 4. Expired token is rejected
    @patch.object(settings, "SUPABASE_JWT_SECRET", "test-secret-key-32-bytes-minimum-length-for-hs256")
    def test_verify_jwt_token_validation(self):
        # Expired token
        with self.assertRaises(HTTPException) as ctx:
            verify_jwt_token(self.expired_token_a)
        self.assertEqual(ctx.exception.status_code, 401)
        self.assertIn("expired", ctx.exception.detail.lower())

        # Malformed JWT structure
        with self.assertRaises(HTTPException) as ctx:
            verify_jwt_token("not-a-jwt")
        self.assertEqual(ctx.exception.status_code, 401)
        self.assertIn("malformed", ctx.exception.detail.lower())

        # Unsigned token rejection
        with self.assertRaises(HTTPException) as ctx:
            verify_jwt_token(self.unsigned_token)
        self.assertEqual(ctx.exception.status_code, 401)
        self.assertIn("unsigned", ctx.exception.detail.lower())

    # 5. Missing or invalid subject claim is rejected
    @patch.object(settings, "SUPABASE_JWT_SECRET", "test-secret-key-32-bytes-minimum-length-for-hs256")
    def test_missing_or_invalid_sub_claim_rejected(self):
        # Token missing sub claim
        no_sub_token = jwt.encode(
            {"email": "test@example.com", "exp": int(time.time()) + 3600},
            self.test_secret,
            algorithm="HS256",
        )
        with self.assertRaises(HTTPException) as ctx:
            verify_jwt_token(no_sub_token)
        self.assertEqual(ctx.exception.status_code, 401)
        self.assertIn("missing subject", ctx.exception.detail.lower())

        # Token with non-UUID sub claim
        bad_sub_token = jwt.encode(
            {"sub": "not-a-uuid", "exp": int(time.time()) + 3600},
            self.test_secret,
            algorithm="HS256",
        )
        with self.assertRaises(HTTPException) as ctx:
            verify_jwt_token(bad_sub_token)
        self.assertEqual(ctx.exception.status_code, 401)
        self.assertIn("not a valid uuid", ctx.exception.detail.lower())

    # 6. Valid token returns expected AuthenticatedUser
    @patch.object(settings, "SUPABASE_JWT_SECRET", "test-secret-key-32-bytes-minimum-length-for-hs256")
    def test_valid_token_decodes_correctly(self):
        user = verify_jwt_token(self.valid_token_a)
        self.assertEqual(user.user_id, self.user_a_id)
        self.assertEqual(user.email, "usera@example.com")
        self.assertEqual(user.role, "authenticated")

    # 7. Verification service errors are handled safely
    @patch.object(settings, "SUPABASE_JWT_SECRET", None)
    @patch("app.core.auth.is_supabase_configured", return_value=False)
    def test_unconfigured_auth_service_returns_503(self, mock_supa_conf):
        valid_structure_token = jwt.encode({"sub": self.user_a_id}, "any-key", algorithm="HS256")
        with self.assertRaises(HTTPException) as ctx:
            verify_jwt_token(valid_structure_token)
        self.assertEqual(ctx.exception.status_code, 503)

    # 7b. Invalid audience is rejected
    @patch.object(settings, "SUPABASE_JWT_SECRET", "test-secret-key-32-bytes-minimum-length-for-hs256")
    def test_invalid_audience_rejected(self):
        wrong_aud_token = jwt.encode(
            {
                "sub": self.user_a_id,
                "aud": "wrong_audience",
                "exp": int(time.time()) + 3600,
            },
            self.test_secret,
            algorithm="HS256",
        )
        with self.assertRaises(HTTPException) as ctx:
            verify_jwt_token(wrong_aud_token)
        self.assertEqual(ctx.exception.status_code, 401)
        self.assertIn("audience", ctx.exception.detail.lower())

    # 7c. Anonymous role tokens are rejected
    @patch.object(settings, "SUPABASE_JWT_SECRET", "test-secret-key-32-bytes-minimum-length-for-hs256")
    def test_anon_role_token_rejected(self):
        anon_token = jwt.encode(
            {
                "sub": self.user_a_id,
                "role": "anon",
                "exp": int(time.time()) + 3600,
            },
            self.test_secret,
            algorithm="HS256",
        )
        with self.assertRaises(HTTPException) as ctx:
            verify_jwt_token(anon_token)
        self.assertEqual(ctx.exception.status_code, 401)
        self.assertIn("anonymous", ctx.exception.detail.lower())

    # 7d. Fallback to Supabase Auth API when secret is not configured
    @patch.object(settings, "SUPABASE_JWT_SECRET", None)
    @patch("app.core.auth.is_supabase_configured", return_value=True)
    @patch("app.core.auth.get_supabase_client")
    def test_supabase_auth_api_fallback_success(self, mock_get_client, mock_is_conf):
        mock_client = MagicMock()
        mock_user = MagicMock()
        mock_user.id = self.user_a_id
        mock_user.email = "usera@example.com"
        mock_user.role = "authenticated"
        mock_resp = MagicMock()
        mock_resp.user = mock_user
        mock_client.auth.get_user.return_value = mock_resp
        mock_get_client.return_value = mock_client

        dummy_jwt = jwt.encode({"sub": self.user_a_id}, "any-key", algorithm="HS256")
        user = verify_jwt_token(dummy_jwt)
        self.assertEqual(user.user_id, self.user_a_id)
        self.assertEqual(user.email, "usera@example.com")
        mock_client.auth.get_user.assert_called_once_with(dummy_jwt)

    # 7e. Token rejected by Supabase Auth API returns 401
    @patch.object(settings, "SUPABASE_JWT_SECRET", None)
    @patch("app.core.auth.is_supabase_configured", return_value=True)
    @patch("app.core.auth.get_supabase_client")
    def test_supabase_auth_api_rejection_returns_401(self, mock_get_client, mock_is_conf):
        mock_client = MagicMock()
        mock_client.auth.get_user.side_effect = Exception("Invalid token or signature")
        mock_get_client.return_value = mock_client

        dummy_jwt = jwt.encode({"sub": self.user_a_id}, "any-key", algorithm="HS256")
        with self.assertRaises(HTTPException) as ctx:
            verify_jwt_token(dummy_jwt)
        self.assertEqual(ctx.exception.status_code, 401)
        self.assertIn("invalid or expired", ctx.exception.detail.lower())

    # -------------------------------------------------------------------------
    # PART 2: DOCUMENT UPLOAD & RETRIEVAL AUTHORIZATION
    # -------------------------------------------------------------------------

    # 8. Authenticated user can upload a document & 9. Upload uses authenticated user ID
    @patch("app.api.documents.upload_document")
    @patch("app.api.documents.save_document_metadata")
    @patch("app.api.documents.index_document")
    @patch("app.api.documents.extract_text_from_pdf")
    def test_authenticated_upload_uses_token_identity(
        self, mock_pdf, mock_index, mock_save_meta, mock_upload
    ):
        mock_pdf.return_value = "Extracted resume content."
        mock_upload.return_value = {"path": f"{self.user_a_id}/resume.pdf"}
        mock_save_meta.return_value = {
            "id": self.doc_a_id,
            "user_id": self.user_a_id,
            "file_name": "resume.pdf",
            "storage_path": f"{self.user_a_id}/resume.pdf",
            "file_type": "application/pdf",
            "file_size": len(self.sample_pdf_bytes),
        }
        mock_index.return_value = {"success": True, "chunks_count": 1}

        # Override auth dependency with User A
        app.dependency_overrides[get_current_user] = lambda: self.user_a
        try:
            res = self.client.post(
                "/api/v1/documents/upload",
                files={"file": ("resume.pdf", io.BytesIO(self.sample_pdf_bytes), "application/pdf")},
            )
            self.assertEqual(res.status_code, 200)
            mock_save_meta.assert_called_once()
            called_user_id = mock_save_meta.call_args[1]["user_id"]
            self.assertEqual(called_user_id, self.user_a_id)
        finally:
            app.dependency_overrides.pop(get_current_user, None)

    # 10. Client-supplied user_id cannot override authenticated identity
    @patch("app.api.documents.upload_document")
    @patch("app.api.documents.save_document_metadata")
    @patch("app.api.documents.index_document")
    @patch("app.api.documents.extract_text_from_pdf")
    def test_client_user_id_cannot_override_token_identity(
        self, mock_pdf, mock_index, mock_save_meta, mock_upload
    ):
        mock_pdf.return_value = "Content"
        mock_upload.return_value = {"path": f"{self.user_a_id}/resume.pdf"}
        mock_save_meta.return_value = {
            "id": self.doc_a_id,
            "user_id": self.user_a_id,
            "file_name": "resume.pdf",
            "storage_path": f"{self.user_a_id}/resume.pdf",
            "file_type": "application/pdf",
            "file_size": 100,
        }
        mock_index.return_value = {"success": True, "chunks_count": 1}

        # User A is authenticated, but malicious client sends User B's ID in form data
        app.dependency_overrides[get_current_user] = lambda: self.user_a
        try:
            res = self.client.post(
                "/api/v1/documents/upload",
                data={"user_id": self.user_b_id},  # Impersonation attempt
                files={"file": ("resume.pdf", io.BytesIO(self.sample_pdf_bytes), "application/pdf")},
            )
            self.assertEqual(res.status_code, 200)
            called_user_id = mock_save_meta.call_args[1]["user_id"]
            # Must strictly use User A's ID
            self.assertEqual(called_user_id, self.user_a_id)
            self.assertNotEqual(called_user_id, self.user_b_id)
        finally:
            app.dependency_overrides.pop(get_current_user, None)

    # 11. User can retrieve their own document
    @patch("app.api.documents.get_document_metadata")
    @patch("app.api.documents.download_document")
    @patch("app.api.documents.extract_text_from_pdf")
    def test_user_can_retrieve_own_document(self, mock_extract, mock_download, mock_meta):
        mock_meta.return_value = {
            "id": self.doc_a_id,
            "user_id": self.user_a_id,
            "file_name": "resume.pdf",
            "storage_path": f"{self.user_a_id}/{self.doc_a_id}_resume.pdf",
            "file_type": "application/pdf",
            "file_size": len(self.sample_pdf_bytes),
        }
        mock_download.return_value = self.sample_pdf_bytes
        mock_extract.return_value = "User A resume content"

        app.dependency_overrides[get_current_user] = lambda: self.user_a
        try:
            res = self.client.get(f"/api/v1/documents/{self.doc_a_id}")
            self.assertEqual(res.status_code, 200)
            self.assertEqual(res.json()["document_id"], self.doc_a_id)
        finally:
            app.dependency_overrides.pop(get_current_user, None)

    # 12. User cannot retrieve another user's document & 13. Unauthorized retrieval does not download file
    @patch("app.api.documents.get_document_metadata")
    @patch("app.api.documents.download_document")
    def test_user_cannot_retrieve_other_users_document(self, mock_download, mock_meta):
        # Document belongs to User B
        mock_meta.return_value = {
            "id": self.doc_b_id,
            "user_id": self.user_b_id,
            "file_name": "private_b.pdf",
            "storage_path": f"{self.user_b_id}/{self.doc_b_id}_private_b.pdf",
            "file_type": "application/pdf",
            "file_size": 2048,
        }

        # User A attempts to retrieve User B's document
        app.dependency_overrides[get_current_user] = lambda: self.user_a
        try:
            res = self.client.get(f"/api/v1/documents/{self.doc_b_id}")
            # Returns non-disclosing 404
            self.assertEqual(res.status_code, 404)
            # Storage download must NEVER be invoked
            mock_download.assert_not_called()
        finally:
            app.dependency_overrides.pop(get_current_user, None)

    # -------------------------------------------------------------------------
    # PART 3: SEMANTIC SEARCH AUTHORIZATION
    # -------------------------------------------------------------------------

    # 14. User can search their own document & 15. User cannot search another user's document
    @patch("app.api.search.search_similar_chunks")
    def test_search_forwards_authenticated_user_id(self, mock_search):
        mock_search.return_value = []

        app.dependency_overrides[get_current_user] = lambda: self.user_a
        try:
            res = self.client.post(
                "/api/v1/search",
                json={"query": "accessibility skills", "document_id": self.doc_a_id},
            )
            self.assertEqual(res.status_code, 200)
            mock_search.assert_called_once_with(
                query="accessibility skills",
                limit=5,
                document_id=self.doc_a_id,
                user_id=self.user_a_id,
            )
        finally:
            app.dependency_overrides.pop(get_current_user, None)

    # 16. Global search is scoped to authenticated user's documents & 17. Search results isolated
    @patch("app.services.semantic_search.get_user_document_ids")
    @patch("app.services.semantic_search.is_gemini_configured", return_value=True)
    @patch("app.services.semantic_search.is_supabase_configured", return_value=True)
    @patch("app.services.semantic_search.generate_embedding")
    @patch("app.services.semantic_search.get_supabase_client")
    def test_search_service_scopes_to_user_documents(
        self, mock_get_client, mock_gen_emb, mock_supa_conf, mock_gemini_conf, mock_get_doc_ids
    ):
        from app.services.semantic_search import search_similar_chunks

        mock_gen_emb.return_value = [0.01] * settings.EMBEDDING_DIMENSION
        # User A owns only Doc A
        mock_get_doc_ids.return_value = [self.doc_a_id]

        mock_client = MagicMock()
        mock_res = MagicMock()
        # Simulated RPC returns chunks for Doc A and unauthorized Doc B
        mock_res.data = [
            {
                "id": "c1",
                "document_id": self.doc_a_id,
                "chunk_index": 0,
                "content": "Doc A content",
                "start_char": 0,
                "end_char": 10,
                "similarity": 0.95,
            },
            {
                "id": "c2",
                "document_id": self.doc_b_id,  # Other user's chunk
                "chunk_index": 0,
                "content": "Doc B content",
                "start_char": 0,
                "end_char": 10,
                "similarity": 0.96,
            },
        ]
        mock_client.rpc.return_value.execute.return_value = mock_res
        mock_get_client.return_value = mock_client

        results = search_similar_chunks("test query", user_id=self.user_a_id)

        # Defense-in-depth: Chunk belonging to Doc B must be excluded
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]["document_id"], self.doc_a_id)

    # -------------------------------------------------------------------------
    # PART 4: RAG QUESTION ANSWERING AUTHORIZATION
    # -------------------------------------------------------------------------

    # 18. User can ask questions about own document & 20. RAG global search scoped to user
    @patch("app.api.rag.answer_question")
    def test_rag_ask_forwards_authenticated_user_id(self, mock_answer):
        mock_answer.return_value = {
            "question": "What tools?",
            "answer": "NVDA screen reader.",
            "sources": [],
            "has_context": True,
        }

        app.dependency_overrides[get_current_user] = lambda: self.user_a
        try:
            res = self.client.post("/api/v1/ask", json={"question": "What tools?"})
            self.assertEqual(res.status_code, 200)
            mock_answer.assert_called_once_with(
                question="What tools?",
                document_id=None,
                limit=5,
                user_id=self.user_a_id,
            )
        finally:
            app.dependency_overrides.pop(get_current_user, None)

    # 19. User cannot ask questions using another user's document
    @patch("app.api.rag.answer_question")
    def test_rag_rejects_unowned_document(self, mock_answer):
        from app.services.rag_service import RAGServiceError
        mock_answer.side_effect = RAGServiceError(f"Document with ID '{self.doc_b_id}' not found.")

        app.dependency_overrides[get_current_user] = lambda: self.user_a
        try:
            res = self.client.post(
                "/api/v1/ask",
                json={"question": "What tools?", "document_id": self.doc_b_id},
            )
            self.assertEqual(res.status_code, 404)
        finally:
            app.dependency_overrides.pop(get_current_user, None)

    # -------------------------------------------------------------------------
    # PART 5: ENDPOINT PROTECTION & MONITORING POLICIES
    # -------------------------------------------------------------------------

    # 22. Unauthenticated simplification requests are rejected
    def test_unauthenticated_requests_rejected(self):
        # All protected endpoints should return 401 when no token is supplied
        res_upload = self.client.post("/api/v1/documents/upload")
        self.assertEqual(res_upload.status_code, 401)

        res_get_doc = self.client.get(f"/api/v1/documents/{self.doc_a_id}")
        self.assertEqual(res_get_doc.status_code, 401)

        res_search = self.client.post("/api/v1/search", json={"query": "test"})
        self.assertEqual(res_search.status_code, 401)

        res_ask = self.client.post("/api/v1/ask", json={"question": "test"})
        self.assertEqual(res_ask.status_code, 401)

        res_simplify = self.client.post("/api/v1/simplify", json={"text": "test text"})
        self.assertEqual(res_simplify.status_code, 401)

        res_gemini = self.client.post("/api/v1/gemini/test", json={"prompt": "test"})
        self.assertEqual(res_gemini.status_code, 401)

        res_db_health = self.client.get("/api/v1/db-health")
        self.assertEqual(res_db_health.status_code, 401)

    # 23. Authenticated simplification works
    @patch("app.api.simplification.simplify_text")
    def test_authenticated_simplification_succeeds(self, mock_simplify):
        mock_simplify.return_value = {
            "original_text": "Complex sentence.",
            "simplified_text": "Simple sentence.",
            "level": "basic",
        }

        app.dependency_overrides[get_current_user] = lambda: self.user_a
        try:
            res = self.client.post(
                "/api/v1/simplify",
                json={"text": "Complex sentence.", "level": "basic"},
            )
            self.assertEqual(res.status_code, 200)
            self.assertEqual(res.json()["simplified_text"], "Simple sentence.")
        finally:
            app.dependency_overrides.pop(get_current_user, None)

    # 24. Public health and status endpoints remain accessible without authentication
    def test_public_endpoints_accessible_without_token(self):
        res_root = self.client.get("/")
        self.assertEqual(res_root.status_code, 200)

        res_health = self.client.get("/health")
        self.assertEqual(res_health.status_code, 200)

        res_status = self.client.get("/api/v1/status")
        self.assertEqual(res_status.status_code, 200)

    # 25. Gemini test endpoint follows policy
    @patch("app.api.gemini.generate_text")
    @patch("app.api.gemini.is_gemini_configured", return_value=True)
    def test_gemini_test_endpoint_requires_auth_and_works_in_dev(self, mock_gemini_conf, mock_gen_text):
        mock_gen_text.return_value = "Gemini response"

        app.dependency_overrides[get_current_user] = lambda: self.user_a
        try:
            res = self.client.post(
                "/api/v1/gemini/test",
                json={"prompt": "Hello Gemini"},
            )
            self.assertEqual(res.status_code, 200)
            self.assertTrue(res.json()["success"])
        finally:
            app.dependency_overrides.pop(get_current_user, None)


if __name__ == "__main__":
    unittest.main()
