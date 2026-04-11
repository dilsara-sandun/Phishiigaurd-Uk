"""
routers/news.py
───────────────
News endpoints:
  GET /news/latest   Return latest phishing/fraud news articles (cached)
"""

import logging

from fastapi import APIRouter, Depends, Query, Request
from pydantic import BaseModel

from app.middleware.auth_middleware import get_current_user
from app.middleware.rate_limit import limiter
from app.models.user import User
from app.services.news_service import get_latest_news

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/news", tags=["News"])


class NewsItem(BaseModel):
    title: str
    url: str
    source: str
    published_at: str
    tags: list[str]


class NewsResponse(BaseModel):
    items: list[NewsItem]
    total: int
    cached: bool = True


# ── GET /news/latest ──────────────────────────────────────────────────────────

@router.get(
    "/latest",
    response_model=NewsResponse,
    summary="Return latest UK phishing and bank fraud news",
)
@limiter.limit("60/minute")
async def get_latest(
    request: Request,
    force_refresh: bool = Query(
        default=False,
        description="Set true to bypass the Redis cache and fetch fresh articles",
    ),
    current_user: User = Depends(get_current_user),
) -> NewsResponse:
    """
    Returns up to 20 recent articles about phishing and UK bank fraud.

    Sources:
      - Hacker News Algolia API  (free, no key required)
      - NewsData.io              (optional, free tier — set NEWS_API_KEY in .env)

    Results are cached in Redis for 5 minutes.  Set force_refresh=true to
    bypass the cache (admin use only in production).
    """
    articles = await get_latest_news(force_refresh=force_refresh)

    items = [
        NewsItem(
            title=a.get("title", ""),
            url=a.get("url", ""),
            source=a.get("source", ""),
            published_at=a.get("published_at", ""),
            tags=a.get("tags", []),
        )
        for a in articles
        if a.get("title") and a.get("url")
    ]

    return NewsResponse(items=items, total=len(items), cached=not force_refresh)