from app.schemas.extension_schema import ExtensionPayload
from app.schemas.scan_schema import FlagItem
from app.services.ai_service import _call_gemini, _call_ollama
from app.config import settings
import logging

logger = logging.getLogger(__name__)

async def analyse_live_site(payload: ExtensionPayload) -> dict:
    red_flags = []
    green_flags = []
    
    # 1. Evaluate Forms
    for form in payload.forms:
        if form.isMismatchedDomain:
            red_flags.append(FlagItem(
                flag_type="red",
                flag_name="mismatched_form_action",
                description=f"A form on this page sends data to an external domain: {form.action}"
            ))
            
    # 2. Evaluate Keywords (Impersonation)
    if payload.suspiciousKeywords:
        red_flags.append(FlagItem(
            flag_type="red",
            flag_name="brand_impersonation_risk",
            description=f"Page mentions UK banking brands ({', '.join(payload.suspiciousKeywords)}) but might not be official."
        ))
        
    # 3. Evaluate Urgency
    if payload.urgencyKeywords:
        red_flags.append(FlagItem(
            flag_type="red",
            flag_name="urgency_language",
            description=f"Page uses high-pressure language: {', '.join(payload.urgencyKeywords)}"
        ))

    # Basic Scoring Logic
    base_score = 0.1 # Base risk
    if payload.techStack:
        base_score += 0.05
    
    score = base_score + (len(red_flags) * 0.25)
    score = min(score, 1.0)
    
    if score >= 0.7:
        label = "phishing"
    elif score >= 0.4:
        label = "suspicious"
    else:
        label = "legitimate"

    # AI Explanation
    prompt = (
        f"Analyze this live website data:\n"
        f"URL: {payload.url}\n"
        f"Title: {payload.title}\n"
        f"Tech Stack: {', '.join(payload.techStack) if payload.techStack else 'Unknown'}\n"
        f"Red Flags: {', '.join([f.description for f in red_flags]) if red_flags else 'None'}\n\n"
        f"Write a 3-sentence plain English explanation of the risk for a non-technical user."
    )
    
    explanation = "Analysis complete."
    try:
        if settings.GEMINI_API_KEY:
            explanation = await _call_gemini(prompt)
        else:
            explanation = await _call_ollama(prompt)
    except Exception as e:
        logger.error(f"AI generation failed: {e}")
        explanation = "We detected some suspicious elements, but AI explanation is currently unavailable."

    return {
        "url": payload.url,
        "label": label,
        "score": score,
        "score_pct": int(score * 100),
        "tech_stack": payload.techStack,
        "red_flags": red_flags,
        "green_flags": green_flags,
        "explanation": explanation
    }
