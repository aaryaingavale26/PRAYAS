import unittest
from starlette.testclient import TestClient
from app.main import app

class TestIntegrationEndpoints(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)

    def test_health_alias(self):
        res = self.client.get("/api/health")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["status"], "ok")

    def test_profile_endpoints(self):
        # 1. GET Profile
        res = self.client.get("/api/profile")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data["success"])
        self.assertIn("passport", data)
        self.assertEqual(data["passport"]["fullName"], "Priyanshu Sharma")

        # 2. POST Profile update
        update_payload = {"fullName": "Priyanshu Sharma (Verified)", "textSize": "large"}
        update_res = self.client.post("/api/profile", json=update_payload)
        self.assertEqual(update_res.status_code, 200)
        updated_data = update_res.json()
        self.assertEqual(updated_data["passport"]["fullName"], "Priyanshu Sharma (Verified)")
        self.assertEqual(updated_data["passport"]["textSize"], "large")

    def test_audit_report_endpoints(self):
        # 1. POST audit report
        sample_report = {
            "reportId": "rep-test-001",
            "url": "http://localhost:3000/demo/job-application.html",
            "pageTitle": "GlobalTech Application Test",
            "detectedIssuesCount": 3,
            "verifiedImprovementsCount": 2,
            "unresolvedIssuesCount": 1,
            "issues": [
                {
                    "id": "iss-1",
                    "element": "input#applicant-phone",
                    "type": "Unassociated Label",
                    "status": "Auto-Remediated by PRAYAS"
                }
            ]
        }
        post_res = self.client.post("/api/audit-report", json=sample_report)
        self.assertEqual(post_res.status_code, 200)
        self.assertTrue(post_res.json()["success"])

        # 2. GET audit reports
        get_res = self.client.get("/api/audit-report")
        self.assertEqual(get_res.status_code, 200)
        reports_data = get_res.json()
        self.assertTrue(reports_data["success"])
        self.assertGreaterEqual(reports_data["count"], 1)

    def test_rag_endpoints_for_all_members(self):
        # Member 3 contract: POST /api/rag-answer
        res3 = self.client.post("/api/rag-answer", json={"question": "Why are you interested in this role?"})
        self.assertEqual(res3.status_code, 200)
        data3 = res3.json()
        self.assertTrue(data3["success"])
        self.assertIn("draftAnswer", data3)
        self.assertIn("sourcesUsed", data3)

        # Member 4 contract: POST /api/v1/generate-answer
        res4 = self.client.post("/api/v1/generate-answer", json={
            "question": "Describe a complex challenge you solved.",
            "field_id": "challenge_field"
        })
        self.assertEqual(res4.status_code, 200)
        data4 = res4.json()
        self.assertTrue(data4["success"])
        self.assertIn("draft_answer", data4)
        self.assertTrue(data4["evidence_found"])

        # Member 1 contract: POST /api/rag/query
        res1 = self.client.post("/api/rag/query", json={
            "question": "What accommodations do you need?",
            "preferences": {"simplifiedLanguage": True}
        })
        self.assertEqual(res1.status_code, 200)
        data1 = res1.json()
        self.assertIn("answer", data1)
        self.assertIn("sources", data1)

    def test_demo_bearer_token_authentication(self):
        # Test that protected /api/v1/status or db-health endpoint accepts the demo token
        res = self.client.get(
            "/api/v1/db-health",
            headers={"Authorization": "Bearer prayas_demo_bearer_token"}
        )
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("database", data)

if __name__ == "__main__":
    unittest.main()
