"""
services/email_service.py
─────────────────────────
Parses raw email text or .eml content, extracts URLs, runs the TF-IDF
email classifier, scores each extracted URL via ml_service, and
returns a combined EmailScanResult.
"""

import email
import logging
import re
from email import policy
from pathlib import Path

import joblib
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer

from app.config import settings
from app.schemas.scan_schema import FlagItem

logger = logging.getLogger(__name__)

# ── Phishing language indicators (used for rule-based flags) ──────────────────
URGENCY_PATTERNS: list[str] = [
    r"urgent", r"immediate(ly)?", r"action required", r"your account (has been|will be)",
    r"suspended?", r"verify (your|account)", r"confirm (your|details)",
    r"click here", r"log in now", r"limited time", r"24 hours?",
    r"security alert", r"unauthori[sz]ed", r"we have detected",
    r"update (your )?details", r"validate (your )?(account|identity)",
]

CREDENTIAL_REQUEST_PATTERNS: list[str] = [
    r"(enter|provide|update|confirm) (your )?(password|pin|username|account number|sort code)",
    r"(online |internet )?banking (credentials|details|login)",
    r"(full |your )?(name|address|date of birth|mother.s maiden)",
]


# ── Model state ────────────────────────────────────────────────────────────────

class _EmailModelState:
    model: object = None
    vectorizer: TfidfVectorizer | None = None
    loaded: bool = False


_estate = _EmailModelState()


def load_email_model() -> None:
    """Load the TF-IDF vectorizer and Logistic Regression classifier."""
    model_path = Path(settings.EMAIL_MODEL_PATH)
    vec_path = Path(settings.TFIDF_VECTORIZER_PATH)

    if not model_path.exists() or not vec_path.exists():
        logger.warning(
            "Email model files not found (%s, %s). "
            "Email scoring will use heuristic fallback only.",
            model_path, vec_path,
        )
        _estate.loaded = False
        return

    # Check if files are empty (0 bytes) to avoid EOFError
    if model_path.stat().st_size == 0 or vec_path.stat().st_size == 0:
        logger.warning(
            "Email model files are empty (0 bytes). "
            "Please train the email model using the provided notebooks. "
            "Falling back to heuristics."
        )
        _estate.loaded = False
        return
    try:
        _estate.model = joblib.load(model_path)
        _estate.vectorizer = joblib.load(vec_path)
        _estate.loaded = True
        logger.info("Email ML model loaded successfully.")
    except Exception as exc:
        logger.error("Failed to load email model: %s", exc, exc_info=True)
        _estate.loaded = False


# ── URL extraction ─────────────────────────────────────────────────────────────

_URL_RE = re.compile(
    r"https?://[^\s<>\"'{}|\\^`\[\]]+",
    re.IGNORECASE,
)


def extract_urls_from_text(text: str) -> list[str]:
    """Return deduplicated list of URLs found in *text*."""
    found = _URL_RE.findall(text)
    # Deduplicate preserving order
    seen: set[str] = set()
    unique: list[str] = []
    for url in found:
        # Strip trailing punctuation that may have been captured
        url = re.sub(r"[.,;:!?)]+$", "", url)
        if url not in seen:
            seen.add(url)
            unique.append(url)
    return unique


# ── EML parsing ────────────────────────────────────────────────────────────────

def parse_eml(raw_bytes: bytes) -> tuple[str, str]:
    """
    Parse a raw .eml bytes object.
    Returns (subject, body_text).
    """
    msg = email.message_from_bytes(raw_bytes, policy=policy.default)
    subject: str = str(msg.get("subject", ""))
    body_parts: list[str] = []

    if msg.is_multipart():
        for part in msg.walk():
            ctype = part.get_content_type()
            if ctype == "text/plain":
                body_parts.append(part.get_content())
            elif ctype == "text/html":
                # Strip HTML tags for plain-text analysis
                html = part.get_content()
                clean = re.sub(r"<[^>]+>", " ", html)
                body_parts.append(clean)
    else:
        body_parts.append(msg.get_content())

    return subject, " ".join(body_parts)


# ── Heuristic flag detection ────────────────────────────────────────────────────

