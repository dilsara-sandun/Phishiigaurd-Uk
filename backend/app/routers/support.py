"""
routers/support.py
──────────────────
Support endpoints:
  POST /support/ticket         Create a false-positive/negative report
  GET  /support/tickets        List all tickets (admin only)
  GET  /support/tickets/{id}   Get a single ticket (admin only)
  PATCH /support/tickets/{id}  Update ticket status (admin only)
  GET  /support/faq            Return static FAQ content
"""

import uuid
import logging

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.middleware.auth_middleware import get_current_user, require_admin
from app.middleware.rate_limit import limiter
from app.models.support_ticket import SupportTicket
from app.models.user import User
from app.schemas.auth_schema import MessageResponse

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/support", tags=["Support"])


# ── Pydantic schemas ───────────────────────────────────────────────────────────

class TicketCreateRequest(BaseModel):
    scan_id: uuid.UUID | None = None
    feedback_type: str  # false_positive | false_negative | other
    comment: str | None = None

    class Config:
        json_schema_extra = {
            "example": {
                "scan_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
                "feedback_type": "false_positive",
                "comment": "This URL is my company's genuine login page.",
            }
        }


class TicketResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    scan_id: uuid.UUID | None
    feedback_type: str
    comment: str | None
    status: str
    admin_note: str | None
    created_at: str

    model_config = {"from_attributes": True}


class TicketListResponse(BaseModel):
    items: list[TicketResponse]
    total: int
    page: int
    page_size: int


class TicketUpdateRequest(BaseModel):
    status: str | None = None        # open | in_review | resolved | closed
    admin_note: str | None = None


class FAQItem(BaseModel):
    question: str
    answer: str


# ── Static FAQ data ────────────────────────────────────────────────────────────

_FAQ: list[dict] = [
    {
        "question": "What is phishing?",
        "answer": (
            "Phishing is a type of cyber attack where criminals create fake websites or send "
            "fraudulent emails that impersonate trusted organisations, such as your bank, to "
            "trick you into revealing sensitive information like passwords, PINs, or account numbers."
        ),
    },
    {
        "question": "How accurate is PhishGuard?",
        "answer": (
            "Our XGBoost model achieves approximately 99.2% F1-score on the benchmark datasets "
            "(LegitPhish and PhiUSIIL). However, no automated tool is infallible. Always treat "
            "a 'suspicious' result as a reason to verify with your bank directly before clicking "
            "any link."
        ),
    },
    {
        "question": "What should I do if a URL is flagged as phishing?",
        "answer": (
            "Do not click the link. If you received it by email or SMS, report it to "
            "report@phishing.gov.uk (UK National Cyber Security Centre reporting service). "
            "Contact your bank directly using the number on the back of your card."
        ),
    },
    {
        "question": "Is my data stored securely?",
        "answer": (
            "Yes. URLs and email text you submit are stored in an encrypted PostgreSQL database "
            "on university-provided infrastructure. We never attempt to visit or interact with "
            "the URLs you submit. Your data is used only to generate the scan result and to "
            "improve detection accuracy."
        ),
    },
    {
        "question": "Why might a legitimate URL be flagged as phishing?",
        "answer": (
            "False positives can occur if a legitimate URL shares characteristics with known "
            "phishing patterns, such as a very new domain, an unusual TLD, or a bank brand name "
            "in a non-standard position. If you believe a result is incorrect, please submit a "
            "false-positive report using the feedback button."
        ),
    },
    {
        "question": "Can I upload a suspicious email for analysis?",
        "answer": (
            "Yes. In the Analysis Centre, select the Email Analyser tab and either paste the "
            "full email text or upload a .eml or .txt file. The tool will extract all embedded "
            "URLs, score the email text, and return a combined risk assessment."
        ),
    },
    {
        "question": "How do I report a false result?",
        "answer": (
            "Use the feedback icon next to any scan result, or navigate to the Support page. "
            "Select 'false positive' or 'false negative', add a comment if helpful, and submit. "
            "Our team reviews reports periodically to improve the model."
        ),
    },
]


# ── POST /support/ticket ───────────────────────────────────────────────────────

