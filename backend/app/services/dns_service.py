"""
services/dns_service.py
───────────────────────
Performs DNS lookups (dnspython), WHOIS queries (python-whois), and Geo-IP
lookups (ip-api.com free tier) for a given domain.  Combines the results
into a structured DNSInfo response and a universal domain risk score.

Domain checks are brand-agnostic and cover phishing from any sector —
not limited to UK banking.
"""

import logging
import re
from datetime import datetime, timezone

import dns.resolver
import dns.exception
import httpx
import whois as whois_lib

from app.config import settings
from app.schemas.scan_schema import DNSInfo, FlagItem

logger = logging.getLogger(__name__)


# ── Typosquat detection ────────────────────────────────────────────────────────

def _levenshtein(a: str, b: str) -> int:
    """Compute Levenshtein edit distance between two strings."""
    if len(a) < len(b):
        return _levenshtein(b, a)
    if not b:
        return len(a)
    prev = list(range(len(b) + 1))
    for i, ca in enumerate(a):
        curr = [i + 1]
        for j, cb in enumerate(b):
            curr.append(min(prev[j + 1] + 1, curr[j] + 1, prev[j] + (ca != cb)))
        prev = curr
    return prev[-1]


def _detect_typosquat(domain: str, brand_names: set[str]) -> tuple[bool, str]:
    """
    Check if *domain* is a typosquat of any known brand.
    Returns (is_typosquat, matched_brand).
    Only considers brands of 5+ characters to avoid false positives on short tokens.
    """
    import tldextract
    ext = tldextract.extract(domain)
    # Only use the registered domain name part (without TLD)
    domain_stem = ext.domain.lower() if ext.domain else ""
    if not domain_stem or len(domain_stem) < 4:
        return False, ""

    for brand in brand_names:
        if len(brand) < 5:
            continue  # skip very short tokens to reduce false positives
        # Exact match means it's likely a legitimate domain already handled elsewhere
        if brand == domain_stem:
            continue
        # Distance ≤ 2 on stems of similar length is a strong typosquat signal
        if abs(len(brand) - len(domain_stem)) <= 3:
            dist = _levenshtein(brand, domain_stem)
            if dist <= 2:
                return True, brand
    return False, ""


# ── DNS lookups ────────────────────────────────────────────────────────────────

def _query_records(domain: str, record_type: str) -> list[str]:
    """Return a list of string representations of DNS records, or [] on failure."""
    try:
        answers = dns.resolver.resolve(domain, record_type, lifetime=5.0)
        return [str(r) for r in answers]
    except (dns.exception.DNSException, Exception):
        return []


def get_a_records(domain: str) -> list[str]:
    return _query_records(domain, "A")


def get_mx_records(domain: str) -> list[str]:
    return [r.split(" ", 1)[-1].rstrip(".") for r in _query_records(domain, "MX")]


def get_ns_records(domain: str) -> list[str]:
    return [r.rstrip(".") for r in _query_records(domain, "NS")]


# ── WHOIS ─────────────────────────────────────────────────────────────────────

def _safe_date(val) -> datetime | None:
    """Normalise the various types that python-whois returns for dates."""
    if val is None:
        return None
    if isinstance(val, list):
        val = val[0]
    if isinstance(val, datetime):
        return val
    if isinstance(val, str):
        try:
            return datetime.fromisoformat(val)
        except ValueError:
            return None
    return None


def get_whois_info(domain: str) -> dict:
    """
    Return a dict with keys: registrar (str|None), creation_date (datetime|None),
    domain_age_days (int|None).
    """
    try:
        w = whois_lib.whois(domain)
        creation = _safe_date(getattr(w, "creation_date", None))
        registrar = str(w.registrar) if w.registrar else None

        if creation:
            # Make naive datetimes timezone-aware for comparison
            if creation.tzinfo is None:
                creation = creation.replace(tzinfo=timezone.utc)
            age_days = (datetime.now(tz=timezone.utc) - creation).days
        else:
            age_days = None

        return {
            "registrar": registrar,
            "creation_date": creation.isoformat() if creation else None,
            "domain_age_days": age_days,
        }
    except Exception as exc:
        logger.debug("WHOIS lookup failed for %s: %s", domain, exc)
        return {"registrar": None, "creation_date": None, "domain_age_days": None}


