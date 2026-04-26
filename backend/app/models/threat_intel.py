"""
models/threat_intel.py
──────────────────────
Table for storing live phishing URLs from external threat feeds
(e.g., PhishTank, PhishStats, URLHaus).
Provides a fast, indexed lookup for the scanner.
"""

import uuid
from datetime import datetime

from sqlalchemy import DateTime, Float, Index, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class ThreatIntel(Base):
    __tablename__ = "threat_intel"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    
    # The malicious URL
    # NOTE: Uniqueness enforced via MD5 hash index in DB, not BTree on raw TEXT
    url: Mapped[str] = mapped_column(Text, nullable=False)
    
    # Source provider e.g. 'phishtank', 'phishstats'
    source: Mapped[str] = mapped_column(String(64), nullable=False)
    
    # Target brand if available (e.g. 'Lloyds', 'NatWest', 'Generic')
    target_brand: Mapped[str | None] = mapped_column(String(256), nullable=True)
    
    # Confidence score from the provider (0.0 to 1.0)
    confidence: Mapped[float] = mapped_column(Float, nullable=False, default=1.0)
    
    # When the threat was added to our local cache
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        index=True
    )

    # URL lookups use a DB-level MD5 unique index (created via SQL migration)
    # This avoids PostgreSQL's BTree 2704-byte index limit for TEXT columns
    __table_args__ = (
        Index("ix_threat_intel_url_hash", func.md5(url)),
    )

    def __repr__(self) -> str:
        return f"<ThreatIntel url={self.url[:50]} source={self.source}>"
