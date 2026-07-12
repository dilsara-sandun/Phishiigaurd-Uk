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
    VerifyLoginTOTPRequest,
    TOTPSetupResponse,
    TOTPConfirmRequest,
    TOTPStatusResponse,
    UserProfile,
    VerifyOTPRequest,
    ProfileUpdateRequest,
    ProfileConfirmRequest,
    ChangePasswordRequest,
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
    setup_totp,
    confirm_totp,
    disable_totp,
    verify_totp_code,
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
        await db.commit()  # commit cleared attempt counters on success
    except ValueError as exc:
        await db.commit()  # commit incremented attempt counter / lockout
        err_msg = str(exc)
        http_status = status.HTTP_423_LOCKED if "locked" in err_msg.lower() else status.HTTP_401_UNAUTHORIZED
        raise HTTPException(
            status_code=http_status,
            detail=err_msg,
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Generate and save new OTP
    otp, token_expires = _generate_otp()
    user.verify_token = otp
    user.verify_token_expires = token_expires
    user.verify_token_attempts = 0
    await db.commit()

    # Only send email OTP if user does NOT have TOTP enabled
    # (TOTP users get the TOTP prompt on the frontend)
    if not user.totp_enabled:
        device_info = request.headers.get("User-Agent", "Unrecognized Device")
        email_sent = await send_login_verification_email(user.email, otp, device_info)
        if email_sent:
            logger.info("2FA email OTP sent for login: %s", user.email)
        else:
            logger.error(
                "FAILED to send 2FA OTP email for login to %s — "
                "check SMTP credentials and Brevo sender verification.",
                user.email,
            )
    else:
        logger.info("TOTP user login initiated (no email sent): %s", user.email)

    return Login2FAInitResponse(
        message="Verification code sent to your email." if not user.totp_enabled
               else "Enter the code from your authenticator app.",
        email=user.email,
        requires_2fa=True,
        totp_available=user.totp_enabled,
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


# ── POST /auth/totp/setup ─────────────────────────────────────────────────────

@router.post(
    "/totp/setup",
    response_model=TOTPSetupResponse,
    summary="Generate a TOTP secret and QR code for authenticator app setup",
)
@limiter.limit("5/minute")
async def totp_setup(
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> TOTPSetupResponse:
    """
    Generates a new TOTP secret for the authenticated user and returns:
    - The otpauth:// provisioning URI
    - A base64-encoded QR code PNG for display in the frontend
    - The raw Base32 secret for manual entry in the authenticator app

    The TOTP is NOT yet active — the user must confirm with a valid code
    via POST /auth/totp/confirm to activate it.
    """
    import base64
    import io
    import qrcode

    secret, uri = await setup_totp(db, current_user)
    await db.commit()

    # Generate QR code PNG in-memory
    qr_img = qrcode.make(uri)
    buf = io.BytesIO()
    qr_img.save(buf, format="PNG")
    qr_b64 = base64.b64encode(buf.getvalue()).decode()

    logger.info("TOTP setup initiated for user: %s", current_user.email)

    return TOTPSetupResponse(
        provisioning_uri=uri,
        qr_code_base64=qr_b64,
        secret=secret,
    )


# ── POST /auth/totp/confirm ───────────────────────────────────────────────────

@router.post(
    "/totp/confirm",
    response_model=MessageResponse,
    summary="Confirm TOTP setup by verifying the first authenticator code",
)
@limiter.limit("5/minute")
async def totp_confirm(
    request: Request,
    body: TOTPConfirmRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> MessageResponse:
    """
    Activates TOTP for the user after they enter their first valid code.
    Raises 400 if the code is wrong or no secret has been generated yet.
    """
    success = await confirm_totp(db, current_user, body.totp_code)
    if not success:
        logger.warning("TOTP confirm failed for user: %s", current_user.email)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid authenticator code. Please ensure your app is synced and try again.",
        )
    await db.commit()
    logger.info("TOTP successfully enabled for user: %s", current_user.email)
    return MessageResponse(message="Authenticator app enabled successfully. Your account is now protected by TOTP.")


# ── DELETE /auth/totp/disable ─────────────────────────────────────────────────

@router.delete(
    "/totp/disable",
    response_model=MessageResponse,
    summary="Disable TOTP and remove the stored secret",
)
@limiter.limit("3/minute")
async def totp_disable(
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> MessageResponse:
    """
    Disables TOTP for the authenticated user and wipes their stored secret.
    After this, login will fall back to email OTP.
    """
    await disable_totp(db, current_user)
    await db.commit()
    logger.info("TOTP disabled for user: %s", current_user.email)
    return MessageResponse(message="Authenticator app has been removed. Email OTP will be used for future logins.")


# ── GET /auth/totp/status ─────────────────────────────────────────────────────

@router.get(
    "/totp/status",
    response_model=TOTPStatusResponse,
    summary="Return whether TOTP is enabled for the current user",
)
async def totp_status(
    current_user: User = Depends(get_current_user),
) -> TOTPStatusResponse:
    """Return the TOTP enabled status for the current authenticated user."""
    return TOTPStatusResponse(totp_enabled=current_user.totp_enabled)


# ── POST /auth/verify-login-totp ──────────────────────────────────────────────

@router.post(
    "/verify-login-totp",
    response_model=TokenResponse,
    summary="Complete login using a TOTP code from the authenticator app",
)
@limiter.limit("10/minute")
async def verify_login_totp(
    request: Request,
    body: VerifyLoginTOTPRequest,
    response: Response,
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    """
    Accepts the 6-digit TOTP code from Microsoft/Google Authenticator at login.
    The user must have previously completed credential verification (email+password).
    Returns JWT access + refresh tokens on success.

    Security:
    - Rate-limited to 10 attempts/minute per IP
    - TOTP validation uses pyotp with valid_window=1 (clock skew tolerance)
    - Generic error messages prevent user enumeration
    """
    user = await get_user_by_email(db, body.email)

    # Generic error — do not reveal whether the account exists or TOTP is enabled
    _auth_fail = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid verification code. Please try again.",
        headers={"WWW-Authenticate": "Bearer"},
    )

    if user is None or not user.is_active or not user.totp_enabled or not user.totp_secret:
        logger.warning("TOTP login attempt for invalid/unconfigured account: %s", body.email)
        raise _auth_fail

    # Check lockout
    from datetime import datetime, timezone, timedelta
    now = datetime.now(tz=timezone.utc)
    if user.locked_until and user.locked_until > now:
        mins_left = int((user.locked_until - now).total_seconds() // 60) + 1
        raise HTTPException(
            status_code=status.HTTP_423_LOCKED,
            detail=f"Account locked. Try again in {mins_left} minutes.",
        )

    # Validate TOTP code (constant-time via pyotp)
    if not verify_totp_code(user.totp_secret, body.totp_code):
        logger.warning("Invalid TOTP code at login for user: %s", body.email)
        user.failed_login_attempts += 1
        if user.failed_login_attempts >= 3:
            user.locked_until = now + timedelta(minutes=10)
            await db.commit()
            raise HTTPException(
                status_code=status.HTTP_423_LOCKED,
                detail="Account locked for 10 minutes due to 3 failed MFA attempts.",
            )
        await db.commit()
        raise _auth_fail

    # Success — clear attempt counters
    user.failed_login_attempts = 0
    user.locked_until = None

    # Issue tokens
    access_token = create_access_token(user.id, user.role)
    refresh_token = create_refresh_token(user.id)

    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/api/auth/refresh")
    _set_token_cookies(response, access_token, refresh_token)
    await db.commit()

    logger.info("User logged in via TOTP: %s (role=%s)", user.email, user.role)

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        role=user.role,
        user_id=user.id,
        email=user.email,
    )


# ── Profile Management Endpoints ──────────────────────────────────────────────

@router.post(
    "/profile/request-update",
    response_model=MessageResponse,
    summary="Request profile/email update by sending an OTP",
)
@limiter.limit("5/minute")
async def profile_request_update(
    request: Request,
    body: ProfileUpdateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> MessageResponse:
    # If updating email, check that it's unique
    if body.email and body.email.lower() != current_user.email.lower():
        existing = await get_user_by_email(db, body.email)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email address is already in use by another account.",
            )

    # Generate OTP
    otp, token_expires = _generate_otp()
    if body.email and body.email.lower() != current_user.email.lower():
        current_user.verify_token = f"{otp}:{body.email.lower()}"
    else:
        current_user.verify_token = otp
    current_user.verify_token_expires = token_expires
    current_user.verify_token_attempts = 0
    await db.commit()

    # Send OTP to target email (new email if changing email)
    target_email = body.email.lower() if body.email else current_user.email
    email_sent = await send_otp_email(target_email, otp)
    if not email_sent:
        logger.error("Failed to send profile update OTP email to %s", target_email)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to send OTP verification email. Please try again later.",
        )

    logger.info("Profile update OTP sent to %s", target_email)
    return MessageResponse(message="Verification code sent to your email.")


@router.post(
    "/profile/confirm-update",
    response_model=MessageResponse,
    summary="Confirm profile/email update using OTP and kill active session",
)
@limiter.limit("5/minute")
async def profile_confirm_update(
    request: Request,
    body: ProfileConfirmRequest,
    response: Response,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> MessageResponse:
    # Verify OTP
    token_parts = current_user.verify_token.split(':') if current_user.verify_token else []
    try:
        await verify_otp(db, current_user.email, body.otp, check_prefix=True)
    except ValueError as exc:
        err_msg = str(exc)
        if "locked" in err_msg.lower():
            response.delete_cookie("access_token", path="/")
            response.delete_cookie("refresh_token", path="/api/auth/refresh")
            raise HTTPException(status_code=status.HTTP_423_LOCKED, detail=err_msg)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=err_msg)

    # Apply changes
    if body.first_name is not None:
        current_user.first_name = body.first_name.strip()
    if body.last_name is not None:
        current_user.last_name = body.last_name.strip()
    
    if body.email and body.email.lower() != current_user.email.lower():
        # Validate that the confirmed email matches the one in the token
        pending_email = token_parts[1] if len(token_parts) == 2 else None
        if not pending_email or pending_email != body.email.lower():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Verification email mismatch. Please request update again.",
            )

        # Check one more time to avoid race condition
        existing = await get_user_by_email(db, body.email)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email address is already in use by another account.",
            )
        current_user.email = body.email.lower()

    await db.commit()
    logger.info("Profile updated for user %s. Terminating session.", current_user.email)

    # Invalidate session (delete cookies)
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/api/auth/refresh")

    return MessageResponse(message="Profile updated successfully. Session terminated, please login again.")


@router.post(
    "/change-password",
    response_model=MessageResponse,
    summary="Change user password and send confirmation email",
)
@limiter.limit("5/minute")
async def change_password_endpoint(
    request: Request,
    body: ChangePasswordRequest,
    response: Response,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> MessageResponse:
    # Check if already locked
    from datetime import datetime, timezone, timedelta
    now = datetime.now(tz=timezone.utc)
    if current_user.locked_until and current_user.locked_until > now:
        response.delete_cookie("access_token", path="/")
        response.delete_cookie("refresh_token", path="/api/auth/refresh")
        mins_left = int((current_user.locked_until - now).total_seconds() // 60) + 1
        raise HTTPException(
            status_code=status.HTTP_423_LOCKED,
            detail=f"Account locked. Try again in {mins_left} minutes.",
        )

    # Validate current password
    from app.services.auth_service import verify_password, hash_password
    if not verify_password(body.current_password, current_user.password_hash):
        current_user.failed_login_attempts += 1
        if current_user.failed_login_attempts >= 3:
            current_user.locked_until = now + timedelta(minutes=10)
            await db.commit()
            response.delete_cookie("access_token", path="/")
            response.delete_cookie("refresh_token", path="/api/auth/refresh")
            raise HTTPException(
                status_code=status.HTTP_423_LOCKED,
                detail="Account locked for 10 minutes due to 3 failed update attempts.",
            )
        await db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Current password is incorrect. {3 - current_user.failed_login_attempts} attempts remaining.",
        )

    # Update password
    current_user.password_hash = hash_password(body.new_password)
    current_user.failed_login_attempts = 0
    current_user.locked_until = None
    await db.commit()

    # Invalidate session (delete cookies)
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/api/auth/refresh")

    # Send confirmation email
    try:
        await send_password_changed_email(current_user.email)
    except Exception as exc:
        logger.error("Failed to send password-changed email to %s: %s", current_user.email, exc)

    logger.info("Password changed successfully for user: %s. Terminating session.", current_user.email)
    return MessageResponse(message="Password has been changed successfully. Session terminated, please login again.")
