"""
services/email_service.py
─────────────────────────
Parses raw email text, extracts URLs, runs the TF-IDF email classifier,
scores each extracted URL via ml_service, and returns a combined result.

Enhanced with universal heuristics that detect phishing indicators across
all domains and brands — not limited to UK banking.
"""

import email
import logging
import re
import unicodedata
from email import policy
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlparse

from typing import Any

import joblib
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer

from app.config import settings
from app.schemas.scan_schema import FlagItem

logger = logging.getLogger(__name__)

# ── Phishing language indicators (universal) ──────────────────────────────────
URGENCY_PATTERNS: list[str] = [
    r"urgent", r"immediate(ly)?", r"action required", r"your account (has been|will be)",
    r"suspended?", r"verify (your|account)", r"confirm (your|details)",
    r"click here", r"log in now", r"limited time", r"24 hours?",
    r"security alert", r"unauthori[sz]ed", r"we have detected",
    r"update (your )?details", r"validate (your )?(account|identity)",
    r"your (package|parcel|delivery) (is|has been|was)",
    r"your (invoice|payment|order) (is|has been|was|needs)",
    r"one.time.password", r"otp", r"two.factor", r"2fa",
    r"prize", r"winner", r"won", r"lottery", r"inheritance",
    r"final (notice|warning|reminder)",
]

CREDENTIAL_REQUEST_PATTERNS: list[str] = [
    r"(enter|provide|update|confirm) (your )?(password|pin|username|account number|sort code)",
    r"(online |internet )?banking (credentials|details|login)",
    r"(full |your )?(name|address|date of birth|mother.s maiden)",
    r"(credit|debit) card (number|details|information)",
    r"social security", r"national insurance",
    r"passport (number|details)",
]

# Free / consumer email providers (no legitimate brand uses these for official emails)
_FREE_EMAIL_PROVIDERS: frozenset[str] = frozenset({
    "gmail.com", "googlemail.com", "yahoo.com", "yahoo.co.uk", "yahoo.fr",
    "hotmail.com", "hotmail.co.uk", "hotmail.fr", "live.com", "live.co.uk",
    "outlook.com", "icloud.com", "me.com", "mac.com",
    "aol.com", "protonmail.com", "proton.me",
    "mail.com", "yandex.com", "yandex.ru",
})

# URL shorteners — hide the real destination
_URL_SHORTENERS: frozenset[str] = frozenset({
    "bit.ly", "tinyurl.com", "t.co", "ow.ly", "goo.gl", "rb.gy",
    "is.gd", "buff.ly", "bl.ink", "cutt.ly", "shorturl.at", "tiny.cc",
    "lnkd.in", "soo.gd", "s.id", "clck.ru", "qr.ae",
})

# Trusted TLDs that earn green flags (any domain, not just banking)
_TRUSTED_TLDS: frozenset[str] = frozenset({
    "gov.uk", "nhs.uk", "police.uk", "ac.uk", "sch.uk", "org.uk",
    "gov", "edu", "mil",
})


# ── Model state ────────────────────────────────────────────────────────────────

