"""
services/ml_service.py
──────────────────────
Core ML inference service.

Responsibilities:
  1. Load the XGBoost model, SHAP explainer, and feature names at startup.
  2. Extract 26+ lexical, structural, and UK-banking-specific features from a
     raw URL string.
  3. Run predict_proba() to get a phishing probability score.
  4. Apply SHAP to produce per-feature contribution values for explainability.
  5. Derive red/green flags from feature values for display in the UI.
"""

import json
import logging
import math
import os
import re
from pathlib import Path
from typing import Any

import joblib
import numpy as np
import tldextract

from app.config import settings
from app.schemas.scan_schema import FlagItem

logger = logging.getLogger(__name__)

# ── UK bank brand tokens ──────────────────────────────────────────────────────
UK_BANK_BRANDS: set[str] = {
    "lloyds", "lloydsbank", "natwest", "barclays", "hsbc", "santander",
    "nationwide", "halifax", "monzo", "starling", "revolut", "firstdirect",
    "metro", "tsb", "rbs", "royalbankofscotland", "co-operative", "cooperativebank",
    "virginmoney", "yorkshire", "bank", "banking",
}

# Official UK bank registrable domains (base domain only)
LEGITIMATE_BANK_DOMAINS: set[str] = {
    "lloydsbank.co.uk", "natwest.com", "barclays.co.uk", "hsbc.co.uk",
    "santander.co.uk", "nationwide.co.uk", "halifax.co.uk", "monzo.com",
    "starlingbank.com", "revolut.com", "firstdirect.com", "metrobankonline.co.uk",
    "tsb.co.uk", "rbs.co.uk", "co-operativebank.co.uk", "virginmoney.com",
    "ybs.co.uk", "ulsterbank.co.uk",
}

# TLDs that are extremely rarely used by legitimate UK banks
SUSPICIOUS_TLDS: set[str] = {
    "top", "xyz", "site", "online", "click", "live", "info", "biz",
    "work", "rest", "pw", "gq", "ml", "cf", "ga", "tk", "ru", "cn",
    "cc", "icu", "world", "space",
}

SUSPICIOUS_PATH_KEYWORDS: set[str] = {
    "login", "signin", "verify", "secure", "account", "banking",
    "update", "confirm", "suspend", "reactivate", "onlinebanking",
    "webscr", "password", "credential",
}


def _char_entropy(s: str) -> float:
    """Shannon entropy of the character distribution in *s*."""
    if not s:
        return 0.0
    freq = {}
    for c in s:
        freq[c] = freq.get(c, 0) + 1
    n = len(s)
    return -sum((v / n) * math.log2(v / n) for v in freq.values())


def extract_features(url: str) -> dict[str, float]:
    """
    Extract all 26 features from *url* as a flat dict of feature_name -> value.
    All values are floats (0/1 for boolean features).
    """
    url = url.strip()

    # Parse with tldextract
    ext = tldextract.extract(url)
    registered_domain = ext.registered_domain.lower() if ext.registered_domain else ""
    subdomain = ext.subdomain.lower() if ext.subdomain else ""
    tld = ext.suffix.lower() if ext.suffix else ""
    fqdn = ext.fqdn.lower() if ext.fqdn else ""

    # Strip scheme for path analysis
    path_part = re.sub(r"^https?://[^/]+", "", url)
    query_part = url.split("?", 1)[1] if "?" in url else ""

    # URL token list (split on non-alphanumeric chars)
    tokens = re.split(r"[^a-z0-9]", url.lower())
    tokens = [t for t in tokens if t]

    # ── Lexical features ──────────────────────────────────────────────────────
    f: dict[str, float] = {}

    f["url_length"] = float(len(url))
    f["dot_count"] = float(url.count("."))
    f["hyphen_count"] = float(url.count("-"))
    f["slash_count"] = float(url.count("/"))
    f["at_sign_present"] = float("@" in url)
    f["double_slash_in_path"] = float("//" in path_part)
    f["ip_address_present"] = float(
        bool(re.search(r"\d{1,3}(?:\.\d{1,3}){3}", registered_domain))
    )
    f["digit_count"] = float(sum(c.isdigit() for c in url))
    f["digit_ratio"] = f["digit_count"] / max(len(url), 1)
    f["url_entropy"] = _char_entropy(url)
    f["token_count"] = float(len(tokens))
    f["has_port"] = float(bool(re.search(r":\d{2,5}/", url)))
    f["has_https"] = float(url.lower().startswith("https://"))
    f["query_length"] = float(len(query_part))
    f["path_length"] = float(len(path_part))

    # ── Structural features ───────────────────────────────────────────────────
    subdomain_parts = subdomain.split(".") if subdomain else []
    f["subdomain_count"] = float(len([s for s in subdomain_parts if s]))
    f["subdomain_length"] = float(len(subdomain))
    f["tld_length"] = float(len(tld))
    f["registered_domain_length"] = float(len(registered_domain))
    f["path_depth"] = float(path_part.count("/"))

    # ── TLD indicators ────────────────────────────────────────────────────────
    f["is_uk_tld"] = float(tld in ("co.uk", "uk", "org.uk", "me.uk"))
    f["is_suspicious_tld"] = float(tld in SUSPICIOUS_TLDS)
    f["is_com_tld"] = float(tld == "com")

    # ── UK banking-specific features ──────────────────────────────────────────
    url_lower = url.lower()

    # Does the URL contain a known UK bank brand token?
    found_brands = [b for b in UK_BANK_BRANDS if b in url_lower]
    f["contains_bank_brand"] = float(len(found_brands) > 0)
    f["brand_count"] = float(len(found_brands))

    # Brand-vs-domain mismatch: brand token appears in URL but
    # the registrable domain is NOT a legitimate bank domain.
    has_brand = len(found_brands) > 0
    is_legit_domain = registered_domain in LEGITIMATE_BANK_DOMAINS
    f["brand_domain_mismatch"] = float(has_brand and not is_legit_domain)

    # Suspicious login / authentication keywords in path
    f["suspicious_path_keyword"] = float(
        any(kw in path_part.lower() for kw in SUSPICIOUS_PATH_KEYWORDS)
    )

    return f


