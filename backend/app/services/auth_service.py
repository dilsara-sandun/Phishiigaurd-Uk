"""
services/auth_service.py
────────────────────────
Business logic for user registration, login, token issuance, and verification.
All password hashing and JWT operations live here, keeping routers thin.
"""

import secrets
import uuid
from datetime import datetime, timedelta, timezone

import bcrypt
import pyotp
from jose import JWTError, jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.user import User

# ── Password hashing ──────────────────────────────────────────────────────────

def hash_password(plain: str) -> str:
    """Return the bcrypt hash of *plain*."""
    pwd_bytes = plain.encode('utf-8')
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(pwd_bytes, salt).decode('utf-8')


def verify_password(plain: str, hashed: str) -> bool:
    """Return True if *plain* matches the stored *hashed* password."""
    pwd_bytes = plain.encode('utf-8')
    hashed_bytes = hashed.encode('utf-8')
    return bcrypt.checkpw(pwd_bytes, hashed_bytes)


# ── JWT helpers ───────────────────────────────────────────────────────────────

def _create_token(data: dict, expires_delta: timedelta) -> str:
    """Encode a JWT with the given payload and expiry."""
    payload = data.copy()
    payload["exp"] = datetime.now(tz=timezone.utc) + expires_delta
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def create_access_token(user_id: uuid.UUID, role: str) -> str:
    return _create_token(
        {"sub": str(user_id), "role": role, "type": "access"},
        timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
    )


def create_refresh_token(user_id: uuid.UUID) -> str:
    return _create_token(
        {"sub": str(user_id), "type": "refresh"},
        timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
    )


def decode_token(token: str) -> dict:
    """
    Decode and validate a JWT.  Raises jose.JWTError on failure.
    Returns the raw payload dict on success.
    """
    return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])


# ── Verification token ────────────────────────────────────────────────────────

def _generate_otp() -> tuple[str, datetime]:
    """Return a numeric 6-digit OTP and its expiry datetime."""
    # Generate 6 digits
    otp = "".join([str(secrets.randbelow(10)) for _ in range(settings.OTP_LENGTH)])
    expires = datetime.now(tz=timezone.utc) + timedelta(
        minutes=settings.OTP_EXPIRE_MINUTES
    )
    return otp, expires


def _generate_reset_token() -> tuple[str, datetime]:
    """Return a cryptographically secure hex token for password reset."""
    token = secrets.token_urlsafe(32)
    expires = datetime.now(tz=timezone.utc) + timedelta(
        hours=1  # Reset tokens expire in 1 hour
    )
    return token, expires


# ── TOTP / Authenticator App ────────────────────────────────────────────────────

APP_NAME = "PhishGuard UK"


def generate_totp_secret(user_email: str) -> tuple[str, str]:
    """
    Generate a new cryptographically secure TOTP secret.
    Returns (base32_secret, provisioning_uri).
    The provisioning_uri is the otpauth:// URL to encode in a QR code.
    """
    secret = pyotp.random_base32()   # 160-bit (32 chars) secure random secret
    totp = pyotp.TOTP(secret)
    uri = totp.provisioning_uri(name=user_email, issuer_name=APP_NAME)
    return secret, uri


def verify_totp_code(secret: str, code: str) -> bool:
    """
    Validate a 6-digit TOTP code against the stored secret.
    valid_window=1 allows one 30-second window drift on either side
    to compensate for clock skew between server and device.
    """
    if not secret or not code:
        return False
    totp = pyotp.TOTP(secret)
    return totp.verify(code, valid_window=1)


async def setup_totp(db: AsyncSession, user: User) -> tuple[str, str]:
    """
    Generate and persist a pending TOTP secret for the user.
    The secret is saved but totp_enabled remains False until the user
    confirms with their first valid code (see confirm_totp).
    Returns (secret, provisioning_uri).
    """
    secret, uri = generate_totp_secret(user.email)
    user.totp_secret = secret
    user.totp_enabled = False   # not yet confirmed
    await db.flush()
    return secret, uri


async def confirm_totp(db: AsyncSession, user: User, code: str) -> bool:
    """
    Verify the first TOTP code entered by the user during setup.
    If valid, sets totp_enabled=True and commits.
    Returns True on success, False if code is wrong.
    """
    if not user.totp_secret:
        return False
    if not verify_totp_code(user.totp_secret, code):
        return False
    user.totp_enabled = True
    await db.flush()
    return True


async def disable_totp(db: AsyncSession, user: User) -> None:
    """Disable TOTP for the user and wipe the stored secret."""
    user.totp_secret = None
    user.totp_enabled = False
    await db.flush()


# ── Database helpers ──────────────────────────────────────────────────────────

