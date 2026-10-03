"""
Tiny in-process sliding-window rate limiter keyed by authenticated user id.
Used on LLM / embedding backed endpoints. For multi-instance deployments swap the store for Redis.
"""
import time
from collections import defaultdict, deque
from typing import Deque, Dict

from fastapi import Depends, HTTPException, status

from app.core.auth import AuthenticatedUser, get_current_user
from app.core.config import settings

_WINDOW_SECONDS = 60.0
_hits: Dict[str, Deque[float]] = defaultdict(deque)


def reset_rate_limits() -> None:
    _hits.clear()


def check_rate_limit(user_id: str, limit: int = 0) -> None:
    max_requests = limit or settings.RATE_LIMIT_PER_MINUTE
    now = time.monotonic()
    window = _hits[user_id]
    while window and now - window[0] > _WINDOW_SECONDS:
        window.popleft()
    if len(window) >= max_requests:
        retry_after = max(1, int(_WINDOW_SECONDS - (now - window[0])))
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many requests. Please wait a moment and try again.",
            headers={"Retry-After": str(retry_after)},
        )
    window.append(now)


async def rate_limited_user(current_user: AuthenticatedUser = Depends(get_current_user)) -> AuthenticatedUser:
    """Auth dependency that also enforces the per-user LLM rate limit."""
    check_rate_limit(current_user.user_id)
    return current_user