class _EmailModelState:
    model: Any = None
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

    if model_path.stat().st_size == 0 or vec_path.stat().st_size == 0:
        logger.warning(
            "Email model files are empty (0 bytes). Falling back to heuristics."
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
    """
    Return deduplicated list of URLs found in *text*.

    Enhanced to handle:
    - PDF text extractor line breaks inserted inside long URLs
    - Trailing punctuation/brackets that are part of the sentence, not the URL
    - Percent-encoded characters
    """
    # Pre-process: collapse line breaks that may have been inserted inside a URL
    # e.g. "https://aws.amazon.com/billing\n/console" → "https://aws.amazon.com/billing/console"
    cleaned = re.sub(r"(https?://[^\s]*)\n([^\s]*)", lambda m: m.group(1) + m.group(2), text)

    found = _URL_RE.findall(cleaned)
    seen: set[str] = set()
    unique: list[str] = []
    for url in found:
        # Strip trailing punctuation that is part of the sentence, not the URL
        url = re.sub(r"[.,;:!?)\]>\"']+$", "", url)
        if url and url not in seen:
            seen.add(url)
            unique.append(url)
    return unique


# ── HTML link deception parser ─────────────────────────────────────────────────

class _LinkParser(HTMLParser):
    """Minimal HTML parser that extracts (visible_text, href) pairs from <a> tags."""
    def __init__(self) -> None:
        super().__init__()
        self.links: list[tuple[str, str]] = []
        self._current_href: str = ""
        self._current_text: list[str] = []
        self._in_anchor: bool = False

    def handle_starttag(self, tag: str, attrs: list) -> None:
        if tag == "a":
            self._in_anchor = True
            self._current_text = []
            href = dict(attrs).get("href", "")
            self._current_href = href or ""

    def handle_endtag(self, tag: str) -> None:
        if tag == "a" and self._in_anchor:
            self._in_anchor = False
            text = " ".join(self._current_text).strip()
            if text and self._current_href:
                self.links.append((text, self._current_href))

    def handle_data(self, data: str) -> None:
        if self._in_anchor:
            self._current_text.append(data.strip())


def _detect_html_link_deception(body_html: str) -> list[FlagItem]:
    """
    Parse HTML email body for anchor tags where the visible text contains a
    URL/domain that does NOT match the actual href destination — a classic
    phishing technique.
    """
    if not body_html:
        return []

    from app.utils.tld import extract_tld

    parser = _LinkParser()
    try:
        parser.feed(body_html)
    except Exception:
        return []

    flags: list[FlagItem] = []
    seen_deceptions: set[str] = set()

    for visible_text, href in parser.links:
        # Only check when the visible text itself looks like a URL or domain
        url_in_text = re.search(r"https?://\S+|[\w-]+\.\w{2,}", visible_text)
        if not url_in_text:
            continue

        try:
            href_domain = extract_tld(href).registered_domain.lower()
            text_domain = extract_tld(url_in_text.group()).registered_domain.lower()
        except Exception:
            continue

        if href_domain and text_domain and href_domain != text_domain:
            key = f"{text_domain}→{href_domain}"
            if key not in seen_deceptions:
                seen_deceptions.add(key)
                flags.append(FlagItem(
                    flag_type="red",
                    flag_name="html_link_deception",
                    description=(
                        f"Link displays '{text_domain}' but actually points to '{href_domain}' — "
                        "a classic phishing trick to disguise malicious URLs."
                    ),
                ))
    return flags[:3]  # cap at 3 to avoid noise


# ── Heuristic flag detection (universal) ──────────────────────────────────────

def _detect_urgency_flags(text: str) -> list[FlagItem]:
    text_l = text.lower()
    for pat in URGENCY_PATTERNS:
        if re.search(pat, text_l):
            return [FlagItem(
                flag_type="red",
                flag_name="urgency_language",
                description=f"Urgency or pressure language detected in the email body — a common social engineering technique.",
            )]
    return []


def _detect_credential_request(text: str) -> list[FlagItem]:
    text_l = text.lower()
    for pat in CREDENTIAL_REQUEST_PATTERNS:
        if re.search(pat, text_l):
            return [FlagItem(
                flag_type="red",
                flag_name="credential_request",
                description="Email appears to request sensitive credentials or personal identification details.",
            )]
    return []


def _detect_display_name_mismatch(sender: str) -> list[FlagItem]:
    """
    Detect when the display name claims to be a well-known brand but the
    actual email address domain is a free consumer email provider or an
    unrelated domain.
    e.g. 'PayPal Security <attacker123@gmail.com>'
    """
    from app.services.ml_service import KNOWN_BRANDS, KNOWN_LEGITIMATE_DOMAINS
    from app.utils.tld import extract_tld

    if not sender or "<" not in sender:
        return []

    # Extract display name and email address
    match = re.match(r'^"?([^"<]+)"?\s*<([^>]+)>', sender.strip())
    if not match:
        return []

    display_name = match.group(1).strip().lower()
    email_addr = match.group(2).strip().lower()
    email_domain = email_addr.split("@")[-1] if "@" in email_addr else ""

    if not email_domain:
        return []

    email_reg_domain = extract_tld(email_domain).registered_domain.lower()

    # Check if the display name contains a known brand
    for brand in KNOWN_BRANDS:
        if brand in display_name:
            legit_domains = KNOWN_LEGITIMATE_DOMAINS.get(brand, set())
            if email_reg_domain and email_reg_domain not in legit_domains:
                return [FlagItem(
                    flag_type="red",
                    flag_name="display_name_mismatch",
                    description=(
                        f"Email claims to be from '{match.group(1).strip()}' but was sent from "
                        f"'{email_domain}', which is not that organisation's official email domain."
                    ),
                )]
    return []


def _detect_free_email_financial_claim(sender: str, body: str) -> list[FlagItem]:
    """
    Detect emails that come from a free consumer email provider but claim
    to be from a financial institution, bank, delivery company, or government body.
    No legitimate bank or organisation uses @gmail.com for official correspondence.
    """
    from app.services.ml_service import KNOWN_BRANDS

    if not sender:
        return []

    # Extract sender domain
    email_match = re.search(r"<([^>]+)>", sender) or re.search(r"\S+@\S+", sender)
    if not email_match:
        return []
    raw_email = email_match.group(1) if "<" in sender else email_match.group()
    sender_domain = raw_email.split("@")[-1].strip().lower() if "@" in raw_email else ""

    if sender_domain not in _FREE_EMAIL_PROVIDERS:
        return []

    # Does the body claim to be from a known brand?
    body_lower = body.lower()
    for brand in KNOWN_BRANDS:
        if brand in body_lower:
            return [FlagItem(
                flag_type="red",
                flag_name="free_email_brand_impersonation",
                description=(
                    f"Email was sent from a free consumer address (@{sender_domain}) "
                    f"but claims to be from a well-known organisation. "
                    "Legitimate companies always use their own official email domain."
                ),
            )]
    return []


def _detect_url_shorteners(urls: list[str]) -> list[FlagItem]:
    """Flag URLs from known shortener services that hide the real destination."""
    from app.utils.tld import extract_tld
    found: list[str] = []
    for url in urls:
        try:
            domain = extract_tld(url).registered_domain.lower()
        except Exception:
            continue
        if domain in _URL_SHORTENERS:
            found.append(domain)

    if found:
        return [FlagItem(
            flag_type="red",
            flag_name="url_shortener_detected",
            description=(
                f"Email contains shortened URL(s) via {', '.join(set(found))}. "
                "Attackers use URL shorteners to conceal the real malicious destination."
            ),
        )]
    return []


def _detect_excessive_urls(urls: list[str]) -> list[FlagItem]:
    """Flag emails with an unusually high number of embedded URLs."""
    count = len(urls)
    if count > 7:
        return [FlagItem(
            flag_type="red",
            flag_name="excessive_urls",
            description=(
                f"Email contains {count} embedded URLs. "
                "Mass phishing emails often include many links to maximise click probability."
            ),
        )]
    return []


def _detect_homograph_sender(sender_domain: str) -> list[FlagItem]:
    """Detect Unicode lookalike characters in the sender domain (IDN homograph)."""
    if not sender_domain:
        return []
    try:
        sender_domain.encode("ascii")
        return []  # Purely ASCII — no homograph
    except UnicodeEncodeError:
        pass
    for ch in sender_domain:
        if ord(ch) > 127:
            name = unicodedata.name(ch, "")
            if any(script in name for script in ["CYRILLIC", "GREEK", "ARMENIAN"]):
                return [FlagItem(
                    flag_type="red",
                    flag_name="homograph_sender_domain",
                    description=(
                        f"Sender domain '{sender_domain}' contains Unicode characters that visually "
                        "resemble standard letters — an IDN homograph phishing attack."
                    ),
                )]
    return []


def _detect_trusted_sender(sender_domain: str) -> list[FlagItem]:
    """Add a green flag when the sender is from a known trusted TLD."""
    if not sender_domain:
        return []
    for tld in _TRUSTED_TLDS:
        if sender_domain.endswith(tld):
            return [FlagItem(
                flag_type="green",
                flag_name="trusted_sender_tld",
                description=(
                    f"Sender domain '{sender_domain}' uses a trusted "
                    f".{tld} domain (government, education, or official body)."
                ),
            )]
    return []


def _sender_domain_mismatch(raw_email_text: str, extracted_urls: list[str]) -> list[FlagItem]:
    """
    Universal brand mismatch check: if the email body mentions any known brand
    but the embedded links point to a domain that is NOT that brand's official domain.
    Works for all 100+ brands, not just UK banks.
    """
    from app.services.ml_service import KNOWN_BRANDS, KNOWN_LEGITIMATE_DOMAINS
    from app.utils.tld import extract_tld

    text_lower = raw_email_text.lower()
    if not extracted_urls:
        return []

    for brand in KNOWN_BRANDS:
        if brand not in text_lower:
            continue
        legit_domains = KNOWN_LEGITIMATE_DOMAINS.get(brand, set())
        if not legit_domains:
            continue

        for url in extracted_urls:
            try:
                ext = extract_tld(url)
                link_domain = ext.registered_domain.lower() if ext.registered_domain else ""
            except Exception:
                continue
            if link_domain and link_domain not in legit_domains:
                return [FlagItem(
                    flag_type="red",
                    flag_name="sender_domain_mismatch",
                    description=(
                        f"Email mentions '{brand}' but embedded links point to '{link_domain}', "
                        f"which is not that organisation's official domain."
                    ),
                )]
    return []


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
                html = part.get_content()
                clean = re.sub(r"<[^>]+>", " ", html)
                body_parts.append(clean)
    else:
        body_parts.append(msg.get_content())

    return subject, " ".join(body_parts)


# ── Main email scoring function ───────────────────────────────────────────────

def score_email_text(
    subject: str,
    body: str,
    sender: str = "",
    body_html: str = "",
    extracted_urls: list[str] | None = None,
) -> dict:
    """
    Score combined email text using ML model + universal heuristics.

    Returns:
        {
            "ml_score": float,          # 0-1 from LR model (or heuristic)
            "red_flags": [...],
            "green_flags": [...],
        }
    """
    combined = f"{subject} {body}".strip()
    if extracted_urls is None:
        extracted_urls = extract_urls_from_text(combined)

    red_flags: list[FlagItem] = []
    green_flags: list[FlagItem] = []

    # ── Universal heuristic checks ────────────────────────────────────────────
    red_flags.extend(_detect_urgency_flags(combined))
    red_flags.extend(_detect_credential_request(combined))

    if sender:
        red_flags.extend(_detect_display_name_mismatch(sender))
        red_flags.extend(_detect_free_email_financial_claim(sender, body))
        # Extract sender domain for homograph + trusted TLD checks
        sender_email = re.search(r"<([^>]+)>", sender)
        raw_email = sender_email.group(1) if sender_email else sender
        sender_domain = raw_email.split("@")[-1].strip().lower() if "@" in raw_email else ""
        red_flags.extend(_detect_homograph_sender(sender_domain))
        green_flags.extend(_detect_trusted_sender(sender_domain))

    red_flags.extend(_detect_url_shorteners(extracted_urls))
    red_flags.extend(_detect_excessive_urls(extracted_urls))

    if body_html:
        red_flags.extend(_detect_html_link_deception(body_html))

    # ── ML model score ────────────────────────────────────────────────────────
    if _estate.loaded and _estate.model and _estate.vectorizer:
        try:
            vec = _estate.vectorizer.transform([combined])
            score = float(_estate.model.predict_proba(vec)[0][1])
        except Exception as exc:
            logger.warning("Email ML scoring failed: %s", exc)
            score = _heuristic_email_score(len(red_flags))
    else:
        score = _heuristic_email_score(len(red_flags))

    # ── Green flags ────────────────────────────────────────────────────────────
    if not extracted_urls:
        green_flags.append(FlagItem(
            flag_type="green",
            flag_name="no_urls",
            description="Email body contains no embedded URLs.",
        ))
    if not any(f.flag_name == "urgency_language" for f in red_flags):
        green_flags.append(FlagItem(
            flag_type="green",
            flag_name="no_urgency_language",
            description="No urgency or pressure language detected in this email.",
        ))

    return {
        "ml_score": round(score, 4),
        "red_flags": red_flags,
        "green_flags": green_flags,
    }


def _heuristic_email_score(red_flag_count: int) -> float:
    """Simple heuristic when the email model is not loaded."""
    return min(0.25 * red_flag_count, 0.95)


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