@router.post(
    "/ticket",
    response_model=TicketResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Submit a false-positive or false-negative report",
)
@limiter.limit("10/hour")
async def create_ticket(
    request: Request,
    body: TicketCreateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> TicketResponse:
    """
    Create a support ticket linked to the current user.
    Optionally associates the ticket with a specific scan_id.
    Returns HTTP 400 if feedback_type is not one of the allowed values.
    """
    allowed_types = {"false_positive", "false_negative", "other"}
    if body.feedback_type not in allowed_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"feedback_type must be one of: {', '.join(allowed_types)}",
        )

    ticket = SupportTicket(
        user_id=current_user.id,
        scan_id=body.scan_id,
        feedback_type=body.feedback_type,
        comment=body.comment,
        status="open",
    )
    db.add(ticket)
    await db.flush()

    logger.info(
        "Support ticket created: id=%s user=%s type=%s",
        ticket.id, current_user.id, body.feedback_type,
    )

    return TicketResponse(
        id=ticket.id,
        user_id=ticket.user_id,
        scan_id=ticket.scan_id,
        feedback_type=ticket.feedback_type,
        comment=ticket.comment,
        status=ticket.status,
        admin_note=ticket.admin_note,
        created_at=ticket.created_at.isoformat() if ticket.created_at else "",
    )


# ── GET /support/tickets (admin) ───────────────────────────────────────────────

@router.get(
    "/tickets",
    response_model=TicketListResponse,
    summary="[Admin] List all support tickets",
)
@limiter.limit("60/minute")
async def list_tickets(
    request: Request,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=25, ge=1, le=100),
    ticket_status: str | None = Query(default=None, description="Filter by status: open, in_review, resolved, closed"),
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(require_admin),
) -> TicketListResponse:
    """Admin-only: paginated list of all support tickets."""
    base = select(SupportTicket)
    if ticket_status in ("open", "in_review", "resolved", "closed"):
        base = base.where(SupportTicket.status == ticket_status)

    count_result = await db.execute(select(func.count()).select_from(base.subquery()))
    total: int = count_result.scalar() or 0

    offset = (page - 1) * page_size
    rows_result = await db.execute(
        base.order_by(SupportTicket.created_at.desc()).offset(offset).limit(page_size)
    )
    tickets = rows_result.scalars().all()

    items = [
        TicketResponse(
            id=t.id,
            user_id=t.user_id,
            scan_id=t.scan_id,
            feedback_type=t.feedback_type,
            comment=t.comment,
            status=t.status,
            admin_note=t.admin_note,
            created_at=t.created_at.isoformat() if t.created_at else "",
        )
        for t in tickets
    ]

    return TicketListResponse(items=items, total=total, page=page, page_size=page_size)


# ── PATCH /support/tickets/{id} (admin) ───────────────────────────────────────

@router.patch(
    "/tickets/{ticket_id}",
    response_model=TicketResponse,
    summary="[Admin] Update the status or add a note to a support ticket",
)
async def update_ticket(
    ticket_id: uuid.UUID,
    body: TicketUpdateRequest,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(require_admin),
) -> TicketResponse:
    """Admin-only: update ticket status and/or add an admin note."""
    ticket = await db.get(SupportTicket, ticket_id)
    if ticket is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found")

    allowed_statuses = {"open", "in_review", "resolved", "closed"}
    if body.status and body.status in allowed_statuses:
        ticket.status = body.status
    if body.admin_note is not None:
        ticket.admin_note = body.admin_note

    await db.flush()

    return TicketResponse(
        id=ticket.id,
        user_id=ticket.user_id,
        scan_id=ticket.scan_id,
        feedback_type=ticket.feedback_type,
        comment=ticket.comment,
        status=ticket.status,
        admin_note=ticket.admin_note,
        created_at=ticket.created_at.isoformat() if ticket.created_at else "",
    )


# ── GET /support/faq ──────────────────────────────────────────────────────────

@router.get(
    "/faq",
    response_model=list[FAQItem],
    summary="Return the static FAQ for the support page",
)
async def get_faq() -> list[FAQItem]:
    """
    Returns the static FAQ list.
    No authentication required so unauthenticated visitors can read it.
    """
    return [FAQItem(**item) for item in _FAQ]