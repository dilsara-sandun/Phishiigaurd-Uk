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
    ForgotPasswordRequest,
    LoginRequest,
    MessageResponse,
    RefreshRequest,
    RegisterRequest,
    RegisterResponse,
    ResetPasswordRequest,
    TokenResponse,
    UserProfile,
    VerifyOTPRequest,
)
from app.services.auth_service import (
    authenticate_user,
    create_access_token,
    create_password_reset_token,
    create_refresh_token,
    decode_token,
    get_user_by_id,
    refresh_access_token,
    register_user,
    reset_password_with_token,
    verify_otp,
)
from app.services.notification_service import (
    send_otp_email,
    send_password_reset_email,
)
from app.config import settings
import uuid

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
        logger.info("New user registered: %s (id=%s)", user.email, user.id)
        
        # Send OTP by email
        await send_otp_email(user.email, user.verify_token)
        
    except ValueError as exc:
        # Prevent Account Enumeration: Log the conflict internally but return standard success.
        logger.warning("Registration blocked (Account Enumeration Mitigation): %s", str(exc))
        return RegisterResponse(
            message="Registration successful. Please check your email for the OTP code.",
            user_id="pending-verification-state",
        )

    return RegisterResponse(
        message="Registration successful. Please check your email for the OTP code.",
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

    try:
        payload = decode_token(new_access)
        user_id = uuid.UUID(payload["sub"])
        role = payload.get("role", "user")
    except Exception:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token decode error")

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


# ── POST /auth/verify-otp ─────────────────────────────────────────────────────

@router.post(
    "/verify-otp",
    response_model=MessageResponse,
    summary="Verify email address using a numeric OTP code",
)
async def verify_otp_endpoint(
    body: VerifyOTPRequest,
    db: AsyncSession = Depends(get_db),
) -> MessageResponse:
    """
    Mark the user's email as verified using the 6-digit OTP.
    """
    try:
        await verify_otp(db, body.email, body.otp)
        await db.commit()
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))

    logger.info("OTP verified for user: %s", body.email)
    return MessageResponse(message="Email verified successfully. You can now log in.")


# ── POST /auth/forgot-password ───────────────────────────────────────────────

@router.post(
    "/forgot-password",
    response_model=MessageResponse,
    summary="Request a password reset token",
)
async def forgot_password(
    body: ForgotPasswordRequest,
    db: AsyncSession = Depends(get_db),
) -> MessageResponse:
    try:
        token = await create_password_reset_token(db, body.email)
        await send_password_reset_email(body.email, token)
        await db.commit()
    except ValueError:
        # Standard security practice: don't reveal if account exists
        pass
    
    return MessageResponse(message="If an account exists with that email, a reset link has been sent.")


# ── POST /auth/reset-password ────────────────────────────────────────────────

@router.post(
    "/reset-password",
    response_model=MessageResponse,
    summary="Reset password using a token",
)
async def reset_password(
    body: ResetPasswordRequest,
    db: AsyncSession = Depends(get_db),
) -> MessageResponse:
    try:
        await reset_password_with_token(db, body.token, body.new_password)
        await db.commit()
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
    
    return MessageResponse(message="Password has been reset successfully.")


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