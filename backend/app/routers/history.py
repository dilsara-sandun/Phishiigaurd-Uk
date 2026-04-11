"""
routers/history.py
──────────────────
History endpoints:
  GET /history              Paginated list of the current user's past scans
  GET /history/{scan_id}    Full detail for a single scan including flags
"""

import uuid
import logging

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.middleware.auth_middleware import get_current_user
from app.middleware.rate_limit import limiter
from app.models.scan import Scan
from app.models.scan_flag import ScanFlag
from app.models.user import User
from app.schemas.scan_schema import FlagItem, ScanHistoryItem, ScanHistoryResponse

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/history", tags=["History"])


# ── Additional detail schema ───────────────────────────────────────────────────

class ScanDetail(BaseModel):
    """Full scan record with flags, feature values, and explanation."""
    id: uuid.UUID
    scan_type: str
    input_value: str
    label: str
    score: float
    score_pct: int
    model_version: str
    feature_values: dict | None
    explanation: str | None
    red_flags: list[FlagItem]
    green_flags: list[FlagItem]
    created_at: str

    model_config = {"from_attributes": True}


# ── GET /history ──────────────────────────────────────────────────────────────

@router.get(
    "",
    response_model=ScanHistoryResponse,
    summary="Return the current user's paginated scan history",
)
@limiter.limit("120/minute")
async def get_history(
    request: Request,
    page: int = Query(default=1, ge=1, description="Page number (1-indexed)"),
    page_size: int = Query(default=20, ge=1, le=100, description="Records per page"),
    scan_type: str | None = Query(default=None, description="Filter by type: url, email, domain"),
    label: str | None = Query(default=None, description="Filter by label: phishing, legitimate, suspicious"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ScanHistoryResponse:
    """
    Returns a paginated list of all scans submitted by the current user.
    Supports optional filtering by scan_type and label.
    Results are ordered newest first.
    """
    # Build base query scoped to the current user
    base_query = select(Scan).where(Scan.user_id == current_user.id)

    if scan_type in ("url", "email", "domain"):
        base_query = base_query.where(Scan.scan_type == scan_type)
    if label in ("phishing", "legitimate", "suspicious"):
        base_query = base_query.where(Scan.label == label)

    # Total count for pagination
    count_result = await db.execute(
        select(func.count()).select_from(base_query.subquery())
    )
    total: int = count_result.scalar() or 0
    total_pages = max(1, (total + page_size - 1) // page_size)

    # Paginated records
    offset = (page - 1) * page_size
    rows_result = await db.execute(
        base_query.order_by(Scan.created_at.desc()).offset(offset).limit(page_size)
    )
    scans = rows_result.scalars().all()

    items = [
        ScanHistoryItem(
            id=s.id,
            scan_type=s.scan_type,
            input_value=s.input_value,
            label=s.label,
            score=s.score,
            score_pct=int(round(s.score * 100)),
            model_version=s.model_version,
            created_at=s.created_at,
        )
        for s in scans
    ]

    return ScanHistoryResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


# ── GET /history/{scan_id} ─────────────────────────────────────────────────────

@router.get(
    "/{scan_id}",
    response_model=ScanDetail,
    summary="Return full detail for a single past scan",
)
@limiter.limit("120/minute")
async def get_scan_detail(
    request: Request,
    scan_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ScanDetail:
    """
    Returns the complete scan record including:
      - All red and green flags
      - Serialised feature values (for the dissertation detail view)
      - AI-generated plain-English explanation

    Returns HTTP 404 if the scan does not exist or belongs to a different user.
    """
    result = await db.execute(
        select(Scan)
        .where(Scan.id == scan_id, Scan.user_id == current_user.id)
        .options(selectinload(Scan.flags))
    )
    scan = result.scalar_one_or_none()

    if scan is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Scan not found or does not belong to your account",
        )

    red_flags = [
        FlagItem(flag_type="red", flag_name=f.flag_name, description=f.description)
        for f in scan.flags
        if f.flag_type == "red"
    ]
    green_flags = [
        FlagItem(flag_type="green", flag_name=f.flag_name, description=f.description)
        for f in scan.flags
        if f.flag_type == "green"
    ]

    return ScanDetail(
        id=scan.id,
        scan_type=scan.scan_type,
        input_value=scan.input_value,
        label=scan.label,
        score=scan.score,
        score_pct=int(round(scan.score * 100)),
        model_version=scan.model_version,
        feature_values=scan.feature_values,
        explanation=scan.explanation,
        red_flags=red_flags,
        green_flags=green_flags,
        created_at=scan.created_at.isoformat(),
    )