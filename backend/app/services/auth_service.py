"""
services/auth_service.py
────────────────────────
Business logic for user registration, login, token issuance, and verification.
All password hashing and JWT operations live here, keeping routers thin.
"""

import secrets
import uuid
from datetime import datetime, timedelta, timezone

from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.user import User

# ── Password hashing ──────────────────────────────────────────────────────────
_pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(plain: str) -> str:
    """Return the bcrypt hash of *plain*."""
    return _pwd_ctx.hash(plain)


def verify_password(plain: str, hashed: str) -> bool:
    """Return True if *plain* matches the stored *hashed* password."""
    return _pwd_ctx.verify(plain, hashed)


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

def _generate_verify_token() -> tuple[str, datetime]:
    """Return a cryptographically secure hex token and its expiry datetime."""
    token = secrets.token_hex(32)
    expires = datetime.now(tz=timezone.utc) + timedelta(
        hours=settings.EMAIL_VERIFY_TOKEN_EXPIRE_HOURS
    )
    return token, expires


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
    Create a new user.

    Raises ValueError if the email is already registered.
    The caller is responsible for committing the session.
    """
    existing = await get_user_by_email(db, email)
    if existing is not None:
        raise ValueError("An account with this email address already exists")

    verify_token, token_expires = _generate_verify_token()

    user = User(
        email=email.lower(),
        password_hash=hash_password(password),
        role="user",
        is_verified=False,
        verify_token=verify_token,
        verify_token_expires=token_expires,
    )
    db.add(user)
    await db.flush()   # populate user.id without committing
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

async def verify_email_token(db: AsyncSession, token: str) -> User:
    """
    Mark a user as verified if the token is valid and not expired.
    Raises ValueError on invalid/expired token.
    """
    result = await db.execute(select(User).where(User.verify_token == token))
    user = result.scalar_one_or_none()
    if user is None:
        raise ValueError("Invalid verification token")
    now = datetime.now(tz=timezone.utc)
    if user.verify_token_expires and user.verify_token_expires < now:
        raise ValueError("Verification token has expired. Please request a new one.")
    user.is_verified = True
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