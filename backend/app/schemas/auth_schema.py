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
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    confirm_password: str = Field(min_length=8, max_length=128)

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

class VerifyEmailRequest(BaseModel):
    token: str


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