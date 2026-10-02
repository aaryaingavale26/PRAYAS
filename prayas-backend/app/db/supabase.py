from typing import Any, Dict, Optional, Tuple
from supabase import Client, create_client
from app.core.config import settings

# Global cached client instance for lazy singleton initialization
_supabase_client: Optional[Client] = None


def is_supabase_configured() -> bool:
    """
    Check if both Supabase URL and a valid key are configured.
    """
    url = settings.SUPABASE_URL
    key = settings.effective_supabase_key
    return bool(url and key and url.strip() and key.strip())


def get_supabase_client() -> Optional[Client]:
    """
    Retrieve the Supabase client instance lazily.
    Returns None if Supabase credentials are not configured.
    Never exposes keys or crashes the application on failure.
    """
    global _supabase_client

    if not is_supabase_configured():
        return None

    if _supabase_client is None:
        try:
            url = str(settings.SUPABASE_URL).strip()
            key = str(settings.effective_supabase_key).strip()
            _supabase_client = create_client(url, key)
        except Exception:
            # Handle client creation failure safely without leaking credentials
            return None

    return _supabase_client


def check_supabase_connection() -> Tuple[bool, str]:
    """
    Perform a safe, lightweight check to test Supabase connectivity.
    Returns (True, "message") on success or (False, "safe error message") on failure.
    Never exposes internal tokens, passwords, or secret keys.
    """
    if not is_supabase_configured():
        return False, "Supabase credentials are not configured. Please set SUPABASE_URL and SUPABASE_KEY in backend/.env."

    client = get_supabase_client()
    if client is None:
        return False, "Failed to initialize Supabase client. Please verify the URL and key format."

    try:
        # Attempt a lightweight read to test reachability and authentication
        client.table("accessibility_profiles").select("id").limit(1).execute()
        return True, "Connected to Supabase successfully."
    except Exception as exc:
        err_msg = str(exc)
        # If the table doesn't exist yet (PGRST205 / schema cache), the PostgREST server is reachable and authentication succeeded!
        if (
            "relation" in err_msg.lower()
            or "does not exist" in err_msg.lower()
            or "schema cache" in err_msg.lower()
            or "pgrst205" in err_msg.lower()
            or "pgrst204" in err_msg.lower()
            or "pgrst200" in err_msg.lower()
        ):
            return True, "Connected to Supabase successfully (database reachable; tables pending in Supabase SQL editor)."
        return False, "Supabase connection check failed. Please verify credentials and project status."


def check_table_access(table_name: str) -> Dict[str, Any]:
    """
    Test read-only access to a specific table with limit 1.
    Returns a dictionary with status, accessible boolean, and safe error category.
    Never exposes secrets or internal exception details.
    """
    if not is_supabase_configured():
        return {
            "status": "unconfigured",
            "accessible": False,
            "error_category": "Configuration missing",
        }

    client = get_supabase_client()
    if client is None:
        return {
            "status": "error",
            "accessible": False,
            "error_category": "Client initialization failed",
        }

    try:
        client.table(table_name).select("id").limit(1).execute()
        return {
            "status": "ready",
            "accessible": True,
            "error_category": None,
        }
    except Exception as exc:
        err_str = str(exc)
        if (
            "pgrst205" in err_str.lower()
            or "could not find the table" in err_str.lower()
            or "schema cache" in err_str.lower()
            or "relation" in err_str.lower()
            or "does not exist" in err_str.lower()
        ):
            return {
                "status": "table_not_found",
                "accessible": False,
                "error_category": "Table does not exist (schema.sql pending execution)",
            }
        elif (
            "pgrst301" in err_str.lower()
            or "permission denied" in err_str.lower()
            or "row-level security" in err_str.lower()
        ):
            return {
                "status": "permission_denied",
                "accessible": False,
                "error_category": "Permission denied by RLS policy",
            }
        elif "401" in err_str or "invalid api key" in err_str.lower():
            return {
                "status": "auth_failed",
                "accessible": False,
                "error_category": "Authentication failure (invalid key)",
            }
        else:
            return {
                "status": "error",
                "accessible": False,
                "error_category": "Database query error",
            }
