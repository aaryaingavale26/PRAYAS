import unittest
from unittest.mock import patch

from starlette.testclient import TestClient

from app.core.rate_limit import reset_rate_limits
from app.main import app

AUTH_A = {"Authorization": "Bearer prayas_demo_bearer_token"}

_store = {}


def _fake_get(user_id):
    return _store.get(user_id) or {"passport_data": {}, "extracted_profile": {}, "field_sources": {}}


def _fake_save(user_id, passport_data, extracted_profile=None, field_sources=None):
    cur = _fake_get(user_id)
    _store[user_id] = {
        "passport_data": passport_data,
        "extracted_profile": extracted_profile if extracted_profile is not None else cur["extracted_profile"],
        "field_sources": field_sources if field_sources is not None else cur["field_sources"],
    }
    return _store[user_id]


class TestIntegrationEndpoints(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)

    def setUp(self):
        reset_rate_limits()
        _store.clear()

    def test_health_alias(self):
        res = self.client.get("/api/health")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["status"], "ok")

    def test_profile_requires_auth(self):
        self.assertEqual(self.client.get("/api/profile").status_code, 401)
        self.assertEqual(self.client.post("/api/profile", json={"fullName": "x"}).status_code, 401)

    @patch("app.api.integration.reindex_profile", return_value={})
    @patch("app.api.integration.save_passport_record", side_effect=_fake_save)
    @patch("app.api.integration.get_passport_record", side_effect=_fake_get)
    def test_profile_endpoints_start_empty_and_save(self, *_):
        res = self.client.get("/api/profile", headers=AUTH_A)
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["passport"], {})  # no fake persona

        upd = self.client.post("/api/profile", json={"fullName": "Asha Rao", "textSize": "large"}, headers=AUTH_A)
        self.assertEqual(upd.status_code, 200)
        body = upd.json()
        self.assertEqual(body["passport"]["fullName"], "Asha Rao")
        self.assertEqual(body["field_sources"]["fullName"], "user")

    def test_audit_report_endpoints(self):
        sample_report = {
            "reportId": "rep-test-001",
            "url": "http://localhost:3000/demo/job-application.html",
            "pageTitle": "GlobalTech Application Test",
            "detectedIssuesCount": 3,
            "issues": [{"id": "iss-1", "element": "input#applicant-phone", "type": "Unassociated Label"}],
        }
        post_res = self.client.post("/api/audit-report", json=sample_report)
        self.assertEqual(post_res.status_code, 200)
        get_res = self.client.get("/api/audit-report")
        self.assertGreaterEqual(get_res.json()["count"], 1)

    def test_rag_endpoints_require_auth(self):
        for path in ("/api/rag-answer", "/api/v1/generate-answer", "/api/rag/query"):
            res = self.client.post(path, json={"question": "What are my skills?"})
            self.assertEqual(res.status_code, 401, path)

    @patch("app.api.integration.answer_for_user")
    def test_all_rag_endpoints_share_same_scoped_logic(self, mock_answer):
        mock_answer.return_value = {
            "answer": "Your skills are Python and SQL.",
            "found": True,
            "empty_state": False,
            "has_context": True,
            "sources": [{"document_name": "Resume.pdf", "doc_type": "resume", "snippet": "Python, SQL", "chunk_index": 0}],
            "upload_url": "/documents",
        }
        r3 = self.client.post("/api/rag-answer", json={"question": "Skills?", "user_id": "someone-else"}, headers=AUTH_A)
        r4 = self.client.post("/api/v1/generate-answer", json={"question": "Skills?"}, headers=AUTH_A)
        r1 = self.client.post("/api/rag/query", json={"question": "Skills?"}, headers=AUTH_A)
        self.assertEqual(r3.json()["draftAnswer"], "Your skills are Python and SQL.")
        self.assertEqual(r3.json()["sourcesUsed"], ["Resume.pdf"])
        self.assertEqual(r4.json()["draft_answer"], "Your skills are Python and SQL.")
        self.assertTrue(r4.json()["evidence_found"])
        self.assertEqual(r1.json()["answer"], "Your skills are Python and SQL.")
        # Identity always comes from the token, never from the request body
        used_ids = {call.args[0] for call in mock_answer.call_args_list}
        self.assertEqual(len(used_ids), 1)
        self.assertNotIn("someone-else", used_ids)

    @patch("app.api.integration.answer_for_user")
    def test_not_found_is_honest(self, mock_answer):
        mock_answer.return_value = {
            "answer": "I couldn't find this in your uploaded documents. Upload your certificates.",
            "found": False, "empty_state": False, "has_context": True, "sources": [], "upload_url": "/documents",
        }
        res = self.client.post("/api/rag/query", json={"question": "What is my GPA?"}, headers=AUTH_A)
        self.assertIn("couldn't find this in your uploaded documents", res.json()["answer"])
        self.assertFalse(res.json()["found"])
        self.assertEqual(res.json()["sources"], [])

    def test_demo_bearer_token_authentication(self):
        res = self.client.get("/api/v1/db-health", headers=AUTH_A)
        self.assertEqual(res.status_code, 200)
        self.assertIn("database", res.json())


if __name__ == "__main__":
    unittest.main()
