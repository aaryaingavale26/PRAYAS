from fastapi import APIRouter, Depends
from app.core.auth import AuthenticatedUser, get_current_user
from app.api.documents import router as documents_router
from app.api.gemini import router as gemini_router
from app.api.onboarding import router as onboarding_router
from app.api.search import router as search_router
from app.api.rag import router as rag_router
from app.api.simplification import router as simplification_router
from app.db.supabase import check_supabase_connection, check_table_access, is_supabase_configured

api_router = APIRouter()

# Mount feature routers
api_router.include_router(documents_router)
api_router.include_router(onboarding_router)
api_router.include_router(gemini_router)
api_router.include_router(search_router)
api_router.include_router(rag_router)
api_router.include_router(simplification_router)


@api_router.get("/status", tags=["System"])
def api_status():
    """
    Check the status of the API v1 router.
    Public monitoring endpoint.
    """
    return {
        "status": "ready",
        "api_version": "v1",
        "message": "PRAYAS 3.0 API router is operational",
    }


@api_router.get("/db-health", tags=["Database"])
def db_health(current_user: AuthenticatedUser = Depends(get_current_user)):
    """
    Check the configuration and connectivity status of the Supabase database.
    Requires authentication. Does not crash or leak secrets when credentials are missing or invalid.
    """
    if not is_supabase_configured():
        return {
            "database": "supabase",
            "configured": False,
            "connected": False,
            "status": "not_configured",
            "message": "Supabase credentials are not configured. Please set SUPABASE_URL and SUPABASE_KEY in backend/.env.",
        }

    is_connected, message = check_supabase_connection()
    acc_check = check_table_access("accessibility_profiles")
    doc_check = check_table_access("documents")

    return {
        "database": "supabase",
        "configured": True,
        "connected": is_connected,
        "status": "connected" if is_connected else "connection_failed",
        "tables": {
            "accessibility_profiles": {
                "accessible": acc_check["accessible"],
                "status": acc_check["status"],
                "detail": acc_check["error_category"],
            },
            "documents": {
                "accessible": doc_check["accessible"],
                "status": doc_check["status"],
                "detail": doc_check["error_category"],
            },
        },
        "message": message,
    }
