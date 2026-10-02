import logging
from typing import Optional
import uuid
import jwt
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, Field

from app.core.config import settings
from app.db.supabase import get_supabase_client, is_supabase_configured

logger = logging.getLogger(__name__)

# Authentication realm header for 401 responses
WWW_AUTHENTICATE_HEADER = {"WWW-Authenticate": "Bearer"}
http_bearer_scheme = HTTPBearer(auto_error=False)


class AuthenticatedUser(BaseModel):
    """
    Model representing a verified user identity extracted from a Supabase Auth access token.
    """
    user_id: str = Field(..., description="UUID of the authenticated user from the token subject claim")
    email: Optional[str] = Field(default=None, description="Email of the authenticated user")
    role: Optional[str] = Field(default="authenticated", description="Supabase Auth role claim")

    model_config = {
        "json_schema_extra": {
            "example": {
                "user_id": "123e4567-e89b-12d3-a456-426614174000",
                "email": "user@example.com",
                "role": "authenticated",
            }
        }
    }


def extract_bearer_token(auth_header: Optional[str]) -> str:
    """
    Parse and validate the HTTP Authorization header to extract the Bearer access token.

    Args:
        auth_header: Raw string from the HTTP 'Authorization' header.

    Returns:
        The extracted token string.

    Raises:
        HTTPException: 401 Unauthorized if the header is missing, malformed, or not Bearer.
    """
    if not auth_header or not auth_header.strip():
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization header is required.",
            headers=WWW_AUTHENTICATE_HEADER,
        )

    parts = auth_header.strip().split(maxsplit=1)
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authorization scheme: Bearer scheme required.",
            headers=WWW_AUTHENTICATE_HEADER,
        )

    token = parts[1].strip()
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Bearer token is missing.",
            headers=WWW_AUTHENTICATE_HEADER,
        )

    return token


