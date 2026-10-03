-- =============================================================================
-- PRAYAS 3.0 — Migration 002: Onboarding, CV extraction & per-user RAG metadata
-- =============================================================================
-- Run once in the Supabase SQL Editor (safe to re-run: every statement is idempotent).
-- Also merged into schema.sql for fresh installs.
-- =============================================================================

-- 1. Documents: type, indexing status, chunk count
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS doc_type TEXT NOT NULL DEFAULT 'other';
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS index_status TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS index_error TEXT;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS chunk_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS indexed_at TIMESTAMP WITH TIME ZONE;

-- storage_path is NULL for the synthetic 'profile' knowledge document (passport fields as text chunks)
ALTER TABLE public.documents ALTER COLUMN storage_path DROP NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_documents_doc_type') THEN
        ALTER TABLE public.documents
            ADD CONSTRAINT chk_documents_doc_type
            CHECK (doc_type IN ('resume', 'cover_letter', 'project', 'certificate', 'other', 'profile'));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_documents_index_status') THEN
        ALTER TABLE public.documents
            ADD CONSTRAINT chk_documents_index_status
            CHECK (index_status IN ('pending', 'indexing', 'indexed', 'failed', 'empty'));
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_documents_user_type ON public.documents(user_id, doc_type);

-- 2. Passports: structured CV extraction + provenance of auto-filled fields
ALTER TABLE public.passports ADD COLUMN IF NOT EXISTS extracted_profile JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.passports ADD COLUMN IF NOT EXISTS field_sources JSONB NOT NULL DEFAULT '{}'::jsonb;

-- 3. Per-user onboarding state
CREATE TABLE IF NOT EXISTS public.user_profiles (
    user_id UUID PRIMARY KEY,
    onboarding_complete BOOLEAN NOT NULL DEFAULT FALSE,
    onboarding_skipped BOOLEAN NOT NULL DEFAULT FALSE,
    cv_document_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own onboarding state" ON public.user_profiles;
CREATE POLICY "Users can manage their own onboarding state"
    ON public.user_profiles FOR ALL
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

COMMENT ON TABLE public.user_profiles IS 'Per-user onboarding state (CV uploaded / skipped).';
