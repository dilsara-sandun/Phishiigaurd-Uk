"""
models/scan_flag.py
───────────────────
Individual red/green flags attached to a scan result.
"""

import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class ScanFlag(Base):
    __tablename__ = "scan_flags"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    scan_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("scans.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    # "red" = suspicious indicator, "green" = reassuring indicator
    flag_type: Mapped[str] = mapped_column(
        Enum("red", "green", name="flag_type_enum"),
        nullable=False,
    )
    # Human-readable key, e.g. "brand_mismatch", "suspicious_tld", "https_present"
    flag_name: Mapped[str] = mapped_column(String(128), nullable=False)
    # Optional human-readable description
    description: Mapped[str | None] = mapped_column(String(512), nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    # ── Relationships ──────────────────────────────────────────────────────────
    scan: Mapped["Scan"] = relationship(  # noqa: F821
        "Scan", back_populates="flags", lazy="noload"
    )

    def __repr__(self) -> str:
        return f"<ScanFlag scan={self.scan_id} type={self.flag_type} name={self.flag_name}>"