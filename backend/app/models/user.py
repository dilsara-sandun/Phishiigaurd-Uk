"""
models/user.py
──────────────
SQLAlchemy ORM model for the `users` table.
"""

import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Enum, Integer, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        index=True,
    )
    email: Mapped[str] = mapped_column(
        String(320),
        unique=True,
        nullable=False,
        index=True,
    )
    password_hash: Mapped[str] = mapped_column(String(128), nullable=False)
    first_name: Mapped[str | None] = mapped_column(String(100), nullable=True, default=None)
    last_name: Mapped[str | None] = mapped_column(String(100), nullable=True, default=None)
    role: Mapped[str] = mapped_column(
        Enum("user", "admin", name="user_role_enum"),
        nullable=False,
        default="user",
    )
    is_verified: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    # Email verification token (one-time use, cleared after verification)
    verify_token: Mapped[str | None] = mapped_column(String(256), nullable=True, default=None)
    verify_token_expires: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True, default=None
    )
    verify_token_attempts: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    # TOTP / Authenticator App (Microsoft Authenticator, Google Authenticator)
    totp_secret: Mapped[str | None] = mapped_column(String(64), nullable=True, default=None)
    totp_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )

    # ── Relationships ──────────────────────────────────────────────────────────
    scans: Mapped[list["Scan"]] = relationship(  # noqa: F821
        "Scan",
        back_populates="user",
        cascade="all, delete-orphan",
        lazy="noload",
    )
    support_tickets: Mapped[list["SupportTicket"]] = relationship(  # noqa: F821
        "SupportTicket",
        back_populates="user",
        cascade="all, delete-orphan",
        lazy="noload",
    )

    def __repr__(self) -> str:
        return f"<User id={self.id} email={self.email} role={self.role}>"