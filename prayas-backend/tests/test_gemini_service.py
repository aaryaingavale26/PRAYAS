import sys
import unittest
from pathlib import Path
from unittest.mock import MagicMock, patch

# Add backend directory to sys.path
BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_DIR))

from starlette.testclient import TestClient
from app.core.auth import AuthenticatedUser, get_current_user
from app.main import app
from app.services.gemini_service import (
    GeminiServiceError,
    generate_text,
    get_gemini_client,
    is_gemini_configured,
)


class TestGeminiService(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)
        cls.user_id = "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d"
        app.dependency_overrides[get_current_user] = lambda: AuthenticatedUser(user_id=cls.user_id)

    @classmethod
    def tearDownClass(cls):
        app.dependency_overrides.pop(get_current_user, None)

    # 1. Successful text generation
    @patch("app.services.gemini_service.is_gemini_configured", return_value=True)
    @patch("app.services.gemini_service.get_gemini_client")
    def test_generate_text_success(self, mock_get_client, mock_is_configured):
        mock_client = MagicMock()
        mock_response = MagicMock()
        mock_response.text = "This is an accessible job application explanation."
        mock_client.models.generate_content.return_value = mock_response
        mock_get_client.return_value = mock_client

        output = generate_text("What is accessibility?")

        mock_client.models.generate_content.assert_called_once()
        self.assertEqual(output, "This is an accessible job application explanation.")

    # 2. Missing API key
    @patch("app.services.gemini_service.is_gemini_configured", return_value=False)
    def test_generate_text_missing_api_key(self, mock_is_configured):
        with self.assertRaises(GeminiServiceError) as ctx:
            generate_text("Hello Gemini")
        self.assertIn("not configured", str(ctx.exception).lower())

    # 3. Empty prompt
    def test_generate_text_empty_prompt(self):
        with self.assertRaises(GeminiServiceError) as ctx_empty:
            generate_text("")
        self.assertIn("empty", str(ctx_empty.exception).lower())

        with self.assertRaises(GeminiServiceError) as ctx_whitespace:
            generate_text("   \n\t  ")
        self.assertIn("whitespace", str(ctx_whitespace.exception).lower())

    # 4. Gemini API error
    @patch("app.services.gemini_service.is_gemini_configured", return_value=True)
    @patch("app.services.gemini_service.get_gemini_client")
    def test_generate_text_api_error(self, mock_get_client, mock_is_configured):
        mock_client = MagicMock()
        mock_client.models.generate_content.side_effect = Exception("503 Service Unavailable")
        mock_get_client.return_value = mock_client

        with self.assertRaises(GeminiServiceError) as ctx:
            generate_text("Test prompt")
        self.assertIn("Failed to generate response", str(ctx.exception))

    # 5. Empty model response
    @patch("app.services.gemini_service.is_gemini_configured", return_value=True)
    @patch("app.services.gemini_service.get_gemini_client")
    def test_generate_text_empty_response(self, mock_get_client, mock_is_configured):
        mock_client = MagicMock()
        mock_response = MagicMock()
        mock_response.text = None
        mock_client.models.generate_content.return_value = mock_response
        mock_get_client.return_value = mock_client

        with self.assertRaises(GeminiServiceError) as ctx:
            generate_text("Test prompt")
        self.assertIn("empty response", str(ctx.exception).lower())

    # 6. Safe error handling without leaking secrets
    @patch("app.services.gemini_service.is_gemini_configured", return_value=True)
    @patch("app.services.gemini_service.get_gemini_client")
    def test_no_secrets_in_error_messages(self, mock_get_client, mock_is_configured):
        mock_client = MagicMock()
        sensitive_api_key = "AIzaSySecretGeminiKey123456789"
        mock_client.models.generate_content.side_effect = Exception(f"Error for key {sensitive_api_key}")
        mock_get_client.return_value = mock_client

        with self.assertRaises(GeminiServiceError) as ctx:
            generate_text("Test prompt")
        self.assertNotIn(sensitive_api_key, str(ctx.exception))

    # 7. Successful API endpoint response (POST /api/v1/gemini/test)
    @patch("app.api.gemini.is_gemini_configured", return_value=True)
    @patch("app.api.gemini.generate_text", return_value="Accessible applications help all users.")
    def test_api_endpoint_success(self, mock_generate, mock_is_configured):
        response = self.client.post(
            "/api/v1/gemini/test",
            json={"prompt": "Explain accessibility in simple terms."},
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data["success"])
        self.assertEqual(data["response"], "Accessible applications help all users.")
        mock_generate.assert_called_once_with("Explain accessibility in simple terms.")

    # 8. API behavior when Gemini is not configured
    @patch("app.api.gemini.is_gemini_configured", return_value=False)
    def test_api_endpoint_unconfigured(self, mock_is_configured):
        response = self.client.post(
            "/api/v1/gemini/test",
            json={"prompt": "Hello"},
        )
        self.assertEqual(response.status_code, 503)
        self.assertIn("not configured", response.json()["error"].lower())

    # 9. API behavior when prompt is empty
    def test_api_endpoint_empty_prompt(self):
        response = self.client.post(
            "/api/v1/gemini/test",
            json={"prompt": "   "},
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("empty", response.json()["error"].lower())


if __name__ == "__main__":
    unittest.main()