def _score_to_label(score: float) -> str:
    if score >= 0.70:
        return "phishing"
    if score >= 0.40:
        return "suspicious"
    return "legitimate"


def _build_flags(features: dict[str, float], score: float) -> tuple[list[FlagItem], list[FlagItem]]:
    """Derive human-readable red and green flags from extracted features."""
    red: list[FlagItem] = []
    green: list[FlagItem] = []

    if features.get("brand_domain_mismatch", 0):
        red.append(FlagItem(
            flag_type="red", flag_name="brand_domain_mismatch",
            description="Contains a UK bank brand token but the domain is not the bank's official domain",
        ))
    if features.get("is_suspicious_tld", 0):
        red.append(FlagItem(
            flag_type="red", flag_name="suspicious_tld",
            description="Top-level domain is rarely used by legitimate UK banks",
        ))
    if features.get("suspicious_path_keyword", 0):
        red.append(FlagItem(
            flag_type="red", flag_name="suspicious_path_keyword",
            description="URL path contains login/verify/secure keywords typical of credential harvesting",
        ))
    if features.get("ip_address_present", 0):
        red.append(FlagItem(
            flag_type="red", flag_name="ip_address_in_domain",
            description="Domain uses a raw IP address instead of a hostname",
        ))
    if features.get("at_sign_present", 0):
        red.append(FlagItem(
            flag_type="red", flag_name="at_sign_present",
            description="@ symbol in URL can redirect browsers to a different host",
        ))
    if features.get("double_slash_in_path", 0):
        red.append(FlagItem(
            flag_type="red", flag_name="double_slash_in_path",
            description="Double slash in path may indicate URL obfuscation",
        ))
    if features.get("subdomain_count", 0) >= 3:
        red.append(FlagItem(
            flag_type="red", flag_name="excessive_subdomains",
            description=f"URL has {int(features['subdomain_count'])} subdomain levels — legitimate banks rarely use more than 2",
        ))
    if features.get("url_entropy", 0) > 4.2:
        red.append(FlagItem(
            flag_type="red", flag_name="high_entropy",
            description="URL contains an unusually random character distribution, common in generated phishing domains",
        ))
    if features.get("url_length", 0) > 150:
        red.append(FlagItem(
            flag_type="red", flag_name="very_long_url",
            description="URL is abnormally long, which can hide the real destination",
        ))

    # Green flags
    if features.get("has_https", 0):
        green.append(FlagItem(
            flag_type="green", flag_name="https_present",
            description="Connection uses HTTPS encryption",
        ))
    if features.get("is_uk_tld", 0) and not features.get("brand_domain_mismatch", 0):
        green.append(FlagItem(
            flag_type="green", flag_name="uk_tld",
            description="Domain uses a .co.uk or .uk top-level domain",
        ))
    if score < 0.20:
        green.append(FlagItem(
            flag_type="green", flag_name="low_phishing_probability",
            description="Model assigns a very low phishing probability to this URL",
        ))

    return red, green


