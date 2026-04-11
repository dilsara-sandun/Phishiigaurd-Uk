"""
routers/auth.py
───────────────
Authentication endpoints:
  POST /auth/register          Create a new user account
  POST /auth/login             Authenticate and receive JWT tokens
  POST /auth/refresh           Rotate access + refresh token pair
  POST /auth/logout            Clear the httpOnly cookie
  GET  /auth/verify-email      Verify email with one-time token
  GET  /auth/me                Return current user profile
"""

import logging
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.middleware.auth_middleware import get_current_user
from app.middleware.rate_limit import limiter
from app.models.user import User
from app.schemas.auth_schema import (
    LoginRequest,
    MessageResponse,
    RefreshRequest,
    RegisterRequest,
    RegisterResponse,
    TokenResponse,
    UserProfile,
)
from app.services.auth_service import (
    authenticate_user,
    create_access_token,
    create_refresh_token,
    refresh_access_token,
    register_user,
    verify_email_token,
)
from app.config import settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["Authentication"])


# ── Helper: set httpOnly cookie ───────────────────────────────────────────────

def _set_token_cookies(response: Response, access_token: str, refresh_token: str) -> None:
    """Write both tokens into secure httpOnly cookies."""
    is_prod = settings.ENVIRONMENT == "production"

    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=is_prod,
        samesite="lax",
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        path="/",
    )
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=is_prod,
        samesite="lax",
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 86400,
        path="/api/auth/refresh",   # restrict refresh cookie to the refresh endpoint
    )


# ── POST /auth/register ────────────────────────────────────────────────────────

@router.post(
    "/register",
    response_model=RegisterResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new user account",
)
@limiter.limit("5/minute")
async def register(
    request: Request,
    body: RegisterRequest,
    db: AsyncSession = Depends(get_db),
) -> RegisterResponse:
    """
    Create a new user account.

    - Validates email format and password complexity.
    - Hashes the password with bcrypt.
    - Generates a one-time email verification token.
    - Returns HTTP 409 if the email is already registered.
    """
    try:
        user = await register_user(db, body.email, body.password)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc))

    logger.info("New user registered: %s (id=%s)", user.email, user.id)

    # In a full deployment, send user.verify_token by email here.
    # For the prototype, we log it so developers can verify manually.
    logger.debug(
        "Email verification token for %s: %s (expires %s)",
        user.email,
        user.verify_token,
        user.verify_token_expires,
    )

    return RegisterResponse(
        message="Registration successful. Please check your email to verify your account.",
        user_id=user.id,
    )


# ── POST /auth/login ──────────────────────────────────────────────────────────

@router.post(
    "/login",
    response_model=TokenResponse,
    summary="Authenticate and receive JWT tokens",
)
@limiter.limit("10/minute")
async def login(
    request: Request,
    body: LoginRequest,
    response: Response,
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    """
    Validate credentials and return a JWT access + refresh token pair.

    Tokens are written into httpOnly cookies (browser clients) and also
    returned in the response body (API / Axios clients).
    Returns HTTP 401 on invalid credentials.
    """
    try:
        user = await authenticate_user(db, body.email, body.password)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(exc),
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = create_access_token(user.id, user.role)
    refresh_token = create_refresh_token(user.id)

    _set_token_cookies(response, access_token, refresh_token)

    logger.info("User logged in: %s (role=%s)", user.email, user.role)

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        role=user.role,
        user_id=user.id,
        email=user.email,
    )


# ── POST /auth/refresh ────────────────────────────────────────────────────────

@router.post(
    "/refresh",
    response_model=TokenResponse,
    summary="Rotate the access and refresh token pair",
)
@limiter.limit("20/minute")
async def refresh(
    request: Request,
    body: RefreshRequest,
    response: Response,
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    """
    Accept a valid refresh token and return a new token pair.
    The old refresh token is implicitly invalidated (stateless rotation).
    Returns HTTP 401 if the refresh token is invalid or expired.
    """
    try:
        new_access, new_refresh = await refresh_access_token(db, body.refresh_token)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc))

    # Decode to get user info for the response
    from app.services.auth_service import decode_token
    import uuid

    try:
        payload = decode_token(new_access)
        user_id = uuid.UUID(payload["sub"])
        role = payload.get("role", "user")
    except Exception:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token decode error")

    from app.services.auth_service import get_user_by_id
    user = await get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")

    _set_token_cookies(response, new_access, new_refresh)

    return TokenResponse(
        access_token=new_access,
        refresh_token=new_refresh,
        role=role,
        user_id=user_id,
        email=user.email,
    )


# ── POST /auth/logout ─────────────────────────────────────────────────────────

@router.post(
    "/logout",
    response_model=MessageResponse,
    summary="Clear authentication cookies",
)
async def logout(response: Response) -> MessageResponse:
    """
    Clear the access_token and refresh_token httpOnly cookies.
    The client is responsible for discarding any in-memory token copies.
    """
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/api/auth/refresh")
    return MessageResponse(message="Logged out successfully.")


# ── GET /auth/verify-email ────────────────────────────────────────────────────

@router.get(
    "/verify-email",
    response_model=MessageResponse,
    summary="Verify email address using a one-time token",
)
async def verify_email(
    token: str = Query(..., description="One-time verification token from the email link"),
    db: AsyncSession = Depends(get_db),
) -> MessageResponse:
    """
    Mark the user's email as verified.
    The token is consumed on first use.
    Returns HTTP 400 if the token is invalid or expired.
    """
    try:
        user = await verify_email_token(db, token)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))

    logger.info("Email verified for user: %s", user.email)
    return MessageResponse(message="Email verified successfully. You can now log in.")


# ── GET /auth/me ──────────────────────────────────────────────────────────────

@router.get(
    "/me",
    response_model=UserProfile,
    summary="Return the current authenticated user's profile",
)
async def get_me(
    current_user: User = Depends(get_current_user),
) -> UserProfile:
    """
    Return profile information for the currently authenticated user.
    Requires a valid access token.
    """
    return UserProfile.model_validate(current_user)