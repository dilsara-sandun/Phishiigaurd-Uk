"""
database.py
───────────
Async SQLAlchemy engine and session factory.

Usage in routers / services:
    async def endpoint(db: AsyncSession = Depends(get_db)):
        ...

All ORM models import `Base` from here so Alembic can discover them.
"""

from typing import AsyncGenerator

from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase

from app.config import settings


# ── Engine ─────────────────────────────────────────────────────────────────────
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.DEBUG,           # log SQL statements when DEBUG=True
    pool_pre_ping=True,            # reconnect if DB connection dropped
    pool_size=10,
    max_overflow=20,
    pool_recycle=1800,             # recycle connections every 30 min to avoid stale connections behind a load balancer
)

# ── Session factory ────────────────────────────────────────────────────────────
AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,        # avoid lazy-load errors after commit
    autocommit=False,
    autoflush=False,
)


# ── Declarative base ───────────────────────────────────────────────────────────
class Base(DeclarativeBase):
    """
    All ORM models inherit from this Base.
    Alembic's env.py imports Base.metadata to auto-generate migrations.
    """
    pass


# ── FastAPI dependency ─────────────────────────────────────────────────────────
async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    Yield an async database session for the duration of a single request.
    The session is committed on success and rolled back on any exception,
    then closed unconditionally in the finally block.
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()