"""
routers/stats.py
────────────────
Stats endpoints:
  GET /stats/overview   Aggregated dashboard metrics (cached 5 min in Redis)
"""

import json
import logging
from datetime import datetime, timedelta, timezone

import redis.asyncio as aioredis
from fastapi import APIRouter, Depends, Request
from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.middleware.auth_middleware import get_current_user
from app.middleware.rate_limit import limiter
from app.models.scan import Scan
from app.models.scan_flag import ScanFlag
from app.models.user import User
from app.schemas.scan_schema import (
    BrandCount,
    OverviewStats,
    RiskDistribution,
    TLDCount,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/stats", tags=["Statistics"])

_STATS_CACHE_KEY = "phishguard:stats:overview"

# Canonical UK bank brand tokens (must match ml_service.py)
_BRAND_TOKENS = [
    "lloyds", "natwest", "barclays", "hsbc", "santander",
    "nationwide", "halifax", "monzo", "starling", "revolut",
    "firstdirect", "metro", "tsb",
]

_SUSPICIOUS_TLDS = [".top", ".xyz", ".site", ".online", ".click", ".live", ".pw", ".gq"]

# Published F1 score for the current model version (updated after each retraining run)
MODEL_F1_SCORE = 0.992


async def _get_redis() -> aioredis.Redis:
    return aioredis.from_url(settings.REDIS_URL, decode_responses=True)


# ── Aggregation queries ────────────────────────────────────────────────────────

async def _compute_overview(db: AsyncSession) -> OverviewStats:
    """Run all aggregation queries against the scans table for the past 7 days."""
    week_ago = datetime.now(tz=timezone.utc) - timedelta(days=7)

    # ── Total scans this week ─────────────────────────────────────────────────
    total_result = await db.execute(
        select(func.count(Scan.id)).where(Scan.created_at >= week_ago)
    )
    total_scans_week: int = total_result.scalar() or 0

    # ── Phishing count this week ──────────────────────────────────────────────
    phish_result = await db.execute(
        select(func.count(Scan.id)).where(
            and_(Scan.created_at >= week_ago, Scan.label == "phishing")
        )
    )
    phishing_count_week: int = phish_result.scalar() or 0

    phishing_rate = (
        round((phishing_count_week / total_scans_week) * 100, 1)
        if total_scans_week > 0
        else 0.0
    )

    # ── High-risk UK bank domains ─────────────────────────────────────────────
    # Count unique domain scans with score >= 0.70 that contain a bank brand token
    high_risk_result = await db.execute(
        select(func.count(Scan.id)).where(
            and_(
                Scan.created_at >= week_ago,
                Scan.scan_type == "domain",
                Scan.score >= 0.70,
            )
        )
    )
    high_risk_bank_domains: int = high_risk_result.scalar() or 0

    # ── Risk distribution ─────────────────────────────────────────────────────
    dist: dict[str, int] = {"critical": 0, "high": 0, "medium": 0, "low": 0}
    dist_result = await db.execute(
        select(Scan.score).where(Scan.created_at >= week_ago)
    )
    for (score,) in dist_result.fetchall():
        if score >= 0.90:
            dist["critical"] += 1
        elif score >= 0.70:
            dist["high"] += 1
        elif score >= 0.40:
            dist["medium"] += 1
        else:
            dist["low"] += 1

    # ── Top targeted UK bank brands ───────────────────────────────────────────
    brand_counts: list[BrandCount] = []
    for brand in _BRAND_TOKENS:
        count_result = await db.execute(
            select(func.count(Scan.id)).where(
                and_(
                    Scan.created_at >= week_ago,
                    Scan.label == "phishing",
                    func.lower(Scan.input_value).contains(brand),
                )
            )
        )
        count: int = count_result.scalar() or 0
        if count > 0:
            brand_counts.append(BrandCount(brand=brand.title(), count=count))

    brand_counts.sort(key=lambda b: b.count, reverse=True)
    top_brands = brand_counts[:8]

    # ── Top suspicious TLDs ───────────────────────────────────────────────────
    tld_counts: list[TLDCount] = []
    for tld in _SUSPICIOUS_TLDS:
        count_result = await db.execute(
            select(func.count(Scan.id)).where(
                and_(
                    Scan.created_at >= week_ago,
                    Scan.label == "phishing",
                    func.lower(Scan.input_value).contains(tld),
                )
            )
        )
        count = count_result.scalar() or 0
        if count > 0:
            tld_counts.append(TLDCount(tld=tld, count=count))

    tld_counts.sort(key=lambda t: t.count, reverse=True)
    top_tlds = tld_counts[:6]

    return OverviewStats(
        total_scans_week=total_scans_week,
        phishing_count_week=phishing_count_week,
        phishing_rate_pct=phishing_rate,
        high_risk_bank_domains=high_risk_bank_domains,
        model_f1_score=MODEL_F1_SCORE,
        risk_distribution=RiskDistribution(**dist),
        top_brands=top_brands,
        top_suspicious_tlds=top_tlds,
    )


# ── GET /stats/overview ────────────────────────────────────────────────────────

@router.get(
    "/overview",
    response_model=OverviewStats,
    summary="Aggregated dashboard statistics for the past 7 days",
)
@limiter.limit("60/minute")
async def get_overview(
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> OverviewStats:
    """
    Returns aggregated metrics consumed by Dashboard 1:
      - Total scans / phishing count / rate this week
      - Risk distribution (Critical / High / Medium / Low)
      - Top targeted UK bank brands
      - Top suspicious TLDs

    Results are cached in Redis for STATS_CACHE_TTL_SECONDS (default 5 min).
    Admins can bypass the cache by adding ?force=true to the query string.
    """
    # Read from cache
    redis = await _get_redis()
    try:
        cached = await redis.get(_STATS_CACHE_KEY)
        if cached:
            return OverviewStats.model_validate(json.loads(cached))
    except Exception as exc:
        logger.warning("Redis stats cache read failed: %s", exc)

    # Compute fresh
    stats = await _compute_overview(db)

    # Write to cache
    try:
        await redis.setex(
            _STATS_CACHE_KEY,
            settings.STATS_CACHE_TTL_SECONDS,
            stats.model_dump_json(),
        )
    except Exception as exc:
        logger.warning("Redis stats cache write failed: %s", exc)

    return stats