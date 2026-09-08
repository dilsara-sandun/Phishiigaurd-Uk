"""
services/ml_service.py
──────────────────────
Core ML inference service.

Responsibilities:
  1. Load the XGBoost model, SHAP explainer, and feature names at startup.
  2. Extract 26+ lexical, structural, and universal brand-specific features
     from a raw URL string.
  3. Run predict_proba() to get a phishing probability score.
  4. Apply SHAP to produce per-feature contribution values for explainability.
  5. Derive red/green flags from feature values for display in the UI.
"""

import json
import logging
import math
import os
import re
import unicodedata
from pathlib import Path
from typing import Any

import joblib
import numpy as np
from app.utils.tld import extract_tld

from app.config import settings
from app.schemas.scan_schema import FlagItem

logger = logging.getLogger(__name__)

# ── Universal known brand tokens (impersonated in phishing globally) ───────────
# These are lowercase tokens that appear in URLs/domains when attackers
# impersonate well-known brands. They span tech, banking, delivery, government,
# finance, telecom, and retail sectors.

KNOWN_BRANDS: set[str] = {
    # Big Tech / Cloud / Social
    "google", "gmail", "youtube", "googlemail",
    "microsoft", "outlook", "office", "microsoft365", "onedrive", "azure", "teams",
    "apple", "icloud", "appleid",
    "amazon", "aws", "amazonprime",
    "facebook", "meta", "instagram", "whatsapp", "messenger",
    "twitter", "x",
    "linkedin",
    "netflix",
    "paypal",
    "ebay",
    "dropbox",
    "adobe",
    "zoom",
    "docusign",
    "slack",
    "github",
    "notion",
    "shopify",
    # UK Banks
    "lloyds", "lloydsbank",
    "natwest",
    "barclays",
    "hsbc",
    "santander",
    "nationwide",
    "halifax",
    "monzo",
    "starling", "starlingbank",
    "revolut",
    "firstdirect",
    "metrobank",
    "tsb",
    "rbs", "royalbankofscotland",
    "cooperativebank",
    "virginmoney",
    "yorkshirebank", "ybs",
    "ulsterbank",
    # Other International Banks
    "chase", "citibank", "citi", "wellsfargo", "bankofamerica", "boa",
    "deutschebank", "bnpparibas", "creditsuisse", "ubs", "ing", "abnamro",
    # Delivery / Logistics
    "dhl",
    "fedex",
    "royalmail",
    "hermes",
    "dpd",
    "ups",
    "parcelforce",
    "evri",
    "yodel",
    "tnt",
    # UK Government / Public Services
    "hmrc",
    "dvla",
    "dvsa",
    "nhs",
    "gov",
    "tvlicensing", "tvlicence",
    "dwp",
    "companieshouse",
    "actionfraud",
    # Finance / Payment
    "visa",
    "mastercard",
    "amex", "americanexpress",
    "westernunion",
    "moneygram",
    "transferwise", "wise",
    "stripe",
    "klarna",
    "clearpay",
    "cryptodotcom",
    "coinbase",
    "binance",
    # UK Telecom / Utilities
    "bt", "openreach",
    "sky",
    "virginmedia",
    "o2",
    "ee",
    "vodafone",
    "threemobile",
    "talktalk",
    "plusnet",
    "edf", "britishgas", "octopusenergy", "eon",
    # Retail / Other
    "argos",
    "asda",
    "tesco",
    "sainsburys",
    "next",
    "marks", "marksandspencer",
    "currys",
    "boots",
    "npower",
    "sportsdirect",
}

