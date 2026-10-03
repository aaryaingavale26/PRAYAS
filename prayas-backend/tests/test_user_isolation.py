import unittest
import uuid
from unittest.mock import MagicMock, patch

from starlette.testclient import TestClient

from app.core.rate_limit import reset_rate_limits
from app.main import app
from app.services import knowledge_service as ks
from app.services.cv_extraction_service import (
    build_diff,
    merge_without_overwrite,
    normalize_extraction,
    to_passport_fields,
)

USER_A = "11111111-1111-1111-1111-111111111111"
USER_B = "22222222-2222-2222-2222-222222222222"
DOC_A = str(uuid.uuid4())
DOC_B = str(uuid.uuid4())

DOCS = {
    USER_A: [{"id": DOC_A, "user_id": USER_A, "file_name": "A_Resume.pdf", "doc_type": "resume"}],
    USER_B: [{"id": DOC_B, "user_id": USER_B, "file_name": "B_Resume.pdf", "doc_type": "resume"}],
}


def _list_docs(user_id):
    return list(DOCS.get(user_id, []))


def _owner_meta(document_id, user_id):
    for d in DOCS.get(user_id, []):
        if d["id"] == document_id:
            return d
    return None


class TestUserIsolation(unittest.TestCase):
    """User B must never retrieve, delete, re-index or read user A's data."""

    def setUp(self):
        reset_rate_limits()

    @patch("app.services.knowledge_service.is_gemini_configured", return_value=True)
    @patch("app.services.knowledge_service.generate_text")
    @patch("app.services.knowledge_service.search_similar_chunks")
    @patch("app.services.knowledge_service.get_passport_record", return_value={"passport_data": {}, "extracted_profile": {}, "field_sources": {}})
    @patch("app.services.knowledge_service.list_user_documents", side_effect=_list_docs)
    def test_foreign_chunks_are_dropped_and_search_is_user_scoped(self, _l, _p, mock_search, mock_gen, _g):
        # Even if the vector store wrongly returned A's chunk for B, it must be dropped.
        mock_search.return_value = [
            {"document_id": DOC_A, "chunk_index": 0, "content": "SECRET of user A: Python", "similarity": 0.9},
            {"document_id": DOC_B, "chunk_index": 0, "content": "User B knows Go", "similarity": 0.8},
        ]
        mock_gen.return_value = '{"found": true, "answer": "Your skill is Go.", "used_profile": false, "suggestion": ""}'

        result = ks.answer_for_user(USER_B, "What are my skills?")

        self.assertEqual(mock_search.call_args.kwargs["user_id"], USER_B)
        prompt = mock_gen.call_args.kwargs["prompt"]
        self.assertNotIn("SECRET of user A", prompt)
        self.assertIn("User B knows Go", prompt)
        names = {s["document_name"] for s in result["sources"]}
        self.assertEqual(names, {"B_Resume.pdf"})

    @patch("app.services.knowledge_service.get_user_document_metadata", side_effect=_owner_meta)
    @patch("app.services.knowledge_service.delete_document_chunks")
    def test_user_b_cannot_delete_or_reindex_user_a_document(self, mock_del_chunks, _m):
        with self.assertRaises(ks.DocumentNotFoundError):
            ks.delete_user_document(USER_B, DOC_A)
        with self.assertRaises(ks.DocumentNotFoundError):
            ks.reindex_user_document(USER_B, DOC_A)
        mock_del_chunks.assert_not_called()

    @patch("app.services.knowledge_service.get_user_document_metadata", side_effect=_owner_meta)
    @patch("app.services.knowledge_service.delete_document")
    @patch("app.services.knowledge_service._client")
    @patch("app.services.knowledge_service.delete_document_chunks")
    def test_owner_delete_removes_chunks(self, mock_del_chunks, _c, _d, _m):
        ks.delete_user_document(USER_A, DOC_A)
        mock_del_chunks.assert_called_once_with(DOC_A)

    @patch("app.services.knowledge_service.is_gemini_configured", return_value=True)
    @patch("app.services.knowledge_service.get_passport_record", return_value={"passport_data": {}, "extracted_profile": {}, "field_sources": {}})
    @patch("app.services.knowledge_service.list_user_documents", return_value=[])
    def test_empty_state_when_no_documents(self, *_):
        result = ks.answer_for_user(USER_B, "What are my skills?")
        self.assertTrue(result["empty_state"])
        self.assertFalse(result["found"])
        self.assertEqual(result["upload_url"], "/documents")

    @patch("app.services.knowledge_service.is_gemini_configured", return_value=True)
    @patch("app.services.knowledge_service.generate_text", return_value='{"found": false, "answer": "", "used_profile": false, "suggestion": "Upload your transcript."}')
    @patch("app.services.knowledge_service.search_similar_chunks", return_value=[])
    @patch("app.services.knowledge_service.get_passport_record", return_value={"passport_data": {}, "extracted_profile": {}, "field_sources": {}})
    @patch("app.services.knowledge_service.list_user_documents", side_effect=_list_docs)
    def test_not_in_documents_gives_plain_not_found(self, *_):
        result = ks.answer_for_user(USER_A, "What is my GPA?")
        self.assertFalse(result["found"])
        self.assertIn("I couldn't find this in your uploaded documents", result["answer"])
        self.assertIn("Upload your transcript", result["answer"])
        self.assertEqual(result["sources"], [])

    @patch("app.api.documents.get_document_metadata")
    def test_signed_url_is_owner_only(self, mock_meta):
        mock_meta.return_value = {"id": DOC_A, "user_id": "someone-else-entirely", "storage_path": "x/y.pdf"}
        client = TestClient(app)
        res = client.get(f"/api/v1/documents/{DOC_A}/url", headers={"Authorization": "Bearer prayas_demo_bearer_token"})
        self.assertEqual(res.status_code, 404)

    def test_endpoints_require_auth(self):
        client = TestClient(app)
        for method, path in [
            ("get", "/api/v1/documents"),
            ("delete", f"/api/v1/documents/{DOC_A}"),
            ("post", f"/api/v1/documents/{DOC_A}/reindex"),
            ("get", "/api/v1/onboarding/status"),
            ("post", "/api/v1/onboarding/skip"),
        ]:
            self.assertEqual(getattr(client, method)(path).status_code, 401, path)

    def test_rate_limit_triggers(self):
        from app.core.config import settings
        client = TestClient(app)
        headers = {"Authorization": "Bearer prayas_demo_bearer_token"}
        with patch("app.api.integration.answer_for_user", return_value={
            "answer": "ok", "found": True, "empty_state": False, "has_context": True, "sources": [], "upload_url": "/documents",
        }):
            codes = [
                client.post("/api/rag/query", json={"question": "hi"}, headers=headers).status_code
                for _ in range(settings.RATE_LIMIT_PER_MINUTE + 2)
            ]
        self.assertIn(429, codes)
        self.assertEqual(codes[0], 200)


