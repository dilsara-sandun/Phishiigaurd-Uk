"""
models/__init__.py
──────────────────
Import every model here so that:
  1. Alembic's env.py can discover all table definitions via Base.metadata.
  2. SQLAlchemy relationship() forward references resolve correctly.
"""

from app.models.news_cache import NewsCache
from app.models.scan import Scan
from app.models.scan_flag import ScanFlag
from app.models.support_ticket import SupportTicket
from app.models.threat_intel import ThreatIntel
from app.models.user import User

__all__ = ["User", "Scan", "ScanFlag", "NewsCache", "SupportTicket", "ThreatIntel"]
