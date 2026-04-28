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
    Login2FAInitResponse,
    VerifyLoginRequest,
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
    get_user_by_email,
    refresh_access_token,
    register_user,
    reset_password_with_token,
    verify_otp,
    _generate_otp,
)
from app.services.notification_service import (
    send_otp_email,
    send_password_reset_email,
    send_password_changed_email,
    send_login_verification_email,
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
        samesite="strict",
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        path="/",
    )
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=is_prod,
        samesite="strict",
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
        await db.commit()  # <--- CRITICAL: Must commit to save the user!
        await db.refresh(user)
        logger.info("New user registered: %s (id=%s)", user.email, user.id)
        
        # Send OTP by email
        email_sent = await send_otp_email(user.email, user.verify_token)
        if not email_sent:
            logger.error("Failed to send OTP email to %s", user.email)
            
        return RegisterResponse(user_id=user.id)
        
    except ValueError as exc:
        err_msg = str(exc)
        # If it's a "user already exists" error, we mitigate enumeration by returning success
        if "already exists" in err_msg.lower():
            logger.warning("Registration blocked (Account Enumeration Mitigation): %s", err_msg)
            return RegisterResponse(
                message="Registration successful. Please check your email for the OTP code.",
                user_id="pending-verification-state",
            )
        
        # For other ValueErrors (like password too long), we should probably let the user know
        # but since the original code treated all ValueErrors as enumeration, I'll keep it 
        # similar but log specifically.
        logger.error("Registration failed with ValueError: %s", err_msg)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=err_msg)
    
    except Exception as exc:
        logger.error("Unexpected error during registration: %s", exc, exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal server error during registration")


# ── POST /auth/login ──────────────────────────────────────────────────────────

@router.post(
    "/login",
    response_model=Login2FAInitResponse,
    summary="Authenticate and trigger 2FA OTP email",
)
@limiter.limit("10/minute")
async def login(
    request: Request,
    body: LoginRequest,
    db: AsyncSession = Depends(get_db),
) -> Login2FAInitResponse:
    """
    Validate credentials and send a 2FA OTP email.
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

    # Generate and save new OTP
    otp, token_expires = _generate_otp()
    user.verify_token = otp
    user.verify_token_expires = token_expires
    user.verify_token_attempts = 0
    await db.commit()

    device_info = request.headers.get("User-Agent", "Unrecognized Device")
    await send_login_verification_email(user.email, otp, device_info)
    
    logger.info("2FA OTP sent for user login: %s", user.email)

    return Login2FAInitResponse(
        message="Verification code sent to your email.",
        email=user.email,
        requires_2fa=True
    )


# ── POST /auth/verify-login ───────────────────────────────────────────────────

@router.post(
    "/verify-login",
    response_model=TokenResponse,
    summary="Verify login OTP and receive JWT tokens",
)
@limiter.limit("10/minute")
async def verify_login_endpoint(
    request: Request,
    body: VerifyLoginRequest,
    response: Response,
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    """
    Accepts the 6-digit OTP sent to the user's email during login.
    Returns the JWT access + refresh token pair on success.
    """
    try:
        await verify_otp(db, body.email, body.otp)
        await db.commit()
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
        
    user = await get_user_by_email(db, body.email)

    access_token = create_access_token(user.id, user.role)
    refresh_token = create_refresh_token(user.id)

    # Session Rotation: Clear existing cookies before setting new ones
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/api/auth/refresh")
    
    _set_token_cookies(response, access_token, refresh_token)
    logger.info("User logged in (2FA Verified, Session Rotated): %s (role=%s)", user.email, user.role)

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
    """
    Reset the user's password using a valid token.

    Steps:
      1. Validate the token and update the password_hash in the DB.
      2. Commit immediately so the DB is always the source of truth.
      3. Fire a "your password was changed" confirmation email asynchronously.
    """
    try:
        user = await reset_password_with_token(db, body.token, body.new_password)
        # ── Commit first: DB is always the source of truth ──────────────────────
        await db.commit()
        logger.info("Password reset successful for user: %s", user.email)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))

    # ── Send confirmation email (non-blocking — DB already committed) ───────────
    try:
        await send_password_changed_email(user.email)
    except Exception as exc:
        # Email failure must never break the password-reset flow
        logger.error("Failed to send password-changed email to %s: %s", user.email, exc)

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