class TestCVExtractionRules(unittest.TestCase):
    CV = "Asha Rao\nasha@example.com\nSkills: Python, SQL\nB.Tech Computer Science, VIT, 2020"

    def test_missing_phone_stays_empty_even_if_llm_invents_one(self):
        raw = {"full_name": "Asha Rao", "email": "asha@example.com", "phone": "+91 99999 11111", "skills": ["Python", "SQL"]}
        profile, _conf = normalize_extraction(raw, self.CV)
        self.assertFalse(profile.get("phone"))
        self.assertNotIn("phone", to_passport_fields(profile))

    def test_passport_number_not_invented(self):
        raw = {"full_name": "Asha Rao", "passport_number": "Z1234567"}
        profile, _ = normalize_extraction(raw, self.CV)
        self.assertFalse(profile.get("passport_number"))

    def test_merge_never_overwrites_existing(self):
        existing = {"fullName": "Asha (edited)", "phone": ""}
        incoming = {"fullName": "Asha Rao", "phone": "+91 1", "email": "a@b.co"}
        merged, applied, skipped = merge_without_overwrite(existing, incoming)
        self.assertEqual(merged["fullName"], "Asha (edited)")
        self.assertEqual(merged["phone"], "+91 1")
        self.assertIn("fullName", skipped)
        self.assertEqual(set(applied), {"phone", "email"})

    def test_diff_flags_new_and_changed(self):
        diff = build_diff({"fullName": "Old", "email": ""}, {"fullName": "New", "email": "x@y.zz"})
        by_field = {d["field"]: d["change"] for d in diff}
        self.assertEqual(by_field, {"fullName": "changed", "email": "new"})


if __name__ == "__main__":
    unittest.main()
