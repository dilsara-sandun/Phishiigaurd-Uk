"""
services/ai_service.py
──────────────────────
Generates plain-English explanations for scan results using either:
  1. Google Gemini API  (gemini-1.5-flash, free tier — preferred when key is set)
  2. Local Ollama       (Mistral 7B — zero cost fallback)

The LLM is NEVER used for detection; it only explains the output of the ML
model in user-friendly language.  A tightly constrained system prompt keeps
responses focused and prevents hallucination.
"""

import json
import logging
from typing import Any

import httpx

from app.config import settings

logger = logging.getLogger(__name__)

# ── System prompt ──────────────────────────────────────────────────────────────
# This prompt is immutable and injected into every LLM call.
_SYSTEM_PROMPT = """
You are a cybersecurity assistant for PhishGuard UK, a phishing detection tool
used by UK bank staff and customers.  Your ONLY job is to explain, in plain
English, why a URL, email, or domain was flagged by the machine-learning model.

Rules you must ALWAYS follow:
1. Keep your explanation to 2-4 sentences.  Do not use bullet points.
2. Reference the specific red flags provided to you (e.g. brand mismatch,
   suspicious TLD, high entropy) — do not invent new reasons.
3. End with exactly ONE actionable recommendation from the list below:
   - "Do not click this link. Report it to report@phishing.gov.uk and contact
     your bank directly using the number on the back of your card."
   - "Exercise caution. Verify this URL with your bank before proceeding."
   - "This URL appears legitimate based on the features provided."
4. NEVER ask users for passwords, PINs, account numbers, or any credentials.
5. NEVER make absolute guarantees. Use language like "appears", "suggests",
   "indicates", "our model rates this as".
6. If the label is 'legitimate', reassure the user briefly and explain the
   positive indicators.
""".strip()


def _build_prompt(
    input_value: str,
    label: str,
    score_pct: int,
    red_flags: list[dict],
    green_flags: list[dict],
    feature_values: dict[str, Any] | None,
) -> str:
    """Construct the user-turn prompt from scan result data."""
    red_names = [f.get("flag_name", "") for f in red_flags] or ["none"]
    green_names = [f.get("flag_name", "") for f in green_flags] or ["none"]

    # Select the 5 highest SHAP features if available
    top_features = ""
    if feature_values:
        sorted_feats = sorted(feature_values.items(), key=lambda kv: abs(kv[1]), reverse=True)[:5]
        top_features = ", ".join(f"{k}={v:.3f}" for k, v in sorted_feats)

    return (
        f"Scan result:\n"
        f"  Input: {input_value}\n"
        f"  Label: {label} (phishing probability: {score_pct}%)\n"
        f"  Red flags: {', '.join(red_names)}\n"
        f"  Green flags: {', '.join(green_names)}\n"
        f"  Top contributing features: {top_features or 'unavailable'}\n\n"
        f"Explain this result in 2-4 plain-English sentences and provide one "
        f"actionable recommendation."
    )


# ── Gemini API call ────────────────────────────────────────────────────────────

async def _call_gemini(prompt: str) -> str:
    """
    Call Google Gemini API (gemini-1.5-flash).
    Returns the text response or raises an exception.
    """
    import google.generativeai as genai  # imported lazily

    genai.configure(api_key=settings.GEMINI_API_KEY)
    model = genai.GenerativeModel(
        model_name=settings.GEMINI_MODEL,
        system_instruction=_SYSTEM_PROMPT,
    )
    response = model.generate_content(
        prompt,
        generation_config=genai.types.GenerationConfig(
            temperature=0.2,
            max_output_tokens=256,
        ),
    )
    return response.text.strip()


# ── Ollama API call ────────────────────────────────────────────────────────────

async def _call_ollama(prompt: str) -> str:
    """
    Call a locally running Ollama instance (e.g. Mistral 7B).
    Returns the generated text or raises an exception.
    """
    payload = {
        "model": settings.OLLAMA_MODEL,
        "prompt": f"{_SYSTEM_PROMPT}\n\nUser: {prompt}\n\nAssistant:",
        "stream": False,
        "options": {
            "temperature": 0.2,
            "num_predict": 256,
        },
    }
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(
            f"{settings.OLLAMA_BASE_URL}/api/generate",
            json=payload,
        )
        resp.raise_for_status()
        data = resp.json()
    return data.get("response", "").strip()


# ── Fallback template ─────────────────────────────────────────────────────────

def _template_explanation(
    input_value: str,
    label: str,
    score_pct: int,
    red_flags: list[dict],
) -> str:
    """
    Static template used when both Gemini and Ollama are unavailable.
    Ensures users always receive some explanation.
    """
    if label == "phishing":
        flag_str = ", ".join(f.get("flag_name", "").replace("_", " ") for f in red_flags[:3])
        return (
            f"This URL was rated as likely phishing with a confidence of {score_pct}%. "
            f"The main indicators include: {flag_str or 'multiple suspicious characteristics'}. "
            f"Do not click this link. Report it to report@phishing.gov.uk and contact "
            f"your bank directly using the number on the back of your card."
        )
    if label == "suspicious":
        return (
            f"This URL shows some suspicious characteristics (score {score_pct}%) but could not "
            f"be definitively classified. Exercise caution and verify this URL with your bank "
            f"before proceeding."
        )
    return (
        f"This URL appears legitimate (phishing probability {score_pct}%). "
        f"Our model found no significant phishing indicators."
    )


# ── Public entry point ────────────────────────────────────────────────────────

async def generate_explanation(
    input_value: str,
    label: str,
    score_pct: int,
    red_flags: list[dict],
    green_flags: list[dict],
    feature_values: dict[str, Any] | None = None,
) -> str:
    """
    Generate a plain-English explanation for a scan result.

    Tries Gemini first, then Ollama, then falls back to a static template.
    Never raises an exception — always returns a string.
    """
    prompt = _build_prompt(input_value, label, score_pct, red_flags, green_flags, feature_values)

    # 1. Try Gemini
    if settings.GEMINI_API_KEY:
        try:
            return await _call_gemini(prompt)
        except Exception as exc:
            logger.warning("Gemini call failed, falling back to Ollama: %s", exc)

    # 2. Try Ollama
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            health = await client.get(f"{settings.OLLAMA_BASE_URL}/api/tags")
        if health.status_code == 200:
            return await _call_ollama(prompt)
    except Exception as exc:
        logger.warning("Ollama not available (%s), using template explanation.", exc)

    # 3. Static template fallback
    return _template_explanation(input_value, label, score_pct, red_flags)