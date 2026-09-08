"""
tests/test_auth.py
──────────────────
Unit and integration tests for authentication, password hashing,
pepper security, and JWT token management.
"""

import uuid
import pytest
from app.services.auth_service import (
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    decode_token,
)


def test_password_hashing_and_verification():
    """Passwords are hashed with bcrypt + pepper and can be correctly verified."""
    raw_password = "SecureBankAdminPassword2026!"
    hashed = hash_password(raw_password)

    assert hashed.startswith("$2b$"), "Expected standard bcrypt format"
    assert verify_password(raw_password, hashed) is True
    assert verify_password("WrongPassword123!", hashed) is False


def test_jwt_access_token_creation_and_decoding():
    """Access tokens encode user UUID and role, and decode successfully."""
    user_id = uuid.uuid4()
    token = create_access_token(user_id=user_id, role="analyst")
    payload = decode_token(token)

    assert payload is not None
    assert payload.get("sub") == str(user_id)
    assert payload.get("role") == "analyst"
    assert payload.get("type") == "access"
    assert "exp" in payload


def test_jwt_refresh_token_creation_and_decoding():
    """Refresh tokens encode user UUID and type 'refresh'."""
    user_id = uuid.uuid4()
    token = create_refresh_token(user_id=user_id)
    payload = decode_token(token)

    assert payload is not None
    assert payload.get("sub") == str(user_id)
    assert payload.get("type") == "refresh"


from jose import JWTError


def test_tampered_jwt_token_rejected():
    """Altering token payload or signature should cause decoding to raise JWTError."""
    user_id = uuid.uuid4()
    token = create_access_token(user_id=user_id, role="analyst")
    tampered_token = token[:-4] + "abcd"

    with pytest.raises(JWTError):
        decode_token(tampered_token)