def _detect_urgency_flags(text: str) -> list[FlagItem]:
    text_l = text.lower()
    found: list[FlagItem] = []
    for pat in URGENCY_PATTERNS:
        if re.search(pat, text_l):
            found.append(FlagItem(
                flag_type="red",
                flag_name="urgency_language",
                description=f"Urgency pattern detected: '{pat}'",
            ))
            break   # report once per category
    return found


def _detect_credential_request(text: str) -> list[FlagItem]:
    text_l = text.lower()
    for pat in CREDENTIAL_REQUEST_PATTERNS:
        if re.search(pat, text_l):
            return [FlagItem(
                flag_type="red",
                flag_name="credential_request",
                description="Email appears to request banking credentials or personal details",
            )]
    return []


def _sender_domain_mismatch(raw_email_text: str, extracted_urls: list[str]) -> list[FlagItem]:
    """
    Check whether the apparent sender domain (From header or body claim) does
    not match the domains in the embedded links.
    This is a lightweight heuristic for raw-text submissions without a From header.
    """
    import tldextract as tld
    brand_pattern = re.compile(r"\b(lloyds|natwest|hsbc|barclays|santander|halifax|nationwide)\b", re.I)
    brands_in_body = set(m.group(1).lower() for m in brand_pattern.finditer(raw_email_text))

    if not brands_in_body or not extracted_urls:
        return []

    legit_domains = {
        "lloyds": "lloydsbank.co.uk", "natwest": "natwest.com",
        "hsbc": "hsbc.co.uk", "barclays": "barclays.co.uk",
        "santander": "santander.co.uk", "halifax": "halifax.co.uk",
        "nationwide": "nationwide.co.uk",
    }
    for url in extracted_urls:
        ext = tld.extract(url)
        domain = ext.registered_domain.lower() if ext.registered_domain else ""
        for brand in brands_in_body:
            expected = legit_domains.get(brand, "")
            if expected and domain != expected:
                return [FlagItem(
                    flag_type="red",
                    flag_name="sender_domain_mismatch",
                    description=(
                        f"Email claims to be from {brand.title()} "
                        f"but links point to '{domain}' not '{expected}'"
                    ),
                )]
    return []


# ── Main email scoring function ───────────────────────────────────────────────

def score_email_text(subject: str, body: str) -> dict:
    """
    Score combined email text.

    Returns:
        {
            "ml_score": float,          # 0-1 from LR model (or heuristic)
            "red_flags": [...],
            "green_flags": [...],
        }
    """
    combined = f"{subject} {body}".strip()

    red_flags: list[FlagItem] = []
    green_flags: list[FlagItem] = []

    red_flags.extend(_detect_urgency_flags(combined))
    red_flags.extend(_detect_credential_request(combined))

    # ML model score
    if _estate.loaded and _estate.model and _estate.vectorizer:
        try:
            vec = _estate.vectorizer.transform([combined])
            score = float(_estate.model.predict_proba(vec)[0][1])
        except Exception as exc:
            logger.warning("Email ML scoring failed: %s", exc)
            score = _heuristic_email_score(len(red_flags))
    else:
        score = _heuristic_email_score(len(red_flags))

    # Green flags
    url_count = len(extract_urls_from_text(combined))
    if url_count == 0:
        green_flags.append(FlagItem(
            flag_type="green",
            flag_name="no_urls",
            description="Email body contains no embedded URLs",
        ))
    if not any(f.flag_name == "urgency_language" for f in red_flags):
        green_flags.append(FlagItem(
            flag_type="green",
            flag_name="no_urgency_language",
            description="No urgency or pressure language detected",
        ))

    return {
        "ml_score": round(score, 4),
        "red_flags": red_flags,
        "green_flags": green_flags,
    }


def _heuristic_email_score(red_flag_count: int) -> float:
    """Simple heuristic when the email model is not loaded."""
    return min(0.30 * red_flag_count, 0.95)


def combine_email_and_url_scores(
    email_score: float,
    url_scores: list[float],
) -> float:
    """
    Combine the email text score and per-URL scores into a single overall risk score.
    Weight: 40% email model + 60% maximum URL score.
    """
    max_url = max(url_scores) if url_scores else 0.0
    combined = 0.40 * email_score + 0.60 * max_url
    return round(min(combined, 1.0), 4)