# ── Model state (loaded once at FastAPI startup) ───────────────────────────────

class _MLState:
    model: Any = None
    shap_explainer: Any = None
    feature_names: list[str] = []
    loaded: bool = False


_state = _MLState()


def load_models() -> None:
    """
    Load the XGBoost model, SHAP explainer, and feature names from disk.
    Called once inside the FastAPI lifespan context manager at startup.
    """
    xgb_path = Path(settings.XGB_MODEL_PATH)
    shap_path = Path(settings.SHAP_EXPLAINER_PATH)
    feat_path = Path(settings.FEATURE_NAMES_PATH)

    if not xgb_path.exists():
        logger.warning(
            "XGBoost model not found at %s. "
            "URL scanning will return a rule-based fallback score.",
            xgb_path,
        )
        _state.loaded = False
        return

    try:
        _state.model = joblib.load(xgb_path)
        logger.info("XGBoost model loaded from %s", xgb_path)

        if shap_path.exists():
            _state.shap_explainer = joblib.load(shap_path)
            logger.info("SHAP explainer loaded from %s", shap_path)
        else:
            logger.warning("SHAP explainer not found at %s — explanations will be unavailable", shap_path)

        if feat_path.exists():
            with open(feat_path) as fh:
                _state.feature_names = json.load(fh)
        else:
            logger.warning("feature_names.json not found at %s", feat_path)

        _state.loaded = True
    except Exception as exc:
        logger.error("Failed to load ML models: %s", exc, exc_info=True)
        _state.loaded = False


def predict_url(url: str) -> dict:
    """
    Analyse a single URL and return a structured result dict with keys:
      label, score, score_pct, red_flags, green_flags, feature_values, shap_values
    """
    features = extract_features(url)

    if not _state.loaded or _state.model is None:
        # Fallback: derive a heuristic score from feature values
        rule_score = _heuristic_score(features)
        label = _score_to_label(rule_score)
        red_flags, green_flags = _build_flags(features, rule_score)
        return {
            "label": label,
            "score": round(rule_score, 4),
            "score_pct": int(round(rule_score * 100)),
            "red_flags": red_flags,
            "green_flags": green_flags,
            "feature_values": features,
            "shap_values": {},
            "model_version": "heuristic_fallback",
        }

    # Align feature vector to the trained model's column order
    if _state.feature_names:
        feature_vector = np.array(
            [[features.get(name, 0.0) for name in _state.feature_names]],
            dtype=np.float32,
        )
    else:
        feature_vector = np.array([list(features.values())], dtype=np.float32)

    score = float(_state.model.predict_proba(feature_vector)[0][1])
    label = _score_to_label(score)

    # SHAP contributions
    shap_values: dict[str, float] = {}
    if _state.shap_explainer is not None:
        try:
            sv = _state.shap_explainer.shap_values(feature_vector)
            # For binary classification, sv is shape (1, n_features)
            raw = sv[0] if isinstance(sv, list) else sv[0]
            names = _state.feature_names or list(features.keys())
            shap_values = {n: round(float(v), 6) for n, v in zip(names, raw)}
        except Exception as exc:
            logger.warning("SHAP computation failed: %s", exc)

    red_flags, green_flags = _build_flags(features, score)

    return {
        "label": label,
        "score": round(score, 4),
        "score_pct": int(round(score * 100)),
        "red_flags": red_flags,
        "green_flags": green_flags,
        "feature_values": features,
        "shap_values": shap_values,
        "model_version": "xgb_v1",
    }


def _heuristic_score(f: dict[str, float]) -> float:
    """
    Simple weighted rule-based score used when the model file is absent.
    Returns a float in [0, 1].
    """
    score = 0.0
    if f.get("brand_domain_mismatch"):  score += 0.45
    if f.get("is_suspicious_tld"):     score += 0.25
    if f.get("suspicious_path_keyword"): score += 0.15
    if f.get("ip_address_present"):    score += 0.20
    if f.get("at_sign_present"):       score += 0.15
    if f.get("subdomain_count", 0) > 3: score += 0.10
    if f.get("url_entropy", 0) > 4.5:  score += 0.10
    if not f.get("has_https"):          score += 0.05
    return min(score, 1.0)