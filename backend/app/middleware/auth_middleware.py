"""
middleware/auth_middleware.py
──────────────────────────────
FastAPI dependency functions for authentication and authorisation.

Usage in routers:
    current_user: User = Depends(get_current_user)
    admin_user:   User = Depends(require_admin)
"""

import uuid
import logging

from fastapi import Cookie, Depends, Header, HTTPException, status
from jose import JWTError
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User
from app.services.auth_service import decode_token, get_user_by_id

logger = logging.getLogger(__name__)

_CREDENTIALS_EXCEPTION = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Could not validate credentials. Please log in again.",
    headers={"WWW-Authenticate": "Bearer"},
)

_INACTIVE_EXCEPTION = HTTPException(
    status_code=status.HTTP_403_FORBIDDEN,
    detail="This account is inactive.",
)

_UNVERIFIED_EXCEPTION = HTTPException(
    status_code=status.HTTP_403_FORBIDDEN,
    detail="Please verify your email address before using this feature.",
)

_ADMIN_EXCEPTION = HTTPException(
    status_code=status.HTTP_403_FORBIDDEN,
    detail="Administrator privileges required.",
)


def _extract_token(
    authorization: str | None = Header(default=None),
    access_token: str | None = Cookie(default=None),
) -> str:
    """
    Extract the JWT from either:
      - Authorization: Bearer <token>  (API / Axios clients)
      - access_token httpOnly cookie    (browser session)

    Raises HTTP 401 if neither is present.
    """
    if authorization and authorization.startswith("Bearer "):
        return authorization.split(" ", 1)[1]
    if access_token:
        return access_token
    raise _CREDENTIALS_EXCEPTION


async def get_current_user(
    token: str = Depends(_extract_token),
    db: AsyncSession = Depends(get_db),
) -> User:
    """
    Decode the JWT, load the user from the database, and return the User ORM object.
    Raises HTTP 401 if the token is invalid or the user does not exist.
    Raises HTTP 403 if the account is inactive.
    """
    try:
        payload = decode_token(token)
        if payload.get("type") != "access":
            raise _CREDENTIALS_EXCEPTION
        user_id = uuid.UUID(payload["sub"])
    except (JWTError, ValueError, KeyError):
        raise _CREDENTIALS_EXCEPTION

    user = await get_user_by_id(db, user_id)
    if user is None:
        raise _CREDENTIALS_EXCEPTION
    if not user.is_active:
        raise _INACTIVE_EXCEPTION
    return user


async def get_verified_user(
    current_user: User = Depends(get_current_user),
) -> User:
    """
    Like get_current_user but also requires the email to be verified.
    """
    if not current_user.is_verified:
        raise _UNVERIFIED_EXCEPTION
    return current_user


async def require_admin(
    current_user: User = Depends(get_current_user),
) -> User:
    """
    Require the current user to have the 'admin' role.
    Raises HTTP 403 otherwise.
    """
    if current_user.role != "admin":
        raise _ADMIN_EXCEPTION
    return current_user