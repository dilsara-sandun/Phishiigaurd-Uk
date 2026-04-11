"""
services/dns_service.py
───────────────────────
Performs DNS lookups (dnspython), WHOIS queries (python-whois), and Geo-IP
lookups (ip-api.com free tier) for a given domain.  Combines the results
into a structured DNSInfo response and a domain risk score.
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

def _build_domain_flags(
    domain: str,
    dns_info: DNSInfo,
) -> tuple[list[FlagItem], list[FlagItem]]:
    from app.services.ml_service import (
        UK_BANK_BRANDS,
        LEGITIMATE_BANK_DOMAINS,
        SUSPICIOUS_TLDS,
    )
    import tldextract

    red: list[FlagItem] = []
    green: list[FlagItem] = []

    ext = tldextract.extract(domain)
    tld = ext.suffix.lower() if ext.suffix else ""
    reg_domain = ext.registered_domain.lower() if ext.registered_domain else ""
    domain_lower = domain.lower()

    # Domain age
    if dns_info.domain_age_days is not None and dns_info.domain_age_days < 30:
        red.append(FlagItem(
            flag_type="red", flag_name="very_new_domain",
            description=f"Domain registered only {dns_info.domain_age_days} days ago",
        ))
    elif dns_info.domain_age_days is not None and dns_info.domain_age_days < 90:
        red.append(FlagItem(
            flag_type="red", flag_name="new_domain",
            description=f"Domain is relatively new ({dns_info.domain_age_days} days old)",
        ))

    # No MX records (not a real organisation)
    if not dns_info.has_mx:
        red.append(FlagItem(
            flag_type="red", flag_name="no_mx_records",
            description="Domain has no mail exchange records, suggesting it is not a real organisation",
        ))

    # Brand mismatch
    found_brands = [b for b in UK_BANK_BRANDS if b in domain_lower]
    if found_brands and reg_domain not in LEGITIMATE_BANK_DOMAINS:
        red.append(FlagItem(
            flag_type="red", flag_name="brand_domain_mismatch",
            description=f"Domain contains bank brand token(s) {found_brands} but is not the official bank domain",
        ))

    # Suspicious TLD
    if tld in SUSPICIOUS_TLDS:
        red.append(FlagItem(
            flag_type="red", flag_name="suspicious_tld",
            description=f".{tld} is rarely used by legitimate UK financial institutions",
        ))

    # Hosted outside UK
    if dns_info.geo_ip_country and dns_info.geo_ip_country not in ("United Kingdom", "GB"):
        red.append(FlagItem(
            flag_type="red", flag_name="hosted_outside_uk",
            description=f"Domain is hosted in {dns_info.geo_ip_country}, not the United Kingdom",
        ))

    # Green flags
    if dns_info.ssl_issuer:
        green.append(FlagItem(
            flag_type="green", flag_name="ssl_certificate_present",
            description=f"Valid SSL/TLS certificate issued by {dns_info.ssl_issuer}",
        ))
    if dns_info.domain_age_days is not None and dns_info.domain_age_days > 365:
        green.append(FlagItem(
            flag_type="green", flag_name="established_domain",
            description=f"Domain has been registered for over {dns_info.domain_age_days // 365} year(s)",
        ))
    if dns_info.has_mx:
        green.append(FlagItem(
            flag_type="green", flag_name="mx_records_present",
            description="Domain has mail exchange records (consistent with a real organisation)",
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