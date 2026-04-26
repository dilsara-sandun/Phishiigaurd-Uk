"""
services/intel_service.py
─────────────────────────
Handles ingestion of live phishing URLs from external feeds.
- PhishTank: Online valid bulk data (Anonymous).
- PhishStats: Real-time public API.
"""

import json
import logging
import uuid
from datetime import datetime, timedelta

import httpx
from sqlalchemy import delete, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.threat_intel import ThreatIntel
from app.services.ml_service import UK_BANK_BRANDS

logger = logging.getLogger(__name__)

import gzip
import io

PHISHTANK_URL = "http://data.phishtank.com/data/online-valid.json.gz"
PHISHSTATS_API = "https://phishstats.info:20453/api/v1/"

# Standard User-Agent as required by PhishTank guidelines
HEADERS = {
    "User-Agent": "phishtank/phishguard-uk-research"
}


async def ingest_phishtank(db: AsyncSession):
    """
    Download and process PhishTank's online-valid dataset (.gz version).
    """
    logger.info("Starting PhishTank ingest...")
    try:
        async with httpx.AsyncClient(headers=HEADERS, timeout=120.0, follow_redirects=True) as client:
            response = await client.get(PHISHTANK_URL)
            response.raise_for_status()
            
            # Decompress GZIP content
            with gzip.GzipFile(fileobj=io.BytesIO(response.content)) as f:
                data = json.load(f)
            
            # Process in batches of 1000 for efficiency
            batch_size = 1000
            total_added = 0
            for i in range(0, len(data), batch_size):
                batch = data[i : i + batch_size]
                values = []
                for entry in batch:
                    url = entry.get("url")
                    if not url: continue
                    # Truncate extremely long URLs — PostgreSQL BTree index limit is ~2704 bytes
                    if len(url) > 2000:
                        url = url[:2000]
                    
                    target = entry.get("target", "Generic")
                    values.append({
                        "id": uuid.uuid4(),
                        "url": url,
                        "source": "phishtank",
                        "target_brand": target,
                        "confidence": 1.0
                    })
                
                if values:
                    # Bulk upsert using Postgres specific syntax
                    stmt = insert(ThreatIntel).values(values)
                    stmt = stmt.on_conflict_do_nothing()
                    await db.execute(stmt)
                    await db.commit() 
                    total_added += len(values)
                
            logger.info("PhishTank ingest complete. Processed %d entries.", total_added)
            return total_added
            
    except Exception as exc:
        await db.rollback()
        logger.error("PhishTank ingest failed: %s", exc)
        return 0


async def ingest_phishstats(db: AsyncSession):
    """
    Fetch the latest 100 entries from PhishStats.
    """
    logger.info("Starting PhishStats ingest...")
    try:
        # PhishStats API documentation says 'recent' is the default
        params = {"_limit": 100, "_sort": "-id"}
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(PHISHSTATS_API, params=params)
            response.raise_for_status()
            data = response.json()
            
            count = 0
            for entry in data:
                url = entry.get("url")
                if not url: continue
                
                # Truncate extremely long URLs — PostgreSQL BTree index limit is ~2704 bytes
                if len(url) > 2000:
                    url = url[:2000]

                # PhishStats provides a 'score' (0-10)
                score = float(entry.get("score", 10)) / 10.0
                
                stmt = insert(ThreatIntel).values(
                    url=url,
                    source="phishstats",
                    target_brand="Generic",
                    confidence=score
                ).on_conflict_do_nothing()
                
                await db.execute(stmt)
                count += 1
                
            await db.commit()
            logger.info("PhishStats ingest complete: Processed %d entries.", count)
            return count
            
    except Exception as exc:
        await db.rollback()
        logger.error("PhishStats ingest failed: %s", exc)
        return 0


async def prune_old_threats(db: AsyncSession, days: int = 7):
    """
    Remove threats that haven't been updated/seen in X days.
    """
    logger.info("Pruning threats older than %d days...", days)
    threshold = datetime.now() - timedelta(days=days)
    stmt = delete(ThreatIntel).where(ThreatIntel.created_at < threshold)
    result = await db.execute(stmt)
    await db.commit()
    logger.info("Pruning complete. Removed %d stale entries.", result.rowcount)


async def lookup_threat(db: AsyncSession, url: str) -> ThreatIntel | None:
    """
    Check if a URL exists in our local ThreatIntel cache.
    """
    stmt = select(ThreatIntel).where(ThreatIntel.url == url)
    result = await db.execute(stmt)
    return result.scalar_one_or_none()
