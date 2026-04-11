"""
models/news_cache.py
────────────────────
Cached news articles fetched from Hacker News / NewsData.io.
A background task prunes rows older than 48 hours.
"""

import uuid
from datetime import datetime

from sqlalchemy import DateTime, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class NewsCache(Base):
    __tablename__ = "news_cache"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    title: Mapped[str] = mapped_column(String(512), nullable=False)
    url: Mapped[str] = mapped_column(String(2048), nullable=False, unique=True)
    source: Mapped[str] = mapped_column(String(256), nullable=False)

    # ISO-8601 datetime string as received from the upstream API
    published_at: Mapped[str | None] = mapped_column(String(64), nullable=True)

    # JSON array of keyword tags e.g. ["phishing", "UK banking"]
    tags: Mapped[list | None] = mapped_column(JSONB, nullable=True)

    # Short excerpt / summary (may be None if API does not provide one)
    excerpt: Mapped[str | None] = mapped_column(Text, nullable=True)

    fetched_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        index=True,
    )

    def __repr__(self) -> str:
        return f"<NewsCache id={self.id} source={self.source} title={self.title[:50]}>"