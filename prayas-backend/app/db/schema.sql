-- =============================================================================
-- PRAYAS 3.0 — Database Schema for Supabase PostgreSQL with pgvector
-- =============================================================================
-- INSTRUCTIONS FOR DEVELOPER:
-- 1. Do NOT execute this file automatically from application code.
-- 2. Open your Supabase Dashboard: https://supabase.com/dashboard/project/<your-project-id>
-- 3. Navigate to the SQL Editor and paste this script.
-- 4. Review the table definitions and click "Run".
-- 5. IMPORTANT SECURITY NOTE:
--    Row Level Security (RLS) is enabled on all tables below.
--    By default, access is denied to 'anon' and 'authenticated' roles.
--    The PRAYAS backend executes using the Supabase 'service_role' key, which
--    bypasses RLS for trusted server-side processing. Do NOT grant unrestricted
--    public access.
-- =============================================================================

-- Enable UUID and cryptographic extensions if not already available
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Enable pgvector extension for AI embeddings and similarity search
CREATE EXTENSION IF NOT EXISTS vector;

-- -----------------------------------------------------------------------------
-- 1. Accessibility Profiles (Accessibility Passport)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.accessibility_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    disability_type TEXT,
    preferred_assistance JSONB DEFAULT '[]'::jsonb,
    preferred_language TEXT DEFAULT 'en',
    accessibility_preferences JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.accessibility_profiles ENABLE ROW LEVEL SECURITY;

-- Comment for Supabase UI
COMMENT ON TABLE public.accessibility_profiles IS 'Stores user accessibility preferences, assistance needs, and disability type for the Accessibility Passport.';

-- -----------------------------------------------------------------------------
-- 1b. Candidate Passports (Full Accessibility Passport JSON Document)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.passports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE,
    passport_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.passports ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE public.passports IS 'Stores candidate portable accessibility passport profile for autofill and accommodation sharing.';

-- -----------------------------------------------------------------------------
-- 2. Documents (User resumes, certificates, portfolios for RAG)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    file_name TEXT NOT NULL,
    file_type TEXT,
    file_size BIGINT,
    storage_path TEXT,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- Comment for Supabase UI
COMMENT ON TABLE public.documents IS 'Stores metadata for user-uploaded documents used by the RAG assistant to answer job application questions.';

-- -----------------------------------------------------------------------------
-- 3. Document Chunks (Text segments and 3072-dimensional vector embeddings)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.document_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
    chunk_index INTEGER NOT NULL,
    content TEXT NOT NULL,
    start_char INTEGER NOT NULL,
    end_char INTEGER NOT NULL,
    embedding vector(3072) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT uq_document_chunks_document_chunk UNIQUE (document_id, chunk_index)
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.document_chunks ENABLE ROW LEVEL SECURITY;

-- Comment for Supabase UI
COMMENT ON TABLE public.document_chunks IS 'Stores segmented text chunks and 3072-dimensional Gemini embeddings for RAG retrieval. Cascades on document deletion.';

-- -----------------------------------------------------------------------------
-- Indexes for performance
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_accessibility_profiles_user_id ON public.accessibility_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_passports_user_id ON public.passports(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_user_id ON public.documents(user_id);
CREATE INDEX IF NOT EXISTS idx_document_chunks_document_id ON public.document_chunks(document_id);

-- NOTE ON VECTOR INDEXING (vector(3072)):
-- 1. IVFFlat: Cannot be used because pgvector limits IVFFlat to a maximum of 2,000 dimensions.
-- 2. HNSW: pgvector >= 0.7.0 supports up to 4,000 dimensions for HNSW with vector_cosine_ops.
--    If your Supabase instance runs pgvector >= 0.7.0 and index acceleration is desired for large scale datasets,
--    you can uncomment and run the following index:
-- CREATE INDEX IF NOT EXISTS idx_document_chunks_embedding_hnsw ON public.document_chunks USING hnsw (embedding vector_cosine_ops);
-- 3. For small-to-medium chunk collections, exact kNN sequential scan provides 100% recall with zero build/memory overhead.

-- -----------------------------------------------------------------------------
-- 4. Row Level Security (RLS) Policies for Authenticated Users
-- -----------------------------------------------------------------------------

-- Policies for accessibility_profiles
DROP POLICY IF EXISTS "Users can manage their own accessibility profile" ON public.accessibility_profiles;
CREATE POLICY "Users can manage their own accessibility profile"
    ON public.accessibility_profiles FOR ALL
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Policies for passports
DROP POLICY IF EXISTS "Users can manage their own passport" ON public.passports;
CREATE POLICY "Users can manage their own passport"
    ON public.passports FOR ALL
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Policies for documents
DROP POLICY IF EXISTS "Users can view their own documents" ON public.documents;
CREATE POLICY "Users can view their own documents"
    ON public.documents FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own documents" ON public.documents;
CREATE POLICY "Users can insert their own documents"
    ON public.documents FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own documents" ON public.documents;
CREATE POLICY "Users can update their own documents"
    ON public.documents FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own documents" ON public.documents;
CREATE POLICY "Users can delete their own documents"
    ON public.documents FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- Policies for document_chunks
DROP POLICY IF EXISTS "Users can view chunks of their own documents" ON public.document_chunks;
CREATE POLICY "Users can view chunks of their own documents"
    ON public.document_chunks FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.documents d
            WHERE d.id = document_chunks.document_id
            AND d.user_id = auth.uid()
        )
    );

-- -----------------------------------------------------------------------------
-- 5. Vector Similarity Search Function (Cosine Distance) with User Scoping
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.match_document_chunks(
    query_embedding vector(3072),
    match_count int DEFAULT 5,
    filter_document_id uuid DEFAULT NULL,
    filter_user_id uuid DEFAULT NULL
)
RETURNS TABLE (
    id uuid,
    document_id uuid,
    chunk_index int,
    content text,
    start_char int,
    end_char int,
    similarity float
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
    RETURN QUERY
    SELECT
        dc.id,
        dc.document_id,
        dc.chunk_index,
        dc.content,
        dc.start_char,
        dc.end_char,
        (1 - (dc.embedding <=> query_embedding))::float AS similarity
    FROM public.document_chunks dc
    JOIN public.documents d ON dc.document_id = d.id
    WHERE (filter_document_id IS NULL OR dc.document_id = filter_document_id)
      AND (filter_user_id IS NULL OR d.user_id = filter_user_id)
    ORDER BY dc.embedding <=> query_embedding ASC
    LIMIT LEAST(match_count, 20);
END;
$$;

-- Security: Restrict execution of the search RPC function
REVOKE ALL ON FUNCTION public.match_document_chunks(vector, int, uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.match_document_chunks(vector, int, uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.match_document_chunks(vector, int, uuid, uuid) TO authenticated;

