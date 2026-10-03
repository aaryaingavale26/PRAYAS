from pathlib import Path
from typing import List, Optional, Union
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

# Base backend directory: .../backend
BACKEND_DIR = Path(__file__).resolve().parent.parent.parent
ENV_FILE_PATH = BACKEND_DIR / ".env"


class Settings(BaseSettings):
    """
    Application Settings loaded from environment variables or .env file.
    Default values allow the application to start gracefully even before
    Supabase or Gemini credentials are fully configured.
    """

    # Application Information
    PROJECT_NAME: str = "PRAYAS 3.0 API"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    PORT: int = 8000

    # CORS Origins (Frontend web app + Chrome extension origins)
    ALLOWED_ORIGINS: Union[List[str], str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]

    # Database & Storage (Supabase)
    SUPABASE_URL: Optional[str] = None
    SUPABASE_KEY: Optional[str] = None
    SUPABASE_ANON_KEY: Optional[str] = None
    SUPABASE_SERVICE_ROLE_KEY: Optional[str] = None
    SUPABASE_JWT_SECRET: Optional[str] = None

    # AI & LLM (Google Gemini)
    GEMINI_API_KEY: Optional[str] = None
    GEMINI_MODEL: str = "gemini-2.5-flash"
    GEMINI_EMBEDDING_MODEL: str = "gemini-embedding-001"
    EMBEDDING_DIMENSION: int = 3072

    # Vector Storage
    CHUNKS_TABLE: str = "document_chunks"

    # File Upload Limits
    MAX_UPLOAD_SIZE_MB: int = 10

    # RAG chunking (~4 chars per token: 2400 chars ~= 600 tokens, 400 chars ~= 100 tokens overlap)
    CHUNK_SIZE_CHARS: int = 2400
    CHUNK_OVERLAP_CHARS: int = 400
    RAG_TOP_K: int = 6

    # Per-user rate limiting for LLM-backed endpoints (requests per minute)
    RATE_LIMIT_PER_MINUTE: int = 20

    # Private storage signed URL lifetime
    SIGNED_URL_TTL_SECONDS: int = 300

    # Bhashini Indic Language & Voice AI
    BHASHINI_API_KEY: Optional[str] = "3253d8cb25-504c-4c77-b6ee-b2f522324bb0"
    BHASHINI_USER_ID: Optional[str] = None
    BHASHINI_INFERENCE_KEY: Optional[str] = None
    BHASHINI_INFERENCE_URL: str = "https://dhruva-api.bhashini.gov.in/services/inference/pipeline"
    BHASHINI_PIPELINE_URL: str = "https://meity-auth.ulcacontrib.org/ulca/apis/v0/model/getModelsPipeline"
    BHASHINI_PIPELINE_ID: str = "64392f96daac500b55c543cd"

    @field_validator("ALLOWED_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str):
            return [i.strip() for i in v.split(",") if i.strip()]
        return v

    @field_validator("SUPABASE_URL", mode="before")
    @classmethod
    def clean_supabase_url(cls, v: Optional[str]) -> Optional[str]:
        if isinstance(v, str) and v.strip():
            cleaned = v.strip().rstrip("/")
            if cleaned.endswith("/rest/v1"):
                cleaned = cleaned[:-8].rstrip("/")
            return cleaned
        return v

    @field_validator("SUPABASE_JWT_SECRET", mode="before")
    @classmethod
    def clean_jwt_secret(cls, v: Optional[str]) -> Optional[str]:
        if isinstance(v, str):
            cleaned = v.strip().strip("'\"").strip()
            return cleaned if cleaned else None
        return v

    @property
    def effective_supabase_key(self) -> Optional[str]:
        """
        Returns the primary Supabase key available for backend operations.
        Prioritizes SUPABASE_SERVICE_ROLE_KEY for server-side storage and database
        operations (bypassing storage RLS for backend service operations),
        falling back to SUPABASE_KEY or SUPABASE_ANON_KEY.
        """
        return self.SUPABASE_SERVICE_ROLE_KEY or self.SUPABASE_KEY or self.SUPABASE_ANON_KEY

    model_config = SettingsConfigDict(
        env_file=str(ENV_FILE_PATH),
        env_file_encoding="utf-8",
        extra="ignore",
    )


# Global singleton settings instance
settings = Settings()
