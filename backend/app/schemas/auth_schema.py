"""
schemas/auth_schema.py
──────────────────────
Pydantic v2 schemas for authentication endpoints.
FastAPI uses these for request body validation and OpenAPI doc generation.
"""

import uuid
from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator


# ── Registration ───────────────────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    """
    Registration request.
    Accepts any valid email address — corporate, personal (Gmail/Outlook),
    university, or banking domain.
    confirm_password is optional; when omitted it is treated as equal to
    password so single-field frontend forms pass validation without errors.
    """
    email: EmailStr
    password: str = Field(min_length=8, max_length=72)
    confirm_password: Optional[str] = Field(default=None, max_length=72)

    @field_validator("password")
    @classmethod
    def password_complexity(cls, v: str) -> str:
        if not any(c.isupper() for c in v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not any(c.isdigit() for c in v):
            raise ValueError("Password must contain at least one digit")
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters long")
        if len(v.encode('utf-8')) > 72:
            raise ValueError("Password cannot exceed 72 bytes")
        return v

    @model_validator(mode="after")
    def passwords_must_match(self) -> "RegisterRequest":
        """
        If confirm_password was provided, verify it matches password.
        If omitted (None), silently default it — single-field forms are allowed.
        """
        if self.confirm_password is None:
            # Frontend did not send confirm_password — treat as matching
            self.confirm_password = self.password
        elif self.confirm_password != self.password:
            raise ValueError("Passwords do not match")
        return self


class RegisterResponse(BaseModel):
    message: str = "Registration successful. Please check your email to verify your account."
    user_id: uuid.UUID | str


# ── Login ──────────────────────────────────────────────────────────────────────

class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=72)


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: Literal["bearer"] = "bearer"
    role: Literal["user", "admin"]
    user_id: uuid.UUID
    email: str


class Login2FAInitResponse(BaseModel):
    message: str
    requires_2fa: bool = True
    email: str
    totp_available: bool = False  # True if user has TOTP set up


class VerifyLoginRequest(BaseModel):
    email: EmailStr
    otp: str = Field(min_length=6, max_length=6)


class VerifyLoginTOTPRequest(BaseModel):
    """Verify login using TOTP code from authenticator app."""
    email: EmailStr
    totp_code: str = Field(min_length=6, max_length=6, pattern=r'^[0-9]{6}$')


# ── TOTP Setup ────────────────────────────────────────────────────────────────

class TOTPSetupResponse(BaseModel):
    """Returned when a user initiates TOTP setup."""
    provisioning_uri: str     # otpauth:// URI to encode in QR code
    qr_code_base64: str       # base64-encoded PNG QR code image
    secret: str               # Base32 secret (for manual entry in authenticator)


class TOTPConfirmRequest(BaseModel):
    """User confirms TOTP setup by entering first generated code."""
    totp_code: str = Field(min_length=6, max_length=6, pattern=r'^[0-9]{6}$')


class TOTPStatusResponse(BaseModel):
    totp_enabled: bool


# ── Token refresh ─────────────────────────────────────────────────────────────

class RefreshRequest(BaseModel):
    refresh_token: str


# ── Email verification ────────────────────────────────────────────────────────

class VerifyOTPRequest(BaseModel):
    email: EmailStr
    otp: str = Field(min_length=6, max_length=6)


# ── Password reset ────────────────────────────────────────────────────────────

class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str = Field(min_length=8, max_length=72)

    @field_validator("new_password")
    @classmethod
    def password_complexity(cls, v: str) -> str:
        if not any(c.isupper() for c in v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not any(c.isdigit() for c in v):
            raise ValueError("Password must contain at least one digit")
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters long")
        if len(v.encode('utf-8')) > 72:
            raise ValueError("Password cannot exceed 72 bytes")
        return v


# ── Current user (returned by /auth/me) ──────────────────────────────────────

class UserProfile(BaseModel):
    id: uuid.UUID
    email: str
    role: str
    is_verified: bool
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Generic message response ──────────────────────────────────────────────────

class MessageResponse(BaseModel):
    message: str


# ── UserProfile (returned by /auth/me) — include totp_enabled ────────────────

class UserProfile(BaseModel):
    id: uuid.UUID
    email: str
    role: str
    is_verified: bool
    totp_enabled: bool = False
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Profile update requests ──────────────────────────────────────────────────

class ProfileUpdateRequest(BaseModel):
    first_name: Optional[str] = Field(default=None, max_length=100)
    last_name: Optional[str] = Field(default=None, max_length=100)
    email: Optional[EmailStr] = Field(default=None)


class ProfileConfirmRequest(BaseModel):
    first_name: Optional[str] = Field(default=None, max_length=100)
    last_name: Optional[str] = Field(default=None, max_length=100)
    email: Optional[EmailStr] = Field(default=None)
    otp: str = Field(min_length=6, max_length=6)


class ChangePasswordRequest(BaseModel):
    current_password: str = Field(min_length=1)
    new_password: str = Field(min_length=12, max_length=72)

    @field_validator("new_password")
    @classmethod
    def password_complexity(cls, v: str) -> str:
        if not any(c.isupper() for c in v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not any(c.islower() for c in v):
            raise ValueError("Password must contain at least one lowercase letter")
        if not any(c.isdigit() for c in v):
            raise ValueError("Password must contain at least one digit")
        if len(v) < 12:
            raise ValueError("Password must be at least 12 characters long")
        if len(v.encode('utf-8')) > 72:
            raise ValueError("Password cannot exceed 72 bytes")
        return v