"""
schemas/auth_schema.py
──────────────────────
Pydantic v2 schemas for authentication endpoints.
FastAPI uses these for request body validation and OpenAPI doc generation.
"""

import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, EmailStr, Field, field_validator


# ── Registration ───────────────────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    """
    Registration request.
    Accepts any valid email address — corporate, personal (Gmail/Outlook),
    university, or banking domain.
    confirm_password is optional; when omitted it defaults to the value of
    password so single-field frontend forms still pass validation.
    """
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    confirm_password: str | None = Field(default=None, min_length=8, max_length=128)

    @field_validator("confirm_password", mode="before")
    @classmethod
    def default_confirm_password(cls, v, info):
        """If confirm_password is not provided, treat it as equal to password."""
        if v is None:
            return info.data.get("password")
        return v

    @field_validator("confirm_password")
    @classmethod
    def passwords_must_match(cls, v: str, info) -> str:
        if info.data.get("password") and v != info.data["password"]:
            raise ValueError("Passwords do not match")
        return v

    @field_validator("password")
    @classmethod
    def password_complexity(cls, v: str) -> str:
        if not any(c.isupper() for c in v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not any(c.isdigit() for c in v):
            raise ValueError("Password must contain at least one digit")
        return v


class RegisterResponse(BaseModel):
    message: str = "Registration successful. Please check your email to verify your account."
    user_id: uuid.UUID | str


# ── Login ──────────────────────────────────────────────────────────────────────

class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: Literal["bearer"] = "bearer"
    role: Literal["user", "admin"]
    user_id: uuid.UUID
    email: str


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
    new_password: str = Field(min_length=8, max_length=128)


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