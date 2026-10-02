import sys
from pathlib import Path

# Ensure backend root is in sys.path when running file directly
_backend_root = Path(__file__).resolve().parent.parent
if str(_backend_root) not in sys.path:
    sys.path.insert(0, str(_backend_root))

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.api.router import api_router
from app.api.integration import router as integration_router
from app.core.config import settings
from app.db.supabase import is_supabase_configured

# Initialize FastAPI application
app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Backend API for PRAYAS 3.0 - AI-powered accessible job application assistant.",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS Middleware Configuration
# Supports frontend dev servers (Next.js, Vite), local test servers, and Chrome extension origins
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"^.*$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Exception handler for HTTP errors (404, 403, 400, etc.)
# Returns consistent JSON without leaking internal details
@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": exc.detail if isinstance(exc.detail, str) else "Request error",
            "status_code": exc.status_code,
        },
    )


# Exception handler for unexpected server errors (500)
# Prevents exposing internal stack traces or secrets to users
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal Server Error",
            "message": "An unexpected error occurred. Please try again later.",
            "detail": str(exc) if settings.DEBUG else None,
        },
    )


# Root Endpoint
@app.get("/", tags=["System"])
def read_root():
    return {
        "name": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "status": "online",
        "docs": "/docs",
    }


# Health Check Endpoint
@app.get("/health", tags=["System"])
def health_check():
    return {
        "status": "ok",
        "app": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "environment": settings.ENVIRONMENT,
        "database": "configured" if is_supabase_configured() else "not_configured",
    }


# Mount integration routers (/api and /api/v1) for Member 1, 3, 4 compatibility
app.include_router(integration_router, prefix="/api")
app.include_router(integration_router, prefix=settings.API_V1_STR)

# Mount API v1 router
app.include_router(api_router, prefix=settings.API_V1_STR)


if __name__ == "__main__":
    import uvicorn
    print(f"Starting {settings.PROJECT_NAME} on http://127.0.0.1:8000 ...")
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=True)

