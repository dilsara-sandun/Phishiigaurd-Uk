"""
models/support_ticket.py
────────────────────────
User-submitted false-positive / false-negative reports and general support
requests.  Admin users can read and manage tickets via the /support/tickets
endpoint.
"""

import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class SupportTicket(Base):
    __tablename__ = "support_tickets"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    # Optional: link the report to the specific scan that triggered it
    scan_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("scans.id", ondelete="SET NULL"),
        nullable=True,
    )
    feedback_type: Mapped[str] = mapped_column(
        Enum(
            "false_positive",   # model said phishing but URL is legitimate
            "false_negative",   # model said legitimate but URL is phishing
            "other",
            name="feedback_type_enum",
        ),
        nullable=False,
    )
    comment: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Admin resolution status
    status: Mapped[str] = mapped_column(
        Enum("open", "in_review", "resolved", "closed", name="ticket_status_enum"),
        nullable=False,
        default="open",
    )
    admin_note: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        index=True,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )

    # ── Relationships ──────────────────────────────────────────────────────────
    user: Mapped["User"] = relationship(  # noqa: F821
        "User", back_populates="support_tickets", lazy="noload"
    )
    scan: Mapped["Scan | None"] = relationship(  # noqa: F821
        "Scan", back_populates="support_tickets", lazy="noload"
    )

    def __repr__(self) -> str:
        return f"<SupportTicket id={self.id} type={self.feedback_type} status={self.status}>"