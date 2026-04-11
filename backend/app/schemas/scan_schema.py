"""
schemas/scan_schema.py
──────────────────────
Pydantic v2 schemas for scan endpoints (/scan/url, /scan/email, /scan/domain).
"""

import uuid
from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field, HttpUrl, field_validator


# ── Shared flag schema ─────────────────────────────────────────────────────────

class FlagItem(BaseModel):
    flag_type: Literal["red", "green"]
    flag_name: str
    description: str | None = None


# ── URL scan ──────────────────────────────────────────────────────────────────

class URLScanRequest(BaseModel):
    url: str = Field(
        min_length=4,
        max_length=2048,
        description="The URL to analyse for phishing indicators",
        examples=["https://lloyds-secure-login.top/verify"],
    )

    @field_validator("url")
    @classmethod
    def url_must_have_scheme(cls, v: str) -> str:
        v = v.strip()
        if not v.startswith(("http://", "https://")):
            v = "https://" + v
        return v


class BatchURLScanRequest(BaseModel):
    urls: list[str] = Field(
        min_length=1,
        max_length=50,
        description="List of URLs to batch-scan (max 50 per request)",
    )


class ScanResult(BaseModel):
    scan_id: uuid.UUID
    input_value: str
    label: Literal["phishing", "legitimate", "suspicious"]
    score: float = Field(ge=0.0, le=1.0, description="Phishing probability 0-1")
    score_pct: int = Field(ge=0, le=100, description="Score as integer percentage")
    red_flags: list[FlagItem]
    green_flags: list[FlagItem]
    feature_values: dict[str, Any] | None = None
    explanation: str | None = None
    model_version: str
    scanned_at: datetime

    model_config = {"from_attributes": True}


# ── Email scan ─────────────────────────────────────────────────────────────────

class EmailScanRequest(BaseModel):
    text: str = Field(
        min_length=10,
        max_length=50_000,
        description="Raw email content (subject + body). Paste the full email text.",
    )


class EmailScanResult(BaseModel):
    scan_id: uuid.UUID
    overall_label: Literal["phishing", "legitimate", "suspicious"]
    overall_score: float = Field(ge=0.0, le=1.0)
    overall_score_pct: int
    red_flags: list[FlagItem]
    green_flags: list[FlagItem]
    extracted_urls: list[ScanResult]         # per-URL sub-results
    explanation: str | None = None
    scanned_at: datetime

    model_config = {"from_attributes": True}


# ── Domain / DNS scan ─────────────────────────────────────────────────────────

class DomainScanRequest(BaseModel):
    domain: str = Field(
        min_length=3,
        max_length=253,
        description="Domain to investigate, e.g. mybank-login.co.uk",
        examples=["mybank-login.co.uk"],
    )

    @field_validator("domain")
    @classmethod
    def strip_scheme(cls, v: str) -> str:
        v = v.strip().lower()
        for prefix in ("https://", "http://", "www."):
            if v.startswith(prefix):
                v = v[len(prefix):]
        # Remove any trailing path
        v = v.split("/")[0]
        return v


class DNSInfo(BaseModel):
    a_records: list[str]
    mx_records: list[str]
    ns_records: list[str]
    registrar: str | None
    creation_date: str | None
    domain_age_days: int | None
    geo_ip_country: str | None
    geo_ip_city: str | None
    ssl_issuer: str | None
    has_mx: bool


class DomainScanResult(BaseModel):
    scan_id: uuid.UUID
    domain: str
    label: Literal["phishing", "legitimate", "suspicious"]
    score: float = Field(ge=0.0, le=1.0)
    score_pct: int
    dns_info: DNSInfo
    red_flags: list[FlagItem]
    green_flags: list[FlagItem]
    explanation: str | None = None
    scanned_at: datetime

    model_config = {"from_attributes": True}


# ── History ────────────────────────────────────────────────────────────────────

class ScanHistoryItem(BaseModel):
    id: uuid.UUID
    scan_type: str
    input_value: str
    label: str
    score: float
    score_pct: int
    model_version: str
    created_at: datetime

    model_config = {"from_attributes": True}


class ScanHistoryResponse(BaseModel):
    items: list[ScanHistoryItem]
    total: int
    page: int
    page_size: int
    total_pages: int


# ── Stats / overview ──────────────────────────────────────────────────────────

class RiskDistribution(BaseModel):
    critical: int    # score >= 0.90
    high: int        # score >= 0.70
    medium: int      # score >= 0.40
    low: int         # score < 0.40


class BrandCount(BaseModel):
    brand: str
    count: int


class TLDCount(BaseModel):
    tld: str
    count: int


class OverviewStats(BaseModel):
    total_scans_week: int
    phishing_count_week: int
    phishing_rate_pct: float
    high_risk_bank_domains: int
    model_f1_score: float
    risk_distribution: RiskDistribution
    top_brands: list[BrandCount]
    top_suspicious_tlds: list[TLDCount]