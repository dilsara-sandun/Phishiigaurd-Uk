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
from datetime import datetime, timezone, timedelta
import httpx
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.config import settings
from app.models.user import User

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
    Detect and mitigate common LLM prompt injection patterns (OWASP LLM01: Prompt Injection).
    """
    if len(message) > 500:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Message too long (max 500 characters)"
        )
    
    # Comprehensive prompt injection & jailbreak regex patterns (OWASP LLM01)
    injection_patterns = [
        r"ignore previous instructions",
        r"disregard all previous",
        r"system:",
        r"user:",
        r"assistant:",
        r"new instruction:",
        r"forget everything",
        r"bypass security",
        r"you are now",
        r"act as a",
        r"jailbreak",
        r"ignore safety rules",
        r"do anything now",
        r"dan mode",
    ]
    
    for pattern in injection_patterns:
        if re.search(pattern, message, re.IGNORECASE):
            logger.warning("Potential prompt injection detected: %s", message)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Adversarial or security-bypass input detected. Please rephrase your message."
            )
    
    return message


def _sanitize_output(text: str) -> str:
    """
    Mitigate OWASP LLM06 (Sensitive Information Disclosure).
    Redacts any sensitive database schema names, credentials, keys, or private data.
    """
    # Redact credit card numbers
    text = re.sub(r"\b(?:\d[ -]*?){13,16}\b", "[REDACTED_CREDIT_CARD]", text)
    # Redact email addresses
    text = re.sub(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,7}\b", "[REDACTED_EMAIL]", text)
    # Redact database credentials pattern e.g. postgres://...
    text = re.sub(r"postgresql\+[^:\s]+:[^@\s]+@[^\s]+", "[REDACTED_DB_URL]", text)
    # Redact JWT tokens (partial or full: header only, header.payload, or header.payload.signature)
    text = re.sub(r"eyJ[A-Za-z0-9-_=]+(?:\.[A-Za-z0-9-_.+/=]*)+", "[REDACTED_JWT]", text)
    return text


async def check_ai_token_limit(db: AsyncSession, user: User, estimated_tokens: int) -> None:
    """Verify if the user has enough daily AI token quota remaining."""
    now = datetime.now(timezone.utc)
    
    # SQLite returns timezone-naive datetimes, so normalise
    last_reset = user.last_token_reset
    last_reset_cmp = last_reset.replace(tzinfo=timezone.utc) if last_reset.tzinfo is None else last_reset
    
    if now - last_reset_cmp > timedelta(days=1):
        user.ai_tokens_used_today = 0
        user.last_token_reset = now
        await db.flush()
        
    quota = user.daily_ai_token_quota
    used = user.ai_tokens_used_today
    if used + estimated_tokens > quota:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=(
                f"Daily AI token limit exceeded ({used}/{quota} tokens used today). "
                "Please upgrade your subscription tier for higher quotas."
            )
        )


async def consume_ai_tokens(db: AsyncSession, user: User, actual_tokens: int) -> None:
    """Deduct the tokens from the user's daily quota."""
    user.ai_tokens_used_today += actual_tokens
    await db.flush()


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


async def generate_chat_response(db: AsyncSession, user: User, message: str) -> str:
    """Generate a general chat response for the dashboard chatbot with token limit checking."""
    # 1. Sanitize user input (OWASP LLM01: Prompt Injection)
    cleaned_message = _sanitize_message(message)
    
    # 2. Check token quota limit
    estimated_prompt_tokens = max(1, len(cleaned_message) // 4)
    await check_ai_token_limit(db, user, estimated_prompt_tokens)
    
    response_text = ""
    
    # 3. Call AI service
    if settings.GEMINI_API_KEY:
        try:
            response_text = await _call_gemini(cleaned_message, system_prompt=_CHAT_SYSTEM_PROMPT)
        except Exception as exc:
            logger.warning("Gemini chat failed: %s", exc)

    if not response_text:
        try:
            response_text = await _call_ollama(cleaned_message, system_prompt=_CHAT_SYSTEM_PROMPT)
        except Exception as exc:
            logger.warning("Ollama chat not available: %s", exc)
            response_text = "I'm sorry, I'm having trouble connecting to my brain right now. Please try again later."

    # 4. Sanitize and redact output (OWASP LLM06: Sensitive Information Disclosure)
    response_text = _sanitize_output(response_text)
    
    # Append disclaimer (OWASP LLM09: Overreliance)
    response_text += "\n\n*Disclaimer: PhishGuard AI provides automated cybersecurity assistance. Verify critical security issues through official channels.*"

    # 5. Consume tokens (prompt + response)
    actual_tokens = max(1, (len(cleaned_message) + len(response_text)) // 4)
    await consume_ai_tokens(db, user, actual_tokens)
    
    return response_text