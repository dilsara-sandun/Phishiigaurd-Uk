"""
migrations/env.py
──────────────────
Alembic environment for async SQLAlchemy migrations.

Supports both:
  - Online mode  (alembic upgrade head)     — connects to the live DB
  - Offline mode (alembic upgrade --sql)    — generates SQL scripts
"""

import asyncio
import os
import sys
from logging.config import fileConfig

from alembic import context
from sqlalchemy import pool
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import async_engine_from_config

# ── Path fix: ensure the backend/ directory is on sys.path so we can
#    import app.* from the migrations/ directory.
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

# Import all models so Alembic can discover their table definitions
from app.database import Base       # noqa: E402
import app.models                   # noqa: E402, F401  (registers all models)

from app.config import settings     # noqa: E402

# ── Alembic Config object ──────────────────────────────────────────────────────
config = context.config

# Configure Python logging from alembic.ini
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Point Alembic at our ORM metadata
target_metadata = Base.metadata

# Override the sqlalchemy.url from alembic.ini with the value from settings.
# SYNC_DATABASE_URL uses psycopg2 (synchronous) which Alembic requires.
config.set_main_option("sqlalchemy.url", settings.SYNC_DATABASE_URL)


# ── Offline mode ───────────────────────────────────────────────────────────────

def run_migrations_offline() -> None:
    """
    Run migrations without an active DB connection.
    Generates a SQL script that can be reviewed and applied manually.
    """
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
    )
    with context.begin_transaction():
        context.run_migrations()


# ── Online mode ────────────────────────────────────────────────────────────────

def do_run_migrations(connection: Connection) -> None:
    context.configure(
        connection=connection,
        target_metadata=target_metadata,
        compare_type=True,       # detect column type changes
        compare_server_default=True,
    )
    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations() -> None:
    """
    Create an async engine and run migrations in the event loop.
    """
    connectable = async_engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)
    await connectable.dispose()


def run_migrations_online() -> None:
    asyncio.run(run_async_migrations())


# ── Entry point ────────────────────────────────────────────────────────────────

if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()