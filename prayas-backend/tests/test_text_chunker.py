import sys
import unittest
from pathlib import Path

# Add backend directory to sys.path
BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_DIR))

from app.schemas.chunk import TextChunk
from app.services.text_chunker import (
    chunk_document_text,
    chunk_extracted_text,
    chunk_text,
    create_chunks,
)


class TestTextChunker(unittest.TestCase):
    """
    Unit tests for the document text chunking service.
    """

    # 1. Empty string returns an empty list
    def test_empty_string_returns_empty_list(self):
        self.assertEqual(chunk_text(""), [])
        self.assertEqual(chunk_document_text(""), [])
        self.assertEqual(create_chunks(""), [])
        self.assertEqual(chunk_extracted_text(""), [])

    # 2. Whitespace-only text is handled safely
    def test_whitespace_only_text_handled_safely(self):
        whitespace_samples = ["   ", "\n\n\t  \r\n", "    \t   "]
        for sample in whitespace_samples:
            self.assertEqual(chunk_text(sample), [])
            self.assertEqual(chunk_document_text(sample), [])

        # Non-string or None values handled safely
        self.assertEqual(chunk_text(None), [])
        self.assertEqual(chunk_document_text(None), [])

    # 3. Short text produces one chunk
    def test_short_text_produces_one_chunk(self):
        short_text = "This is a short job description for an accessibility tester."
        chunks = chunk_document_text(short_text, chunk_size=1000, chunk_overlap=200)

        self.assertEqual(len(chunks), 1)
        chunk = chunks[0]
        self.assertIsInstance(chunk, TextChunk)
        self.assertEqual(chunk.chunk_index, 0)
        self.assertEqual(chunk.text, short_text)
        self.assertEqual(chunk.start_char, 0)
        self.assertEqual(chunk.end_char, len(short_text))

        # Check chunk_text string output
        str_chunks = chunk_text(short_text, chunk_size=1000, chunk_overlap=200)
        self.assertEqual(str_chunks, [short_text])

    # 4. Long text produces multiple chunks
    def test_long_text_produces_multiple_chunks(self):
        sentence = "PRAYAS 3.0 provides accessible job applications for everyone. "
        long_text = sentence * 40  # ~2480 chars
        chunk_size = 500
        chunk_overlap = 100

        chunks = chunk_document_text(long_text, chunk_size=chunk_size, chunk_overlap=chunk_overlap)
        str_chunks = chunk_text(long_text, chunk_size=chunk_size, chunk_overlap=chunk_overlap)

        self.assertGreater(len(chunks), 1)
        self.assertEqual(len(chunks), len(str_chunks))
        for obj, text_str in zip(chunks, str_chunks):
            self.assertEqual(obj.text, text_str)

    # 5. Consecutive chunks have the expected overlap
    def test_consecutive_chunks_have_expected_overlap(self):
        sample_text = (
            "Section 1: Accessible User Interfaces. "
            "Section 2: Screen Reader Compatibility. "
            "Section 3: Keyboard Navigation Support. "
            "Section 4: WCAG 2.1 AAA Compliance Guidelines. "
            "Section 5: AI-assisted Voice Prompt Automation. "
        ) * 10
        chunk_size = 300
        chunk_overlap = 80

        chunks = chunk_document_text(sample_text, chunk_size=chunk_size, chunk_overlap=chunk_overlap)
        self.assertGreater(len(chunks), 2)

        for i in range(len(chunks) - 1):
            curr_chunk = chunks[i]
            next_chunk = chunks[i + 1]

            # Overlap character span in original text
            char_overlap = curr_chunk.end_char - next_chunk.start_char
            self.assertEqual(
                char_overlap,
                chunk_overlap,
                f"Mismatch in character overlap between chunk {i} and {i+1}",
            )

            # Sliced text overlap matching
            self.assertEqual(
                curr_chunk.text[-chunk_overlap:],
                next_chunk.text[:chunk_overlap],
                f"Overlap text content mismatch between chunk {i} and {i+1}",
            )

    # 6. Chunk indexes start at zero and increase sequentially
    def test_chunk_indexes_start_at_zero_and_increase_sequentially(self):
        text = "Sequential chunk index test text. " * 30
        chunks = chunk_document_text(text, chunk_size=200, chunk_overlap=50)

        self.assertGreater(len(chunks), 1)
        for expected_idx, chunk in enumerate(chunks):
            self.assertEqual(chunk.chunk_index, expected_idx)

    # 7. Character positions correctly refer to the original text
    def test_character_positions_correctly_refer_to_original_text(self):
        text = (
            "Frontend Accessibility Developer: Experience with ARIA roles, "
            "semantic HTML, focus management, and assistive tech. "
        ) * 20
        chunk_size = 400
        chunk_overlap = 120

        chunks = chunk_document_text(text, chunk_size=chunk_size, chunk_overlap=chunk_overlap)
        self.assertGreater(len(chunks), 1)

        for chunk in chunks:
            expected_slice = text[chunk.start_char:chunk.end_char]
            self.assertEqual(
                chunk.text,
                expected_slice,
                f"Chunk {chunk.chunk_index} text does not match text[{chunk.start_char}:{chunk.end_char}]",
            )

    # 8. Invalid chunk size is rejected
    def test_invalid_chunk_size_rejected(self):
        sample = "Valid text for chunking."
        for invalid_size in [0, -1, -500]:
            with self.assertRaises(ValueError, msg=f"Should reject chunk_size={invalid_size}"):
                chunk_document_text(sample, chunk_size=invalid_size)
            with self.assertRaises(ValueError, msg=f"Should reject chunk_size={invalid_size}"):
                chunk_text(sample, chunk_size=invalid_size)

        with self.assertRaises(ValueError):
            chunk_document_text(sample, chunk_size=True)  # type: ignore

    # 9. Negative overlap is rejected
    def test_negative_overlap_rejected(self):
        sample = "Valid text for chunking."
        for invalid_overlap in [-1, -100]:
            with self.assertRaises(ValueError, msg=f"Should reject chunk_overlap={invalid_overlap}"):
                chunk_document_text(sample, chunk_size=500, chunk_overlap=invalid_overlap)
            with self.assertRaises(ValueError, msg=f"Should reject chunk_overlap={invalid_overlap}"):
                chunk_text(sample, chunk_size=500, chunk_overlap=invalid_overlap)

    # 10. Overlap equal to or greater than chunk size is rejected
    def test_overlap_equal_or_greater_than_chunk_size_rejected(self):
        sample = "Valid text for testing overlap constraints."
        # Equal overlap
        with self.assertRaises(ValueError):
            chunk_document_text(sample, chunk_size=500, chunk_overlap=500)
        with self.assertRaises(ValueError):
            chunk_text(sample, chunk_size=500, chunk_overlap=500)

        # Greater overlap
        with self.assertRaises(ValueError):
            chunk_document_text(sample, chunk_size=500, chunk_overlap=600)
        with self.assertRaises(ValueError):
            chunk_text(sample, chunk_size=500, chunk_overlap=600)

    # 11. Text without spaces is handled correctly
    def test_text_without_spaces_handled_correctly(self):
        text_no_spaces = "A" * 2500
        chunk_size = 1000
        chunk_overlap = 200

        chunks = chunk_document_text(text_no_spaces, chunk_size=chunk_size, chunk_overlap=chunk_overlap)
        self.assertEqual(len(chunks), 3)

        # Verify all slices match original text
        for chunk in chunks:
            self.assertEqual(chunk.text, text_no_spaces[chunk.start_char:chunk.end_char])
            self.assertTrue(all(c == "A" for c in chunk.text))

    # 12. The final chunk contains the remaining text
    def test_final_chunk_contains_remaining_text(self):
        text = "Data Analyst opening requiring SQL, Python, and Dashboarding. " * 35
        chunk_size = 350
        chunk_overlap = 70

        chunks = chunk_document_text(text, chunk_size=chunk_size, chunk_overlap=chunk_overlap)
        self.assertGreater(len(chunks), 1)

        last_chunk = chunks[-1]
        self.assertEqual(last_chunk.end_char, len(text))
        self.assertEqual(last_chunk.text, text[last_chunk.start_char:len(text)])

    # 13. Default parameters (chunk_size=1000, chunk_overlap=200)
    def test_default_parameters_applied(self):
        text = "Default parameters test string. " * 50  # ~1600 chars
        chunks = chunk_document_text(text)
        self.assertGreater(len(chunks), 1)
        self.assertEqual(chunks[0].end_char, 1000)
        self.assertEqual(chunks[1].start_char, 800)  # 1000 - 200 = 800

    # 14. Zero overlap behaves correctly
    def test_zero_overlap_produces_contiguous_chunks(self):
        text = "ABCDEFGHIJ" * 20  # 200 chars
        chunk_size = 50
        chunk_overlap = 0

        chunks = chunk_document_text(text, chunk_size=chunk_size, chunk_overlap=chunk_overlap)
        self.assertEqual(len(chunks), 4)

        for i in range(len(chunks) - 1):
            self.assertEqual(chunks[i].end_char, chunks[i + 1].start_char)


if __name__ == "__main__":
    unittest.main()