# ── Geo-IP (ip-api.com, free, no key required) ────────────────────────────────

async def get_geo_ip(ip_address: str) -> dict:
    """
    Query ip-api.com for country and city information for a single IP.
    Returns {"country": str|None, "city": str|None}.
    """
    if not ip_address or not re.match(r"\d{1,3}(?:\.\d{1,3}){3}", ip_address):
        return {"country": None, "city": None}
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(f"{settings.GEO_IP_BASE}/{ip_address}?fields=country,city,status")
            data = resp.json()
        if data.get("status") == "success":
            return {"country": data.get("country"), "city": data.get("city")}
    except Exception as exc:
        logger.debug("Geo-IP lookup failed for %s: %s", ip_address, exc)
    return {"country": None, "city": None}


# ── SSL certificate issuer (best-effort via A record + TLS handshake) ─────────

async def get_ssl_issuer(domain: str) -> str | None:
    """
    Attempt a TLS handshake to extract the certificate issuer's CN.
    Returns None if the connection fails or SSL is not available.
    """
    try:
        import ssl
        import socket

        ctx = ssl.create_default_context()
        loop = __import__("asyncio").get_event_loop()

        def _blocking_check() -> str | None:
            try:
                with socket.create_connection((domain, 443), timeout=5) as sock:
                    with ctx.wrap_socket(sock, server_hostname=domain) as ssock:
                        cert = ssock.getpeercert()
                        for field in cert.get("issuer", []):
                            for k, v in field:
                                if k == "organizationName":
                                    return str(v)
                return None
            except Exception:
                return None

        return await loop.run_in_executor(None, _blocking_check)
    except Exception:
        return None


# ── Risk flags ─────────────────────────────────────────────────────────────────

# Countries whose hosting jurisdiction is a strong phishing signal
_HIGH_RISK_COUNTRIES: frozenset[str] = frozenset({
    "China", "Russia", "North Korea", "Iran", "Nigeria",
    "CN", "RU", "KP", "IR", "NG",
})


def _build_domain_flags(
    domain: str,
    dns_info: DNSInfo,
) -> tuple[list[FlagItem], list[FlagItem]]:
    from app.services.ml_service import (
        KNOWN_BRANDS,
        KNOWN_LEGITIMATE_DOMAINS,
        SUSPICIOUS_TLDS,
    )
    import tldextract

    red: list[FlagItem] = []
    green: list[FlagItem] = []

    ext = tldextract.extract(domain)
    tld = ext.suffix.lower() if ext.suffix else ""
    reg_domain = ext.registered_domain.lower() if ext.registered_domain else ""
    domain_lower = domain.lower()

    # ── Domain age ────────────────────────────────────────────────────────────
    if dns_info.domain_age_days is not None and dns_info.domain_age_days < 30:
        red.append(FlagItem(
            flag_type="red", flag_name="very_new_domain",
            description=f"Domain was registered only {dns_info.domain_age_days} days ago — newly created domains are a strong phishing indicator.",
        ))
    elif dns_info.domain_age_days is not None and dns_info.domain_age_days < 90:
        red.append(FlagItem(
            flag_type="red", flag_name="new_domain",
            description=f"Domain is relatively new ({dns_info.domain_age_days} days old). Phishing domains are typically registered shortly before a campaign.",
        ))

    # ── No MX records ─────────────────────────────────────────────────────────
    if not dns_info.has_mx:
        red.append(FlagItem(
            flag_type="red", flag_name="no_mx_records",
            description="Sender domain has no mail exchange (MX) records, indicating it is not configured as a real email-sending organisation.",
        ))

    # ── Universal brand mismatch ───────────────────────────────────────────────
    for brand, legit_domains in KNOWN_LEGITIMATE_DOMAINS.items():
        if brand in domain_lower and reg_domain not in legit_domains:
            red.append(FlagItem(
                flag_type="red", flag_name="brand_domain_mismatch",
                description=(
                    f"Domain contains the brand token '{brand}' but '{reg_domain}' "
                    f"is not that organisation's official domain."
                ),
            ))
            break  # one flag is enough per domain

    # ── Suspicious TLD ────────────────────────────────────────────────────────
    if tld in SUSPICIOUS_TLDS:
        red.append(FlagItem(
            flag_type="red", flag_name="suspicious_tld",
            description=f".{tld} is a top-level domain frequently registered for phishing and rarely used by legitimate organisations.",
        ))

    # ── High-risk hosting jurisdiction (replaces UK-only bias) ────────────────
    if dns_info.geo_ip_country and dns_info.geo_ip_country in _HIGH_RISK_COUNTRIES:
        red.append(FlagItem(
            flag_type="red", flag_name="high_risk_hosting_country",
            description=(
                f"Domain is hosted in {dns_info.geo_ip_country}, a jurisdiction associated "
                "with a high volume of phishing and cybercrime infrastructure."
            ),
        ))

    # ── Typosquat detection ───────────────────────────────────────────────────
    is_typosquat, matched_brand = _detect_typosquat(domain, KNOWN_BRANDS)
    if is_typosquat:
        red.append(FlagItem(
            flag_type="red", flag_name="typosquat_domain",
            description=(
                f"Domain '{reg_domain}' closely resembles '{matched_brand}' — "
                "this may be a typosquatting domain designed to impersonate a legitimate brand."
            ),
        ))

    # ── Green flags ───────────────────────────────────────────────────────────
    if dns_info.ssl_issuer:
        green.append(FlagItem(
            flag_type="green", flag_name="ssl_certificate_present",
            description=f"Valid SSL/TLS certificate issued by {dns_info.ssl_issuer}.",
        ))
    if dns_info.domain_age_days is not None and dns_info.domain_age_days > 365:
        green.append(FlagItem(
            flag_type="green", flag_name="established_domain",
            description=f"Domain has been registered for over {dns_info.domain_age_days // 365} year(s), indicating an established organisation.",
        ))
    if dns_info.has_mx:
        green.append(FlagItem(
            flag_type="green", flag_name="mx_records_present",
            description="Domain has mail exchange records, consistent with a real email-sending organisation.",
        ))

    return red, green