# Mapping of brand token → official registered domain(s)
# Used for brand-vs-domain mismatch detection
KNOWN_LEGITIMATE_DOMAINS: dict[str, set[str]] = {
    "google":           {"google.com", "google.co.uk", "gmail.com", "googlemail.com", "googleapis.com"},
    "gmail":            {"gmail.com", "googlemail.com"},
    "youtube":          {"youtube.com"},
    "microsoft":        {"microsoft.com", "live.com", "outlook.com", "office.com", "microsoftonline.com",
                         "office365.com", "windows.com", "azure.com", "hotmail.com"},
    "outlook":          {"outlook.com", "live.com", "hotmail.com"},
    "apple":            {"apple.com", "icloud.com"},
    "icloud":           {"icloud.com"},
    "amazon":           {"amazon.co.uk", "amazon.com", "aws.amazon.com", "amazontrust.com"},
    "aws":              {"aws.amazon.com", "amazonaws.com"},
    "facebook":         {"facebook.com", "fb.com", "messenger.com"},
    "instagram":        {"instagram.com"},
    "whatsapp":         {"whatsapp.com"},
    "twitter":          {"twitter.com", "x.com"},
    "linkedin":         {"linkedin.com"},
    "netflix":          {"netflix.com"},
    "paypal":           {"paypal.com", "paypal.me"},
    "ebay":             {"ebay.co.uk", "ebay.com"},
    "dropbox":          {"dropbox.com"},
    "adobe":            {"adobe.com"},
    "zoom":             {"zoom.us", "zoom.com"},
    "docusign":         {"docusign.com", "docusign.net"},
    "slack":            {"slack.com"},
    "github":           {"github.com", "github.io", "githubusercontent.com"},
    "lloyds":           {"lloydsbank.co.uk", "lloydsbank.com"},
    "lloydsbank":       {"lloydsbank.co.uk", "lloydsbank.com"},
    "natwest":          {"natwest.com"},
    "barclays":         {"barclays.co.uk", "barclays.com"},
    "hsbc":             {"hsbc.co.uk", "hsbc.com"},
    "santander":        {"santander.co.uk"},
    "nationwide":       {"nationwide.co.uk"},
    "halifax":          {"halifax.co.uk"},
    "monzo":            {"monzo.com"},
    "starling":         {"starlingbank.com"},
    "starlingbank":     {"starlingbank.com"},
    "revolut":          {"revolut.com"},
    "firstdirect":      {"firstdirect.com"},
    "metrobank":        {"metrobankonline.co.uk"},
    "tsb":              {"tsb.co.uk"},
    "rbs":              {"rbs.co.uk"},
    "cooperativebank":  {"co-operativebank.co.uk"},
    "virginmoney":      {"virginmoney.com"},
    "ybs":              {"ybs.co.uk"},
    "ulsterbank":       {"ulsterbank.co.uk"},
    "chase":            {"chase.com"},
    "citibank":         {"citibank.com", "citi.com"},
    "wellsfargo":       {"wellsfargo.com"},
    "bankofamerica":    {"bankofamerica.com"},
    "dhl":              {"dhl.com", "dhl.co.uk"},
    "fedex":            {"fedex.com"},
    "royalmail":        {"royalmail.com"},
    "hermes":           {"myhermes.co.uk", "evri.com"},
    "dpd":              {"dpd.co.uk", "dpd.com"},
    "ups":              {"ups.com"},
    "parcelforce":      {"parcelforce.com"},
    "evri":             {"evri.com"},
    "hmrc":             {"hmrc.gov.uk", "gov.uk"},
    "dvla":             {"dvla.gov.uk", "gov.uk"},
    "dvsa":             {"dvsa.gov.uk", "gov.uk"},
    "nhs":              {"nhs.uk", "nhs.net"},
    "gov":              {"gov.uk"},
    "tvlicensing":      {"tvlicensing.co.uk"},
    "dwp":              {"dwp.gov.uk", "gov.uk"},
    "visa":             {"visa.com", "visa.co.uk"},
    "mastercard":       {"mastercard.com"},
    "amex":             {"americanexpress.com"},
    "americanexpress":  {"americanexpress.com"},
    "westernunion":     {"westernunion.com"},
    "transferwise":     {"transferwise.com", "wise.com"},
    "wise":             {"wise.com"},
    "stripe":           {"stripe.com"},
    "klarna":           {"klarna.com"},
    "coinbase":         {"coinbase.com"},
    "binance":          {"binance.com"},
    "nbk":              {"nbk.com"},
    "nationstrust":     {"nationstrust.com"},
    "qnb":              {"qnb.com"},
    "adcb":             {"adcb.com"},
    "standardchartered":{"standardchartered.com"},
    "bt":               {"bt.com"},
    "sky":              {"sky.com"},
    "virginmedia":      {"virginmedia.com"},
    "o2":               {"o2.co.uk"},
    "ee":               {"ee.co.uk"},
    "vodafone":         {"vodafone.co.uk"},
    "talktalk":         {"talktalk.co.uk"},
}

