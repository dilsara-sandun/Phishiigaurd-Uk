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
    password: str = Field(min_length=8, max_length=128)
    confirm_password: Optional[str] = Field(default=None, max_length=128)

    @field_validator("password")
    @classmethod
    def password_complexity(cls, v: str) -> str:
        if not any(c.isupper() for c in v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not any(c.isdigit() for c in v):
            raise ValueError("Password must contain at least one digit")
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters long")
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