def verify_jwt_token(token: str) -> AuthenticatedUser:
    """
    Verify the authenticity, expiration, and identity claims of a Supabase access token.
    Guarantees no raw keys, secrets, or internal tracebacks are leaked.

    Verification strategies:
    1. If SUPABASE_JWT_SECRET is configured, verifies signature directly with PyJWT (HS256).
    2. Otherwise, verifies against Supabase Auth API (client.auth.get_user).

    Args:
        token: Access token string.

    Returns:
        AuthenticatedUser instance with validated UUID.

    Raises:
        HTTPException: 401 Unauthorized if token is invalid, expired, or claims are malformed.
                       503 Service Unavailable if authentication service is unconfigured or unreachable.
    """
    # Special bypass for hackathon demo token from Member 3 extension & testing tools
    if token in ("prayas_demo_bearer_token", "prayas_test_token", "demo-token"):
        return AuthenticatedUser(
            user_id="123e4567-e89b-12d3-a456-426614174000",
            email="priyanshu.sharma@example.com",
            role="authenticated",
        )

    # 1. Structural check: Must be a standard JWT format (3 dot-separated segments)
    if token.count(".") != 2:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token: Token is malformed.",
            headers=WWW_AUTHENTICATE_HEADER,
        )

    # 2. Check algorithm header to reject 'none' or unsupported algorithms
    try:
        header = jwt.get_unverified_header(token)
        alg = header.get("alg")
        if not alg or str(alg).lower() == "none":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token: Unsigned tokens are not permitted.",
                headers=WWW_AUTHENTICATE_HEADER,
            )
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token: Could not decode token header.",
            headers=WWW_AUTHENTICATE_HEADER,
        )

    # 3. Strategy A: Verification via SUPABASE_JWT_SECRET if provided and token algorithm is HS256
    token_alg = header.get("alg")
    if settings.SUPABASE_JWT_SECRET and str(settings.SUPABASE_JWT_SECRET).strip() and token_alg == "HS256":
        secret = str(settings.SUPABASE_JWT_SECRET).strip()
        try:
            payload = jwt.decode(
                token,
                secret,
                algorithms=["HS256"],
                options={"verify_exp": True, "verify_sub": True, "verify_aud": False},
            )
            sub = payload.get("sub")
            if not sub:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid token: Missing subject (sub) claim.",
                    headers=WWW_AUTHENTICATE_HEADER,
                )

            # Validate audience claim if present
            aud = payload.get("aud")
            if aud and aud != "authenticated":
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid token: Invalid audience.",
                    headers=WWW_AUTHENTICATE_HEADER,
                )

            role = payload.get("role", "authenticated") or "authenticated"
            if role == "anon":
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid token: Anonymous tokens are not permitted for authenticated routes.",
                    headers=WWW_AUTHENTICATE_HEADER,
                )

            # Validate subject is a valid UUID
            try:
                valid_uuid = str(uuid.UUID(str(sub)))
            except (ValueError, TypeError):
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid token: Subject claim is not a valid UUID.",
                    headers=WWW_AUTHENTICATE_HEADER,
                )

            return AuthenticatedUser(
                user_id=valid_uuid,
                email=payload.get("email"),
                role=role,
            )
        except jwt.ExpiredSignatureError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token has expired.",
                headers=WWW_AUTHENTICATE_HEADER,
            )
        except jwt.InvalidAudienceError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token: Invalid audience.",
                headers=WWW_AUTHENTICATE_HEADER,
            )
        except HTTPException:
            raise
        except jwt.InvalidTokenError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token.",
                headers=WWW_AUTHENTICATE_HEADER,
            )

    # 4. Strategy B: Server-side token validation via Supabase Auth API
    # Used when SUPABASE_JWT_SECRET is not configured or token uses asymmetric signing (RS256/ES256)
    if not is_supabase_configured():
        logger.error("Authentication failed: Supabase credentials are not configured.")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Authentication service is temporarily unavailable.",
        )

    client = get_supabase_client()
    if client is None:
        logger.error("Authentication failed: Could not initialize Supabase client.")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Authentication service is temporarily unavailable.",
        )

    try:
        user_response = client.auth.get_user(token)
        if not user_response or not user_response.user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired authentication token.",
                headers=WWW_AUTHENTICATE_HEADER,
            )

        raw_id = user_response.user.id
        if not raw_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token: User identity is missing.",
                headers=WWW_AUTHENTICATE_HEADER,
            )

        # Validate UUID
        try:
            valid_uuid = str(uuid.UUID(str(raw_id)))
        except (ValueError, TypeError):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token: User identity is not a valid UUID.",
                headers=WWW_AUTHENTICATE_HEADER,
            )

        role = getattr(user_response.user, "role", "authenticated") or "authenticated"
        if role == "anon":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token: Anonymous tokens are not permitted for authenticated routes.",
                headers=WWW_AUTHENTICATE_HEADER,
            )

        email = getattr(user_response.user, "email", None)

        return AuthenticatedUser(
            user_id=valid_uuid,
            email=email,
            role=role,
        )

    except HTTPException:
        raise
    except Exception as exc:
        err_msg = str(exc).lower()
        if "expired" in err_msg:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token has expired.",
                headers=WWW_AUTHENTICATE_HEADER,
            )
        if (
            "invalid" in err_msg
            or "malformed" in err_msg
            or "signature" in err_msg
            or "unauthorized" in err_msg
            or "authapierror" in err_msg
        ):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired authentication token.",
                headers=WWW_AUTHENTICATE_HEADER,
            )

        logger.error("Unexpected error during Supabase Auth token verification")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Authentication service is temporarily unavailable.",
        )


async def get_current_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(http_bearer_scheme),
) -> AuthenticatedUser:
    """
    FastAPI dependency to extract and verify the authenticated user from the Authorization header.

    Usage:
        @router.get("/protected")
        async def protected_endpoint(current_user: AuthenticatedUser = Depends(get_current_user)):
            ...
    """
    auth_header = request.headers.get("Authorization")
    token = extract_bearer_token(auth_header)
    return verify_jwt_token(token)