KNOWN_BANK_DOMAINS: set[str] = {
    "lloydsbank.co.uk", "lloydsbank.com", "lloyds.com", "halifax.co.uk", "bankofscotland.co.uk", "mbna.co.uk",
    "barclays.co.uk", "barclays.com", "barclaycard.co.uk",
    "natwest.com", "natwest.co.uk", "rbs.co.uk", "coutts.com", "ulsterbank.co.uk",
    "hsbc.co.uk", "hsbc.com", "firstdirect.com",
    "santander.co.uk", "cahoot.com",
    "nationwide.co.uk",
    "tsb.co.uk",
    "monzo.com",
    "starlingbank.com",
    "revolut.com",
    "co-operativebank.co.uk",
    "virginmoney.com",
    "metrobankonline.co.uk", "metrobank.co.uk",
    "ybs.co.uk", "coventrybuildingsociety.co.uk", "skipton.co.uk",
    "atombank.co.uk", "oaknorth.co.uk", "marcus.co.uk", "tescobank.com", "sainsburysbank.co.uk",
    "gov.uk", "hmrc.gov.uk", "tvlicensing.co.uk", "nhs.uk", "nhs.net",
    "chase.com", "citibank.com", "citi.com", "wellsfargo.com", "bankofamerica.com",
    "nationstrust.com", "nbk.com", "qnb.com", "adcb.com", "standardchartered.com"
}

KNOWN_TECH_DOMAINS: set[str] = {
    "google.com", "google.co.uk", "gmail.com", "googlemail.com", "googleapis.com",
    "microsoft.com", "live.com", "outlook.com", "office.com", "microsoftonline.com",
    "office365.com", "windows.com", "azure.com", "hotmail.com", "apple.com", "icloud.com",
    "amazon.co.uk", "amazon.com", "aws.amazon.com", "amazontrust.com", "facebook.com",
    "fb.com", "messenger.com", "instagram.com", "whatsapp.com", "twitter.com", "x.com",
    "linkedin.com", "netflix.com", "paypal.com", "ebay.co.uk", "ebay.com", "dropbox.com",
    "adobe.com", "zoom.us", "zoom.com", "docusign.com", "docusign.net", "slack.com",
    "github.com", "github.io", "githubusercontent.com", "cloudflare.com"
}

# TLDs that are very rarely used by any legitimate brand or organisation
SUSPICIOUS_TLDS: set[str] = {
    "top", "xyz", "site", "online", "click", "live", "info", "biz",
    "work", "rest", "pw", "gq", "ml", "cf", "ga", "tk", "ru", "cn",
    "cc", "icu", "world", "space", "vip", "shop", "store", "club",
    "fun", "wtf", "link", "cyou", "fit", "buzz", "zip", "mov",
}

# Countries whose hosting is a strong phishing signal (high-risk jurisdictions)
HIGH_RISK_COUNTRIES: set[str] = {
    "China", "Russia", "North Korea", "Iran", "Nigeria",
    "CN", "RU", "KP", "IR", "NG",
}

# Path keywords associated with credential harvesting
SUSPICIOUS_PATH_KEYWORDS: set[str] = {
    "login", "signin", "sign-in", "verify", "secure", "account", "banking",
    "update", "confirm", "suspend", "reactivate", "onlinebanking",
    "webscr", "password", "credential", "validate", "authentication",
    "reset", "recover", "unlock", "authorize", "authorise",
}


def _char_entropy(s: str) -> float:
    """Shannon entropy of the character distribution in *s*."""
    if not s:
        return 0.0
    freq: dict[str, int] = {}
    for c in s:
        freq[c] = freq.get(c, 0) + 1
    n = len(s)
    return -sum((v / n) * math.log2(v / n) for v in freq.values())


def _contains_homograph(domain: str) -> bool:
    """
    Detect if a domain contains non-ASCII Unicode characters that visually
    resemble ASCII letters (homograph / IDN homograph attack).
    e.g. pаypal.com where 'а' is Cyrillic U+0430 not Latin 'a'.
    """
    try:
        domain.encode("ascii")
        return False  # purely ASCII, no homograph
    except UnicodeEncodeError:
        pass
    # Check each character's Unicode category; Latin letters are 'Ll', 'Lu'
    # Non-ASCII letters that look like ASCII are the threat
    for ch in domain:
        if ord(ch) > 127:
            name = unicodedata.name(ch, "")
            # Confusable scripts: Cyrillic, Greek, Armenian, etc.
            if any(script in name for script in ["CYRILLIC", "GREEK", "ARMENIAN", "ARABIC"]):
                return True
    return False


def _brand_domain_mismatch(url_lower: str, registered_domain: str) -> tuple[bool, str]:
    """
    Check if any known brand token appears in the URL but the registrable
    domain is not the brand's legitimate domain.
    Returns (is_mismatch, matched_brand).
    """
    for brand, legit_domains in KNOWN_LEGITIMATE_DOMAINS.items():
        if brand in url_lower:
            if registered_domain not in legit_domains:
                return True, brand
    return False, ""