async def get_user_by_email(db: AsyncSession, email: str) -> User | None:
    result = await db.execute(select(User).where(User.email == email.lower()))
    return result.scalar_one_or_none()


async def get_user_by_id(db: AsyncSession, user_id: uuid.UUID) -> User | None:
    result = await db.execute(select(User).where(User.id == user_id))
    return result.scalar_one_or_none()


# ── Registration ───────────────────────────────────────────────────────────────

async def register_user(db: AsyncSession, email: str, password: str) -> User:
    """
    Create a new user with a numeric OTP.
    """
    existing = await get_user_by_email(db, email)
    if existing is not None:
        if existing.is_verified:
            raise ValueError("An account with this email address already exists")
        else:
            # User exists but not verified. Update OTP and resend!
            otp, token_expires = _generate_otp()
            existing.verify_token = otp
            existing.verify_token_expires = token_expires
            existing.verify_token_attempts = 0
            existing.password_hash = hash_password(password)
            await db.flush()
            return existing

    otp, token_expires = _generate_otp()

    user = User(
        email=email.lower(),
        password_hash=hash_password(password),
        role="user",
        is_verified=False,
        verify_token=otp,
        verify_token_expires=token_expires,
    )
    db.add(user)
    await db.flush()
    return user


# ── Login ──────────────────────────────────────────────────────────────────────

async def authenticate_user(
    db: AsyncSession, email: str, password: str
) -> User:
    """
    Validate credentials.

    Raises ValueError with a generic message on any failure
    (avoids leaking whether the email exists).
    """
    user = await get_user_by_email(db, email)
    if user is None or not verify_password(password, user.password_hash):
        raise ValueError("Invalid email or password")
    if not user.is_active:
        raise ValueError("This account has been deactivated")
    return user


# ── Email verification ────────────────────────────────────────────────────────

async def verify_otp(db: AsyncSession, email: str, otp: str) -> User:
    """
    Mark a user as verified if the OTP is valid and not expired.
    """
    user = await get_user_by_email(db, email)
    if user is None:
        raise ValueError("User not found")
    
    if user.verify_token != otp:
        user.verify_token_attempts += 1
        await db.flush()
        
        if user.verify_token_attempts >= 3:
            user.verify_token = None
            user.verify_token_expires = None
            user.verify_token_attempts = 0
            await db.flush()
            raise ValueError("Too many failed attempts. This OTP has been invalidated. Please request a new one.")
            
        raise ValueError(f"Invalid OTP code. {3 - user.verify_token_attempts} attempts remaining.")
    
    now = datetime.now(tz=timezone.utc)
    if user.verify_token_expires and user.verify_token_expires < now:
        raise ValueError("OTP has expired. Please request a new one.")
    
    user.is_verified = True
    user.verify_token = None
    user.verify_token_expires = None
    user.verify_token_attempts = 0
    await db.flush()
    return user


async def create_password_reset_token(db: AsyncSession, email: str) -> str:
    """Generate and store a password reset token for a user."""
    user = await get_user_by_email(db, email)
    if user is None:
        # In a real app we might not want to disclose this, but for testing we will.
        raise ValueError("User not found")
    
    token, expires = _generate_reset_token()
    user.verify_token = token
    user.verify_token_expires = expires
    user.verify_token_attempts = 0
    await db.flush()
    return token


async def reset_password_with_token(db: AsyncSession, token: str, new_password: str) -> User:
    """Reset user password using a valid token."""
    result = await db.execute(select(User).where(User.verify_token == token))
    user = result.scalar_one_or_none()
    
    if user is None:
        raise ValueError("Invalid reset token")
    
    now = datetime.now(tz=timezone.utc)
    if user.verify_token_expires and user.verify_token_expires < now:
        raise ValueError("Reset token has expired")
    
    user.password_hash = hash_password(new_password)
    user.verify_token = None
    user.verify_token_expires = None
    await db.flush()
    return user


# ── Token refresh ─────────────────────────────────────────────────────────────

async def refresh_access_token(db: AsyncSession, refresh_token: str) -> tuple[str, str]:
    """
    Validate a refresh token and return a new (access_token, refresh_token) pair.
    Raises ValueError on invalid token.
    """
    try:
        payload = decode_token(refresh_token)
    except JWTError as exc:
        raise ValueError("Invalid or expired refresh token") from exc

    if payload.get("type") != "refresh":
        raise ValueError("Token is not a refresh token")

    user_id = uuid.UUID(payload["sub"])
    user = await get_user_by_id(db, user_id)
    if user is None or not user.is_active:
        raise ValueError("User not found or inactive")

    new_access = create_access_token(user.id, user.role)
    new_refresh = create_refresh_token(user.id)
    return new_access, new_refresh