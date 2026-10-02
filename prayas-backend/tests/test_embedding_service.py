import sys
import unittest
from pathlib import Path
from unittest.mock import MagicMock, patch

# Add backend directory to sys.path
BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_DIR))

from app.schemas.chunk import EmbeddedTextChunk, TextChunk
from app.services.embedding_service import (
    EmbeddingServiceError,
    embed_chunks,
    embed_text_chunks,
    generate_embedding,
    generate_embeddings,
)


class TestEmbeddingService(unittest.TestCase):
    """
    Unit tests for the Gemini vector embedding service.
    All external API interactions are isolated and mocked.
    """

    # 1. Successful single-text embedding
    @patch("app.services.embedding_service.is_gemini_configured", return_value=True)
    @patch("app.services.embedding_service.get_gemini_client")
    def test_successful_single_text_embedding(self, mock_get_client, mock_is_configured):
        mock_client = MagicMock()
        mock_response = MagicMock()
        mock_embedding = MagicMock(values=[0.123, -0.456, 0.789])
        mock_response.embeddings = [mock_embedding]
        mock_client.models.embed_content.return_value = mock_response
        mock_get_client.return_value = mock_client

        result = generate_embedding("Accessible job application text")

        mock_client.models.embed_content.assert_called_once()
        self.assertEqual(result, [0.123, -0.456, 0.789])

    # 2. Successful multiple-text embedding (batch)
    @patch("app.services.embedding_service.is_gemini_configured", return_value=True)
    @patch("app.services.embedding_service.get_gemini_client")
    def test_successful_multiple_text_embedding(self, mock_get_client, mock_is_configured):
        mock_client = MagicMock()
        mock_response = MagicMock()
        mock_response.embeddings = [
            MagicMock(values=[0.1, 0.2]),
            MagicMock(values=[0.3, 0.4]),
        ]
        mock_client.models.embed_content.return_value = mock_response
        mock_get_client.return_value = mock_client

        texts = ["Text chunk one", "Text chunk two"]
        results = generate_embeddings(texts)

        self.assertEqual(len(results), 2)
        self.assertEqual(results[0], [0.1, 0.2])
        self.assertEqual(results[1], [0.3, 0.4])

    # 3. Empty text handling
    def test_empty_text_handling(self):
        with self.assertRaises(EmbeddingServiceError) as ctx_empty:
            generate_embedding("")
        self.assertIn("empty", str(ctx_empty.exception).lower())

        with self.assertRaises(EmbeddingServiceError) as ctx_ws:
            generate_embedding("   \n\t  ")
        self.assertIn("whitespace", str(ctx_ws.exception).lower())

        with self.assertRaises(EmbeddingServiceError) as ctx_batch:
            generate_embeddings(["valid string", "   "])
        self.assertIn("whitespace", str(ctx_batch.exception).lower())

    # 4. Empty list handling
    def test_empty_list_handling(self):
        self.assertEqual(generate_embeddings([]), [])
        self.assertEqual(embed_text_chunks([]), [])
        self.assertEqual(embed_chunks([]), [])

    # 5. Missing API key
    @patch("app.services.embedding_service.is_gemini_configured", return_value=False)
    def test_missing_api_key(self, mock_is_configured):
        with self.assertRaises(EmbeddingServiceError) as ctx:
            generate_embedding("Valid prompt")
        self.assertIn("not configured", str(ctx.exception).lower())

        with self.assertRaises(EmbeddingServiceError) as ctx_batch:
            generate_embeddings(["Text one", "Text two"])
        self.assertIn("not configured", str(ctx_batch.exception).lower())

    # 6. Gemini API error
    @patch("app.services.embedding_service.is_gemini_configured", return_value=True)
    @patch("app.services.embedding_service.get_gemini_client")
    def test_gemini_api_error(self, mock_get_client, mock_is_configured):
        mock_client = MagicMock()
        mock_client.models.embed_content.side_effect = Exception("503 Service Unavailable")
        mock_get_client.return_value = mock_client

        with self.assertRaises(EmbeddingServiceError) as ctx:
            generate_embedding("Testing error handling")
        self.assertIn("Failed to generate embeddings", str(ctx.exception))

    # 7. Invalid input types
    def test_invalid_input_types(self):
        # Single text invalid types
        for invalid_val in [None, 12345, True, ["not", "string"]]:
            with self.assertRaises(EmbeddingServiceError):
                generate_embedding(invalid_val)  # type: ignore

        # Multiple texts invalid types
        for invalid_batch in [None, "just a string", 12345, [123, "valid string"]]:
            with self.assertRaises(EmbeddingServiceError):
                generate_embeddings(invalid_batch)  # type: ignore

        # Invalid chunk types in embed_text_chunks
        with self.assertRaises(EmbeddingServiceError):
            embed_text_chunks(None)  # type: ignore
        with self.assertRaises(EmbeddingServiceError):
            embed_text_chunks(["not a TextChunk object"])  # type: ignore

    # 8. Output is a list of floating-point numbers
    @patch("app.services.embedding_service.is_gemini_configured", return_value=True)
    @patch("app.services.embedding_service.get_gemini_client")
    def test_output_is_list_of_floats(self, mock_get_client, mock_is_configured):
        mock_client = MagicMock()
        mock_response = MagicMock()
        mock_response.embeddings = [MagicMock(values=[1, 2.5, -3])]
        mock_client.models.embed_content.return_value = mock_response
        mock_get_client.return_value = mock_client

        output = generate_embedding("Float type verification")

        self.assertIsInstance(output, list)
        self.assertTrue(all(isinstance(val, float) for val in output))
        self.assertEqual(output, [1.0, 2.5, -3.0])

    # 9. Embedded chunks preserve chunk indexes and character positions
    @patch("app.services.embedding_service.is_gemini_configured", return_value=True)
    @patch("app.services.embedding_service.get_gemini_client")
    def test_embedded_chunks_preserve_metadata(self, mock_get_client, mock_is_configured):
        mock_client = MagicMock()
        mock_response = MagicMock()
        mock_response.embeddings = [
            MagicMock(values=[0.11, 0.22]),
            MagicMock(values=[0.33, 0.44]),
        ]
        mock_client.models.embed_content.return_value = mock_response
        mock_get_client.return_value = mock_client

        chunks = [
            TextChunk(chunk_index=0, text="First paragraph chunk", start_char=0, end_char=21),
            TextChunk(chunk_index=1, text="Second paragraph chunk", start_char=15, end_char=37),
        ]

        embedded_chunks = embed_text_chunks(chunks)

        self.assertEqual(len(embedded_chunks), 2)
        for i, emb_chunk in enumerate(embedded_chunks):
            self.assertIsInstance(emb_chunk, EmbeddedTextChunk)
            self.assertEqual(emb_chunk.chunk_index, chunks[i].chunk_index)
            self.assertEqual(emb_chunk.text, chunks[i].text)
            self.assertEqual(emb_chunk.start_char, chunks[i].start_char)
            self.assertEqual(emb_chunk.end_char, chunks[i].end_char)

        self.assertEqual(embedded_chunks[0].embedding, [0.11, 0.22])
        self.assertEqual(embedded_chunks[1].embedding, [0.33, 0.44])

    # 10. Batch results preserve the input order
    @patch("app.services.embedding_service.is_gemini_configured", return_value=True)
    @patch("app.services.embedding_service.get_gemini_client")
    def test_batch_results_preserve_input_order(self, mock_get_client, mock_is_configured):
        mock_client = MagicMock()
        mock_response = MagicMock()
        mock_response.embeddings = [
            MagicMock(values=[1.0]),
            MagicMock(values=[2.0]),
            MagicMock(values=[3.0]),
        ]
        mock_client.models.embed_content.return_value = mock_response
        mock_get_client.return_value = mock_client

        texts = ["Text Alpha", "Text Beta", "Text Gamma"]
        results = generate_embeddings(texts)

        self.assertEqual(results, [[1.0], [2.0], [3.0]])

    # 11. Failure during batch processing is reported safely
    @patch("app.services.embedding_service.is_gemini_configured", return_value=True)
    @patch("app.services.embedding_service.get_gemini_client")
    def test_failure_during_batch_processing_reported_safely(self, mock_get_client, mock_is_configured):
        mock_client = MagicMock()
        # Mock returning fewer embeddings than requested
        mock_response = MagicMock()
        mock_response.embeddings = [MagicMock(values=[0.1])]
        mock_client.models.embed_content.return_value = mock_response
        mock_get_client.return_value = mock_client

        with self.assertRaises(EmbeddingServiceError) as ctx_count:
            generate_embeddings(["Item 1", "Item 2"])
        self.assertIn("Expected 2 embeddings", str(ctx_count.exception))

        # Mock returning None response
        mock_client.models.embed_content.return_value = None
        with self.assertRaises(EmbeddingServiceError) as ctx_none:
            generate_embeddings(["Item 1"])
        self.assertIn("empty response", str(ctx_none.exception).lower())

    # 12. API key and internal error details are not leaked
    @patch("app.services.embedding_service.is_gemini_configured", return_value=True)
    @patch("app.services.embedding_service.get_gemini_client")
    def test_no_secrets_leaked_in_errors(self, mock_get_client, mock_is_configured):
        mock_client = MagicMock()
        sensitive_key = "AIzaSySecretEmbeddingKey987654321"
        mock_client.models.embed_content.side_effect = Exception(
            f"HTTP 403 Forbidden with key {sensitive_key}"
        )
        mock_get_client.return_value = mock_client

        with self.assertRaises(EmbeddingServiceError) as ctx:
            generate_embedding("Test prompt")
        self.assertNotIn(sensitive_key, str(ctx.exception))
        self.assertIn("Authentication failed", str(ctx.exception))


if __name__ == "__main__":
    unittest.main()
