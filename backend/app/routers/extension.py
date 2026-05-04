import asyncio
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.schemas.extension_schema import ExtensionPayload
from app.schemas.scan_schema import FlagItem
from app.services import ai_service, dns_service, email_service, ml_service
from app.services.site_service import analyse_live_site

router = APIRouter(
    prefix="/extension",
    tags=["extension"]
)


# ── Public Outlook Add-in email analysis (no auth required) ──────────────────

class MailAssistantRequest(BaseModel):
    subject: str = ""
    sender: str = ""
    body: str = ""


class UrlSummary(BaseModel):
    url: str
    label: str
    score_pct: int


class DomainIntel(BaseModel):
    domain: str
    registrar: str | None = None
    domain_age_days: int | None = None
    ssl_issuer: str | None = None
    hosted_country: str | None = None
    has_mx: bool = False
    label: str = "unknown"
    score_pct: int = 0


class MailAssistantResult(BaseModel):
    overall_label: str
    overall_score_pct: int
    security_score_pct: int
    sender_domain: str
    red_flags: list[FlagItem]
    green_flags: list[FlagItem]
    extracted_urls: list[UrlSummary]
    domain_intel: DomainIntel | None = None
    explanation: str
    scanned_at: str


@router.post(
    "/mail-analyse",
    response_model=MailAssistantResult,
    summary="Public email analysis for the Outlook Add-in — no auth required",
)
async def mail_analyse(
    body: MailAssistantRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Analyse an email directly from the Outlook Add-in.
    No user authentication is required — this is a public analysis endpoint.
    Runs email scoring, URL analysis and sender domain intelligence in parallel.
    """
    combined_text = f"Subject: {body.subject}\nFrom: {body.sender}\n\n{body.body}"

    # Extract sender domain
    sender_domain = body.sender.split("@")[-1].strip() if "@" in body.sender else ""

    # Run email text scoring and domain analysis concurrently
    async def _domain_analysis():
        if not sender_domain:
            return None
        try:
            return await dns_service.analyse_domain(sender_domain)
        except Exception:
            return None

    email_score_data, domain_result = await asyncio.gather(
        asyncio.to_thread(email_service.score_email_text, body.subject, body.body),
        _domain_analysis(),
    )

    # Extract and score URLs
    extracted_urls = email_service.extract_urls_from_text(combined_text)
    url_summaries: list[UrlSummary] = []
    url_scores: list[float] = []
    for url in extracted_urls[:15]:
        url_ml = ml_service.predict_url(url)
        url_scores.append(url_ml["score"])
        url_summaries.append(UrlSummary(
            url=url,
            label=url_ml["label"],
            score_pct=url_ml["score_pct"],
        ))

    # Combine scores — if domain is flagged, boost the risk score
    overall_score = email_service.combine_email_and_url_scores(
        email_score_data["ml_score"], url_scores
    )
    if domain_result and domain_result.get("score", 0) > 0.5:
        overall_score = min(overall_score + 0.15, 1.0)
    overall_pct = int(round(overall_score * 100))
    overall_label = ml_service._score_to_label(overall_score)

    # Merge all flags (email + domain)
    all_red = (
        email_score_data["red_flags"]
        + email_service._sender_domain_mismatch(combined_text, extracted_urls)
    )
    if domain_result:
        all_red += domain_result.get("red_flags", [])
    all_green = email_score_data["green_flags"]
    if domain_result:
        all_green += domain_result.get("green_flags", [])

    # Build domain intel object
    domain_intel: DomainIntel | None = None
    if domain_result and sender_domain:
        dns_info = domain_result.get("dns_info")
        domain_intel = DomainIntel(
            domain=sender_domain,
            registrar=dns_info.registrar if dns_info else None,
            domain_age_days=dns_info.domain_age_days if dns_info else None,
            ssl_issuer=dns_info.ssl_issuer if dns_info else None,
            hosted_country=dns_info.geo_ip_country if dns_info else None,
            has_mx=dns_info.has_mx if dns_info else False,
            label=domain_result.get("label", "unknown"),
            score_pct=domain_result.get("score_pct", 0),
        )

    # AI explanation
    try:
        explanation = await ai_service.generate_explanation(
            input_value=combined_text[:200],
            label=overall_label,
            score_pct=overall_pct,
            red_flags=[{"flag_name": f.flag_name, "description": f.description} for f in all_red],
            green_flags=[{"flag_name": f.flag_name, "description": f.description} for f in all_green],
        )
    except Exception:
        if overall_label == "legitimate":
            explanation = f"This email from {sender_domain or 'the sender'} appears legitimate. No major threats were detected."
        elif overall_label == "suspicious":
            explanation = "This email shows some suspicious characteristics. Verify the sender before clicking any links."
        else:
            explanation = "This email shows strong indicators of a phishing attempt. Do not click any links or provide personal information."

    return MailAssistantResult(
        overall_label=overall_label,
        overall_score_pct=overall_pct,
        security_score_pct=100 - overall_pct,
        sender_domain=sender_domain,
        red_flags=all_red,
        green_flags=all_green,
        extracted_urls=url_summaries,
        domain_intel=domain_intel,
        explanation=explanation,
        scanned_at=datetime.now(tz=timezone.utc).isoformat(),
    )



# ── Browser Extension: Live Site Analysis ─────────────────────────────────────

@router.post("/analyse")
async def analyze_extension_payload(
    payload: ExtensionPayload,
    db: AsyncSession = Depends(get_db)
):
    """
    Receives payload from the browser extension and analyzes the live site data.
    """
    try:
        result = await analyse_live_site(payload, db)
        return result
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
