"""
models/scan.py
--------------
SQLAlchemy ORM model for the `scans` table.
One row per analysis request (URL, email, or domain).
"""

import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, Float, ForeignKey, JSON, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Scan(Base):
    __tablename__ = "scans"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        index=True,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    # Type of scan submitted
    scan_type: Mapped[str] = mapped_column(
        Enum("url", "email", "domain", name="scan_type_enum"),
        nullable=False,
    )
    # The raw input value (URL string, email text snippet, or domain)
    input_value: Mapped[str] = mapped_column(Text, nullable=False)

    # Top-level result
    label: Mapped[str] = mapped_column(
        Enum("phishing", "legitimate", "suspicious", name="label_enum"),
        nullable=False,
    )
    score: Mapped[float] = mapped_column(Float, nullable=False)   # 0.0 – 1.0

    # Which model version produced this result
    model_version: Mapped[str] = mapped_column(String(64), nullable=False, default="xgb_v1")

    # Full feature dict serialised as JSONB (for history detail view).
    # with_variant falls back to plain JSON for SQLite (pytest) and uses JSONB for PostgreSQL.
    feature_values: Mapped[dict | None] = mapped_column(JSONB().with_variant(JSON(), "sqlite"), nullable=True)

    # AI-generated plain-English explanation
    explanation: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        index=True,
    )

    # -- Relationships -------------------------------------------------------
    user: Mapped["User"] = relationship(  # noqa: F821
        "User",
        back_populates="scans",
        lazy="noload",
    )
    flags: Mapped[list["ScanFlag"]] = relationship(  # noqa: F821
        "ScanFlag",
        back_populates="scan",
        cascade="all, delete-orphan",
        lazy="noload",
    )
    support_tickets: Mapped[list["SupportTicket"]] = relationship(  # noqa: F821
        "SupportTicket",
        back_populates="scan",
        cascade="all, delete-orphan",
        lazy="noload",
    )

    def __repr__(self) -> str:
        return f"<Scan id={self.id} type={self.scan_type} label={self.label} score={self.score:.2f}>"