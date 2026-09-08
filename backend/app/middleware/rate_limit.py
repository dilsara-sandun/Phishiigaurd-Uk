"""
middleware/rate_limit.py
────────────────────────
Global rate-limiter configuration using slowapi (Starlette wrapper for limits).

Scan endpoints are limited to 20 requests per hour per authenticated user.
Unauthenticated routes (auth) are limited per IP address.
"""

from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address
from fastapi import Request
from fastapi.responses import JSONResponse


def _get_user_id_or_ip(request: Request) -> str:
    """
    Rate-limit key function.
    Uses the authenticated user's ID if a valid JWT is present,
    otherwise falls back to the client's IP address.
    """
    user = getattr(request.state, "user", None)
    if user is not None:
        return str(user.id)
    return get_remote_address(request)


# Module-level limiter — imported by main.py and individual routers
limiter = Limiter(key_func=_get_user_id_or_ip)


def rate_limit_exceeded_handler(request: Request, exc: Exception) -> JSONResponse:
    """
    Custom JSON error response when the rate limit is exceeded.
    Returns HTTP 429 with a descriptive message and proper Retry-After header.
    """
    detail_msg = getattr(exc, "detail", str(exc))
    return JSONResponse(
        status_code=429,
        content={
            "detail": (
                f"Rate limit exceeded: {detail_msg}. "
                "Scan endpoints are limited to 20 requests per hour per user."
            ),
            "retry_after": 3600,
        },
        headers={"Retry-After": "3600"},
    )