def extract_features(url: str) -> dict[str, float]:
    """
    Extract all features from *url* as a flat dict of feature_name -> value.
    All values are floats (0/1 for boolean features).
    """
    url = url.strip()

    # Parse with extract_tld
    ext = extract_tld(url)
    registered_domain = ext.top_domain_under_public_suffix.lower() if ext.top_domain_under_public_suffix else ""
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
    _ip_pattern = re.compile(r"^\d{1,3}(?:\.\d{1,3}){3}$")
    _netloc = re.sub(r"^https?://", "", url).split("/")[0].split(":")[0]
    f["ip_address_present"] = float(
        bool(re.search(r"\d{1,3}(?:\.\d{1,3}){3}", registered_domain))
        or bool(_ip_pattern.match(_netloc))
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

    # ── Universal brand-specific features ─────────────────────────────────────
    url_lower = url.lower()

    # Does the URL contain any known global brand token?
    found_brands = [b for b in KNOWN_BRANDS if b in url_lower]
    f["contains_brand"] = float(len(found_brands) > 0)
    f["brand_count"] = float(len(found_brands))

    # Brand-vs-domain mismatch
    mismatch, _ = _brand_domain_mismatch(url_lower, registered_domain)
    f["brand_domain_mismatch"] = float(mismatch)

    # Homograph / IDN attack
    f["homograph_domain"] = float(_contains_homograph(fqdn or registered_domain))

    # Suspicious login/auth keywords in path
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


def _build_flags(
    features: dict[str, float],
    score: float,
    registered_domain: str = "",
) -> tuple[list[FlagItem], list[FlagItem]]:
    """Derive human-readable red and green flags from extracted features."""
    red: list[FlagItem] = []
    green: list[FlagItem] = []

    if features.get("brand_domain_mismatch", 0):
        red.append(FlagItem(
            flag_type="red", flag_name="brand_domain_mismatch",
            description=(
                "URL contains a well-known brand name but the domain is not "
                "that organisation's official website — a common phishing technique."
            ),
        ))
    if features.get("homograph_domain", 0):
        red.append(FlagItem(
            flag_type="red", flag_name="homograph_domain",
            description=(
                "Domain contains Unicode characters that visually resemble "
                "standard letters (IDN homograph attack)."
            ),
        ))
    if features.get("is_suspicious_tld", 0):
        red.append(FlagItem(
            flag_type="red", flag_name="suspicious_tld",
            description=(
                "This top-level domain is rarely used by legitimate organisations "
                "and is frequently registered for phishing campaigns."
            ),
        ))
    if features.get("suspicious_path_keyword", 0):
        red.append(FlagItem(
            flag_type="red", flag_name="suspicious_path_keyword",
            description="URL path contains login/verify/secure keywords typical of credential harvesting pages.",
        ))
    if features.get("ip_address_present", 0):
        red.append(FlagItem(
            flag_type="red", flag_name="ip_address_in_domain",
            description="Domain uses a raw IP address instead of a hostname — no legitimate service does this.",
        ))
    if features.get("at_sign_present", 0):
        red.append(FlagItem(
            flag_type="red", flag_name="at_sign_present",
            description="@ symbol in URL can trick browsers into redirecting to a different host.",
        ))
    if features.get("double_slash_in_path", 0):
        red.append(FlagItem(
            flag_type="red", flag_name="double_slash_in_path",
            description="Double slash in URL path may indicate URL obfuscation or redirect abuse.",
        ))
    if features.get("subdomain_count", 0) >= 3:
        red.append(FlagItem(
            flag_type="red", flag_name="excessive_subdomains",
            description=(
                f"URL has {int(features['subdomain_count'])} subdomain levels — "
                "attackers add subdomains to make a malicious domain look legitimate "
                "(e.g. secure.login.paypal.attacker.com)."
            ),
        ))
    if features.get("url_entropy", 0) > 4.2:
        red.append(FlagItem(
            flag_type="red", flag_name="high_entropy",
            description="URL contains an unusually random character distribution, common in algorithmically generated phishing domains.",
        ))
    if features.get("url_length", 0) > 150:
        red.append(FlagItem(
            flag_type="red", flag_name="very_long_url",
            description="URL is abnormally long, which is often used to hide the real destination.",
        ))

    # ── Green flags ────────────────────────────────────────────────────────────
    if features.get("has_https", 0):
        green.append(FlagItem(
            flag_type="green", flag_name="https_present",
            description="Connection uses HTTPS encryption.",
        ))
    if features.get("is_uk_tld", 0) and not features.get("brand_domain_mismatch", 0):
        green.append(FlagItem(
            flag_type="green", flag_name="uk_tld",
            description="Domain uses a .co.uk or .uk top-level domain.",
        ))
    if score < 0.20:
        green.append(FlagItem(
            flag_type="green", flag_name="low_phishing_probability",
            description="Model assigns a very low phishing probability to this URL.",
        ))
    # Known legitimate domain check — provides positive confirmation on verified safe sites
    if registered_domain and score < 0.20:
        if registered_domain in KNOWN_BANK_DOMAINS or registered_domain in KNOWN_TECH_DOMAINS:
            green.append(FlagItem(
                flag_type="green", flag_name="known_legitimate_domain",
                description=(
                    f"'{registered_domain}' is a verified legitimate domain of a "
                    "known bank, government service, or major technology provider."
                ),
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
        if xgb_path.stat().st_size > 0:
            _state.model = joblib.load(xgb_path)
            logger.info("XGBoost model loaded from %s", xgb_path)
            _state.loaded = True
        else:
            logger.warning("XGBoost model file is empty at %s. Using heuristic fallback.", xgb_path)

        if shap_path.exists() and shap_path.stat().st_size > 0:
            _state.shap_explainer = joblib.load(shap_path)
            logger.info("SHAP explainer loaded from %s", shap_path)
        else:
            logger.warning("SHAP explainer missing at %s — explanations unavailable", shap_path)

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
    # Extract registered domain for the green-flag check
    _ext = extract_tld(url)
    _registered_domain = _ext.top_domain_under_public_suffix.lower() if _ext.top_domain_under_public_suffix else ""

    if not _state.loaded or _state.model is None:
        rule_score = _heuristic_score(features)
        label = _score_to_label(rule_score)
        red_flags, green_flags = _build_flags(features, rule_score, _registered_domain)
        return {
            "label": label,
            "score": round(rule_score, 4),
            "score_pct": round(rule_score * 100),
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

    # In the dataset (PhiUSIIL/LegitPhish) and trained XGBoost model:
    # Class 0 = Phishing (malicious)
    # Class 1 = Legitimate (benign)
    # predict_proba returns [P(class 0), P(class 1)].
    # Therefore, the phishing risk probability is at index 0.
    score = float(_state.model.predict_proba(feature_vector)[0][0])
    label = _score_to_label(score)

    # SHAP contributions
    shap_values: dict[str, float] = {}
    if _state.shap_explainer is not None:
        try:
            sv = _state.shap_explainer.shap_values(feature_vector)
            raw = sv[0] if isinstance(sv, list) else sv[0]
            # Invert margin so positive contribution aligns with phishing risk
            names = _state.feature_names or list(features.keys())
            shap_values = {n: round(float(-v), 6) for n, v in zip(names, raw)}
        except Exception as exc:
            logger.warning("SHAP computation failed: %s", exc)

    red_flags, green_flags = _build_flags(features, score, _registered_domain)

    return {
        "label": label,
        "score": round(score, 4),
        "score_pct": round(score * 100),
        "red_flags": red_flags,
        "green_flags": green_flags,
        "feature_values": features,
        "shap_values": shap_values,
        "model_version": "xgb_v1",
    }


def _heuristic_score(f: dict[str, float]) -> float:
    """
    Weighted rule-based score used when the model file is absent.
    Returns a float in [0, 1].

    Individual signal weights are additive. A compound bonus is applied when
    brand_domain_mismatch + is_suspicious_tld fire together — the dominant
    'paypal-verify.xyz' class of phishing attack.
    """
    score = 0.0
    if f.get("brand_domain_mismatch"):    score += 0.45
    if f.get("homograph_domain"):         score += 0.40
    if f.get("is_suspicious_tld"):        score += 0.25
    if f.get("suspicious_path_keyword"):  score += 0.15
    if f.get("ip_address_present"):       score += 0.20
    if f.get("at_sign_present"):          score += 0.15
    if f.get("subdomain_count", 0) > 3:   score += 0.10
    if f.get("url_entropy", 0) > 4.5:     score += 0.10
    if not f.get("has_https"):            score += 0.05
    # Compound rule: brand impersonation on a suspicious TLD is a very strong signal
    if f.get("brand_domain_mismatch") and f.get("is_suspicious_tld"):  score += 0.10
    return min(score, 1.0)