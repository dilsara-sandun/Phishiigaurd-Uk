"""
services/news_service.py
────────────────────────
Fetches the latest phishing / bank-fraud news from:
  1. Hacker News Algolia API  (free, no key required)
  2. NewsData.io              (free tier 200 req/day — fallback/supplement)

Results are normalised to a common schema and cached in Redis for
NEWS_CACHE_TTL_SECONDS (default 300 s = 5 minutes).
"""

import json
import logging
from datetime import datetime, timezone

import httpx
import redis.asyncio as aioredis

from app.config import settings

logger = logging.getLogger(__name__)

CACHE_KEY = "phishguard:news:latest"
MAX_ITEMS = 20


# ── Redis client (module-level, shared across requests) ───────────────────────

_redis: aioredis.Redis | None = None


async def get_redis() -> aioredis.Redis:
    global _redis
    if _redis is None:
        _redis = aioredis.from_url(settings.REDIS_URL, decode_responses=True)
    return _redis


# ── Normalised news item schema ────────────────────────────────────────────────

def _make_item(title: str, url: str, source: str, published_at: str | None, tags: list[str]) -> dict:
    return {
        "title": title,
        "url": url,
        "source": source,
        "published_at": published_at or "",
        "tags": tags,
    }


# ── Hacker News Algolia fetch ─────────────────────────────────────────────────

async def _fetch_hacker_news() -> list[dict]:
    """
    Query HN Algolia search API filtered by phishing/banking keywords.
    Returns a list of normalised news dicts.
    """
    query = settings.HN_SEARCH_QUERY      # "phishing bank fraud UK"
    endpoint = f"{settings.HN_API_BASE}/search"
    params = {
        "query": query,
        "tags": "story",
        "hitsPerPage": MAX_ITEMS,
        "attributesToRetrieve": "title,url,created_at,points",
    }
    items: list[dict] = []
    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            resp = await client.get(endpoint, params=params)
            resp.raise_for_status()
            data = resp.json()

        for hit in data.get("hits", []):
            title = hit.get("title", "").strip()
            url = hit.get("url", "").strip()
            created = hit.get("created_at", "")
            if not title or not url:
                continue
            tags = _infer_tags(title)
            items.append(_make_item(title, url, "Hacker News", created, tags))
    except Exception as exc:
        logger.warning("HN Algolia fetch failed: %s", exc)
    return items


# ── NewsData.io fetch (optional) ──────────────────────────────────────────────

async def _fetch_newsdata() -> list[dict]:
    """
    Query NewsData.io API for UK phishing/fraud news.
    Only called if NEWS_API_KEY is set in .env.
    """
    if not settings.NEWS_API_KEY:
        return []

    params = {
        "apikey": settings.NEWS_API_KEY,
        "q": settings.NEWS_KEYWORDS,       # "phishing,bank fraud,UK cyber"
        "country": settings.NEWS_COUNTRY,  # "gb"
        "language": "en",
        "size": MAX_ITEMS,
    }
    items: list[dict] = []
    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            resp = await client.get(settings.NEWSDATA_BASE, params=params)
            resp.raise_for_status()
            data = resp.json()

        for article in data.get("results", []):
            title = (article.get("title") or "").strip()
            url = (article.get("link") or "").strip()
            published = article.get("pubDate", "")
            source = (article.get("source_id") or "NewsData").strip()
            if not title or not url:
                continue
            tags = _infer_tags(title) + (article.get("category") or [])
            items.append(_make_item(title, url, source, published, list(set(tags))))
    except Exception as exc:
        logger.warning("NewsData.io fetch failed: %s", exc)
    return items


# ── Tag inference ─────────────────────────────────────────────────────────────

_TAG_RULES: list[tuple[list[str], str]] = [
    (["phishing", "smishing", "vishing"], "phishing"),
    (["bank", "banking", "lloyds", "natwest", "hsbc", "barclays", "halifax", "nationwide"], "UK banking"),
    (["fraud", "scam", "credential"], "fraud"),
    (["ncsc", "national cyber", "cyber security"], "NCSC"),
    (["ransomware", "malware", "data breach"], "threat intel"),
    (["uk", "britain", "england"], "UK"),
]


def _infer_tags(text: str) -> list[str]:
    text_l = text.lower()
    return [tag for keywords, tag in _TAG_RULES if any(k in text_l for k in keywords)]


# ── De-duplicate by URL ────────────────────────────────────────────────────────

def _deduplicate(items: list[dict]) -> list[dict]:
    seen_urls: set[str] = set()
    unique: list[dict] = []
    for item in items:
        if item["url"] not in seen_urls:
            seen_urls.add(item["url"])
            unique.append(item)
    return unique


# ── Public API ─────────────────────────────────────────────────────────────────

async def get_latest_news(force_refresh: bool = False) -> list[dict]:
    """
    Return up to MAX_ITEMS news items.
    Results are cached in Redis; set force_refresh=True to bypass cache.
    """
    redis = await get_redis()

    if not force_refresh:
        try:
            cached = await redis.get(CACHE_KEY)
            if cached:
                return json.loads(cached)
        except Exception as exc:
            logger.warning("Redis cache read failed: %s", exc)

    # Fetch from both sources concurrently
    import asyncio
    hn_items, nd_items = await asyncio.gather(
        _fetch_hacker_news(),
        _fetch_newsdata(),
    )

    all_items = _deduplicate(hn_items + nd_items)
    all_items = all_items[:MAX_ITEMS]

    # Write to cache
    try:
        await redis.setex(CACHE_KEY, settings.NEWS_CACHE_TTL_SECONDS, json.dumps(all_items))
    except Exception as exc:
        logger.warning("Redis cache write failed: %s", exc)

    return all_items