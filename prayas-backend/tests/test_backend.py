import sys
import unittest
from pathlib import Path
from unittest.mock import patch
from starlette.testclient import TestClient

# Ensure backend directory is in python path
BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_DIR))

from app.core.auth import AuthenticatedUser, get_current_user
from app.main import app
from app.schemas.accessibility import AccessibilityProfile
from app.schemas.document import DocumentMetadata


class TestBackend(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)
        app.dependency_overrides[get_current_user] = lambda: AuthenticatedUser(
            user_id="123e4567-e89b-12d3-a456-426614174000",
            email="test@example.com",
            role="authenticated",
        )

    @classmethod
    def tearDownClass(cls):
        app.dependency_overrides.pop(get_current_user, None)

    def test_app_import_and_root(self):
        response = self.client.get("/")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["status"], "online")
        self.assertIn("version", data)

    def test_health_endpoint(self):
        response = self.client.get("/health")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["status"], "ok")
        self.assertIn("database", data)

    def test_docs_endpoints(self):
        self.assertEqual(self.client.get("/docs").status_code, 200)
        self.assertEqual(self.client.get("/redoc").status_code, 200)

    def test_api_v1_status(self):
        response = self.client.get("/api/v1/status")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["status"], "ready")

    def test_cors_headers(self):
        response = self.client.options(
            "/health",
            headers={
                "Origin": "http://localhost:3000",
                "Access-Control-Request-Method": "GET",
            },
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.headers.get("access-control-allow-origin"), "http://localhost:3000")

    def test_standardized_404_error(self):
        response = self.client.get("/non-existent-endpoint-xyz")
        self.assertEqual(response.status_code, 404)
        self.assertEqual(response.json(), {"error": "Not Found", "status_code": 404})

    def test_accessibility_schema(self):
        profile = AccessibilityProfile(
            user_id="123e4567-e89b-12d3-a456-426614174000",
            disability_type="Visual",
            preferred_assistance=["Screen Reader"],
        )
        self.assertEqual(profile.preferred_language, "en")
        self.assertEqual(profile.disability_type, "Visual")

        # Verify completely optional fields
        empty_profile = AccessibilityProfile()
        self.assertIsNone(empty_profile.user_id)

    def test_document_schema_validation(self):
        doc = DocumentMetadata(file_name="resume.pdf", file_size=1024)
        self.assertEqual(doc.file_name, "resume.pdf")
        self.assertEqual(doc.file_size, 1024)

        # Negative file size must fail validation
        with self.assertRaises(Exception):
            DocumentMetadata(file_name="resume.pdf", file_size=-100)

    @patch("app.api.router.is_supabase_configured", return_value=False)
    def test_db_health_mocked_unconfigured(self, mock_cfg):
        """
        Test /api/v1/db-health when unconfigured without calling live Supabase.
        """
        response = self.client.get("/api/v1/db-health")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertFalse(data["configured"])
        self.assertFalse(data["connected"])
        self.assertEqual(data["status"], "not_configured")

    @patch("app.api.router.is_supabase_configured", return_value=True)
    @patch("app.api.router.check_supabase_connection", return_value=(True, "Connected successfully."))
    @patch("app.api.router.check_table_access", return_value={"accessible": True, "status": "ready", "error_category": None})
    def test_db_health_mocked_connected(self, mock_table, mock_conn, mock_cfg):
        """
        Test /api/v1/db-health when connected without network dependency.
        """
        response = self.client.get("/api/v1/db-health")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data["configured"])
        self.assertTrue(data["connected"])
        self.assertEqual(data["status"], "connected")
        self.assertTrue(data["tables"]["accessibility_profiles"]["accessible"])
        self.assertTrue(data["tables"]["documents"]["accessible"])


if __name__ == "__main__":
    unittest.main()
