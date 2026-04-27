"""
services/ai_service.py
──────────────────────
Generates plain-English explanations for scan results and handles general
chatbot conversations using either:
  1. Google Gemini API  (gemini-1.5-flash)
  2. Local Ollama       (Mistral 7B)
"""

import logging
import re
from typing import Any
import httpx
from fastapi import HTTPException, status
from app.config import settings

logger = logging.getLogger(__name__)

# ── System Prompts ─────────────────────────────────────────────────────────────

_EXPLAIN_SYSTEM_PROMPT = """
You are a cybersecurity assistant for PhishGuard UK. Your ONLY job is to explain, in plain
English, why a URL, email, or domain was flagged by the machine-learning model.
Rules: 2-4 sentences, no bullet points, reference provided flags, end with 1 actionable recommendation.
""".strip()

_CHAT_SYSTEM_PROMPT = """
You are PhishGuard AI, a friendly and professional cybersecurity assistant for PhishGuard UK.
Your personality is a mix of a highly knowledgeable Cyber Security Expert and a helpful General Assistant.

- If the user asks about security, phishing, or protection, provide expert advice based on UK NCSC guidelines.
- If the user asks general questions, be helpful and polite while maintaining a professional security-conscious tone.
- Keep responses concise and avoid jargon where possible.
- If the user asks for personal help with a scam, prioritize safety and suggest reporting to Action Fraud.
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

async def _call_gemini(prompt: str, system_prompt: str | None = None) -> str:
    """
    Call Google Gemini API.
    """
    import google.generativeai as genai  # imported lazily

    genai.configure(api_key=settings.GEMINI_API_KEY)
    model = genai.GenerativeModel(
        model_name=settings.GEMINI_MODEL,
        system_instruction=system_prompt if system_prompt else _EXPLAIN_SYSTEM_PROMPT,
    )
    response = model.generate_content(
        prompt,
        generation_config=genai.types.GenerationConfig(
            temperature=0.3,
            max_output_tokens=512,
        ),
    )
    return response.text.strip()


# ── Ollama API call ────────────────────────────────────────────────────────────

async def _call_ollama(prompt: str, system_prompt: str | None = None) -> str:
    """
    Call a locally running Ollama instance.
    """
    sys = system_prompt if system_prompt else _EXPLAIN_SYSTEM_PROMPT
    payload = {
        "model": settings.OLLAMA_MODEL,
        "prompt": f"{sys}\n\nUser: {prompt}\n\nAssistant:",
        "stream": False,
        "options": {
            "temperature": 0.4,
            "num_predict": 512,
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
    """Static template fallback."""
    if label == "phishing":
        flag_str = ", ".join(f.get("flag_name", "").replace("_", " ") for f in red_flags[:3])
        return (
            f"This URL was rated as likely phishing with a confidence of {score_pct}%. "
            f"The main indicators include: {flag_str or 'multiple suspicious characteristics'}. "
            f"Do not click this link. Report it to report@phishing.gov.uk and contact "
            f"your bank directly using the number on the back of your card."
        )
    return (
        f"This URL appears legitimate (phishing probability {score_pct}%). "
        f"Our model found no significant phishing indicators."
    )


def _sanitize_message(message: str) -> str:
    """
    Detect and mitigate common LLM prompt injection patterns.
    """
    if len(message) > 500:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Message too long (max 500 characters)"
        )
    
    # List of common prompt injection keywords/patterns
    injection_patterns = [
        r"ignore previous instructions",
        r"disregard all previous",
        r"system:",
        r"user:",
        r"assistant:",
        r"new instruction:",
        r"forget everything",
        r"bypass security",
    ]
    
    for pattern in injection_patterns:
        if re.search(pattern, message, re.IGNORECASE):
            logger.warning("Potential prompt injection detected: %s", message)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Potentially malicious input detected. Please rephrase your message."
            )
    
    return message


# ── Public entry points ──────────────────────────────────────────────────────

async def generate_explanation(
    input_value: str,
    label: str,
    score_pct: int,
    red_flags: list[dict],
    green_flags: list[dict],
    feature_values: dict[str, Any] | None = None,
) -> str:
    """Generate a plain-English explanation for a scan result."""
    prompt = _build_prompt(input_value, label, score_pct, red_flags, green_flags, feature_values)
    
    if settings.GEMINI_API_KEY:
        try:
            return await _call_gemini(prompt, system_prompt=_EXPLAIN_SYSTEM_PROMPT)
        except Exception as exc:
            logger.warning("Gemini call failed: %s", exc)

    try:
        return await _call_ollama(prompt, system_prompt=_EXPLAIN_SYSTEM_PROMPT)
    except Exception as exc:
        logger.warning("Ollama not available: %s", exc)

    return _template_explanation(input_value, label, score_pct, red_flags)


async def generate_chat_response(message: str) -> str:
    """Generate a general chat response for the dashboard chatbot."""
    message = _sanitize_message(message)
    if settings.GEMINI_API_KEY:
        try:
            return await _call_gemini(message, system_prompt=_CHAT_SYSTEM_PROMPT)
        except Exception as exc:
            logger.warning("Gemini chat failed: %s", exc)

    try:
        return await _call_ollama(message, system_prompt=_CHAT_SYSTEM_PROMPT)
    except Exception as exc:
        logger.warning("Ollama chat not available: %s", exc)
        return "I'm sorry, I'm having trouble connecting to my brain right now. Please try again later."