def _compute_domain_risk_score(
    red_flags: list[FlagItem],
    ml_url_score: float,
) -> float:
    """
    Combine rule-based red flag count with the ML score on the domain string.
    Weights: 50% ML score + 50% rule-based score.
    """
    weights = {
        "very_new_domain": 0.40,
        "no_mx_records": 0.25,
        "brand_domain_mismatch": 0.45,
        "suspicious_tld": 0.25,
        "hosted_outside_uk": 0.20,
        "new_domain": 0.20,
    }
    rule_score = min(sum(weights.get(f.flag_name, 0.10) for f in red_flags), 1.0)
    return round(0.50 * ml_url_score + 0.50 * rule_score, 4)


# ── Public entry point ────────────────────────────────────────────────────────

async def analyse_domain(domain: str) -> dict:
    """
    Full domain analysis pipeline.  Returns a dict matching DomainScanResult.
    """
    from app.services.ml_service import predict_url, _score_to_label

    # DNS
    a_records = get_a_records(domain)
    mx_records = get_mx_records(domain)
    ns_records = get_ns_records(domain)

    # WHOIS
    whois_info = get_whois_info(domain)

    # Geo-IP from first A record
    geo = await get_geo_ip(a_records[0]) if a_records else {"country": None, "city": None}

    # SSL
    ssl_issuer = await get_ssl_issuer(domain)

    dns_info = DNSInfo(
        a_records=a_records,
        mx_records=mx_records,
        ns_records=ns_records,
        registrar=whois_info["registrar"],
        creation_date=whois_info["creation_date"],
        domain_age_days=whois_info["domain_age_days"],
        geo_ip_country=geo["country"],
        geo_ip_city=geo["city"],
        ssl_issuer=ssl_issuer,
        has_mx=len(mx_records) > 0,
    )

    # ML score on the domain treated as a URL
    ml_result = predict_url(f"https://{domain}/")
    ml_score = ml_result["score"]

    red_flags, green_flags = _build_domain_flags(domain, dns_info)
    overall_score = _compute_domain_risk_score(red_flags, ml_score)
    label = _score_to_label(overall_score)

    return {
        "domain": domain,
        "label": label,
        "score": overall_score,
        "score_pct": int(round(overall_score * 100)),
        "dns_info": dns_info,
        "red_flags": red_flags,
        "green_flags": green_flags,
        "model_version": ml_result.get("model_version", "xgb_v1"),
    }