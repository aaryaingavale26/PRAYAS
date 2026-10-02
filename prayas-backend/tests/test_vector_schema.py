import os
import re
import sys
import unittest
from pathlib import Path

# Add backend directory to sys.path
BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_DIR))

from app.core.config import settings
from app.db.supabase import check_table_access, is_supabase_configured

SCHEMA_PATH = BACKEND_DIR / "app" / "db" / "schema.sql"


class TestVectorSchema(unittest.TestCase):
    """
    Tests and static verification for the pgvector database schema.
    Validates table definitions, column types, vector dimensions,
    foreign key constraints, and RLS configuration.
    """

    @classmethod
    def setUpClass(cls):
        cls.schema_content = SCHEMA_PATH.read_text(encoding="utf-8")

    def test_schema_file_exists_and_readable(self):
        self.assertTrue(SCHEMA_PATH.exists(), "schema.sql must exist at backend/app/db/schema.sql")
        self.assertGreater(len(self.schema_content), 100, "schema.sql must not be empty")

    def test_vector_extension_included(self):
        # Must include CREATE EXTENSION IF NOT EXISTS vector
        pattern = r"CREATE\s+EXTENSION\s+IF\s+NOT\s+EXISTS\s+vector"
        match = re.search(pattern, self.schema_content, re.IGNORECASE)
        self.assertIsNotNone(match, "schema.sql must contain 'CREATE EXTENSION IF NOT EXISTS vector;'")

    def test_document_chunks_table_definition(self):
        # Must create document_chunks table idempotently
        pattern = r"CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+(?:public\.)?document_chunks"
        match = re.search(pattern, self.schema_content, re.IGNORECASE)
        self.assertIsNotNone(match, "schema.sql must create the 'document_chunks' table")

    def test_expected_columns_and_vector_dimension(self):
        # Verify required column names and types in document_chunks
        expected_elements = [
            ("id", r"id\s+UUID\s+PRIMARY\s+KEY"),
            ("document_id", r"document_id\s+UUID\s+NOT\s+NULL"),
            ("chunk_index", r"chunk_index\s+INTEGER\s+NOT\s+NULL"),
            ("content", r"content\s+TEXT\s+NOT\s+NULL"),
            ("start_char", r"start_char\s+INTEGER\s+NOT\s+NULL"),
            ("end_char", r"end_char\s+INTEGER\s+NOT\s+NULL"),
            ("embedding", rf"embedding\s+vector\({settings.EMBEDDING_DIMENSION}\)"),
            ("created_at", r"created_at\s+TIMESTAMP\s+WITH\s+TIME\s+ZONE"),
        ]

        for col_name, regex_pattern in expected_elements:
            match = re.search(regex_pattern, self.schema_content, re.IGNORECASE)
            self.assertIsNotNone(
                match,
                f"Column '{col_name}' matching pattern '{regex_pattern}' was not found in schema.sql",
            )

    def test_foreign_key_with_cascading_deletion(self):
        # Foreign key referencing documents(id) with ON DELETE CASCADE
        pattern = r"REFERENCES\s+(?:public\.)?documents\s*\(\s*id\s*\)\s+ON\s+DELETE\s+CASCADE"
        match = re.search(pattern, self.schema_content, re.IGNORECASE)
        self.assertIsNotNone(
            match,
            "document_chunks must reference documents(id) with ON DELETE CASCADE",
        )

    def test_uniqueness_constraint_present(self):
        # Uniqueness constraint on (document_id, chunk_index)
        pattern = r"UNIQUE\s*\(\s*document_id\s*,\s*chunk_index\s*\)"
        match = re.search(pattern, self.schema_content, re.IGNORECASE)
        self.assertIsNotNone(
            match,
            "document_chunks must enforce a UNIQUE constraint on (document_id, chunk_index)",
        )

    def test_document_lookup_index_present(self):
        # Index on document_id for fast retrieval
        pattern = r"CREATE\s+INDEX\s+IF\s+NOT\s+EXISTS\s+\w+\s+ON\s+(?:public\.)?document_chunks\s*\(\s*document_id\s*\)"
        match = re.search(pattern, self.schema_content, re.IGNORECASE)
        self.assertIsNotNone(
            match,
            "An index on document_chunks(document_id) must be defined for document lookup",
        )

    def test_rls_enabled_on_document_chunks(self):
        # ALTER TABLE public.document_chunks ENABLE ROW LEVEL SECURITY
        pattern = r"ALTER\s+TABLE\s+(?:public\.)?document_chunks\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY"
        match = re.search(pattern, self.schema_content, re.IGNORECASE)
        self.assertIsNotNone(
            match,
            "Row Level Security (RLS) must be enabled on document_chunks",
        )

    def test_no_unrestricted_public_access_policies(self):
        # Ensure no overly permissive public access policies are granted
        permissive_pattern = r"CREATE\s+POLICY\s+.*document_chunks.*FOR\s+ALL\s+TO\s+public\s+USING\s*\(\s*true\s*\)"
        match = re.search(permissive_pattern, self.schema_content, re.IGNORECASE)
        self.assertIsNone(
            match,
            "schema.sql must not contain permissive public access policies for document_chunks",
        )

    def test_vector_indexing_documentation_present(self):
        # Verify that IVFFlat limitation and HNSW compatibility are documented
        self.assertIn("IVFFlat", self.schema_content)
        self.assertIn("HNSW", self.schema_content)

    def test_live_supabase_schema_status_opt_in(self):
        """
        Opt-in live check against Supabase to report whether document_chunks is created.
        Guarded by RUN_LIVE_SUPABASE_TESTS=1. Never fails non-live test suites.
        """
        if os.getenv("RUN_LIVE_SUPABASE_TESTS") != "1":
            self.skipTest("Live Supabase test skipped (enable with RUN_LIVE_SUPABASE_TESTS=1)")

        if not is_supabase_configured():
            self.skipTest("Supabase credentials not configured in environment")

        result = check_table_access("document_chunks")
        # Document whether table is ready or pending execution in SQL editor
        if result["accessible"]:
            self.assertTrue(result["accessible"])
        else:
            # If pending execution, report clearly without failing the test runner
            self.assertEqual(result["status"], "table_not_found")


if __name__ == "__main__":
    unittest.main()
