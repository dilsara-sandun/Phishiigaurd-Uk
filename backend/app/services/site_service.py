import socket
import logging
from app.schemas.extension_schema import ExtensionPayload
from app.schemas.scan_schema import FlagItem
from app.services.ai_service import _call_gemini, _call_ollama
from app.config import settings
from app.services.ml_service import LEGITIMATE_BANK_DOMAINS
LEGITIMATE_TECH_DOMAINS = ["google.com", "microsoft.com", "apple.com", "amazon.com", "facebook.com", "cloudflare.com"]

logger = logging.getLogger(__name__)

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.scan import Scan
from app.models.scan_flag import ScanFlag
from app.models.user import User
from app.models.threat_intel import ThreatIntel
from datetime import datetime
import ssl

def get_ssl_details(hostname):
    try:
        context = ssl.create_default_context()
        with socket.create_connection((hostname, 443), timeout=3) as sock:
            with context.wrap_socket(sock, server_hostname=hostname) as ssock:
                cert = ssock.getpeercert()
                issuer = dict(x[0] for x in cert['issuer'])
                organization = issuer.get('organizationName', 'Unknown')
                common_name = issuer.get('commonName', 'Unknown')
                not_after = cert['notAfter']
                expiry_date = datetime.strptime(not_after, '%b %d %H:%M:%S %Y %Z')
                days_to_expiry = (expiry_date - datetime.now()).days
                return {
                    "issuer": f"{organization} ({common_name})",
                    "expiry_days": days_to_expiry,
                    "is_valid": days_to_expiry > 0
                }
    except Exception:
        return None

async def analyse_live_site(payload: ExtensionPayload, db: AsyncSession) -> dict:
    red_flags = []
    green_flags = []
    
    # 0. Get a User for persistence (Fallback to first user if needed)
    target_user = None
    try:
        result_user = await db.execute(select(User).limit(1))
        target_user = result_user.scalar_one_or_none()
    except Exception as e:
        logger.error(f"Database error during user lookup: {e}")

    if not target_user:
        logger.warning("No user found in DB. Scan will not be persisted to history.")

    # 0. Global Threat Intelligence Lookup
    intel_match = await db.execute(select(ThreatIntel).where(ThreatIntel.url.contains(payload.domain)))
    intel_hit = intel_match.scalars().first()
    
    if intel_hit:
        red_flags.append(FlagItem(
            flag_type="red",
            flag_name="global_threat_intel_hit",
            description=f"Identified in PhishGuard Intelligence ({intel_hit.source}). Known malicious infrastructure targeting {intel_hit.target_brand or 'UK Banking'}."
        ))

    # 1. SSL & DNS Check
    ssl_info = get_ssl_details(payload.domain)
    ip_address = "Unknown"
    try:
        ip_address = socket.gethostbyname(payload.domain)
    except Exception:
        pass

    domain_lower = payload.domain.lower()
    is_bank = any(domain_lower == d or domain_lower.endswith("." + d) for d in LEGITIMATE_BANK_DOMAINS)
    is_tech = any(domain_lower == d or domain_lower.endswith("." + d) for d in LEGITIMATE_TECH_DOMAINS)
    is_whitelisted = is_bank or is_tech

    if ssl_info:
        green_flags.append(FlagItem(
            flag_type="green",
            flag_name="valid_ssl_certificate",
            description=f"Verified SSL from {ssl_info['issuer']}. Valid for {ssl_info['expiry_days']} days."
        ))
        # High Risk: Free SSL on a non-whitelisted bank-branded site
        if any(k in ssl_info['issuer'].lower() for k in ["let's encrypt", "zerossl"]) and not is_whitelisted:
            red_flags.append(FlagItem(
                flag_type="red",
                flag_name="low_assurance_ssl",
                description="Low-assurance SSL (Let's Encrypt) detected on a banking site. Potential 'lookalike' infrastructure."
            ))
    else:
        red_flags.append(FlagItem(
            flag_type="red",
            flag_name="no_ssl_detected",
            description="No valid SSL certificate found. Critical vulnerability for financial transactions."
        ))

    if is_whitelisted:
        green_flags.append(FlagItem(
            flag_type="green",
            flag_name="official_bank_domain",
            description="Verified official UK banking domain."
        ))

    # 2. Evaluate Forms & Security
    for form in payload.forms:
        if form.isMismatchedDomain:
            red_flags.append(FlagItem(
                flag_type="red",
                flag_name="mismatched_form_action",
                description=f"Cross-domain data leakage: Form submits sensitive data to {form.action}"
            ))
            
    # 3. Impersonation Risk
    if payload.suspiciousKeywords and not is_whitelisted:
        red_flags.append(FlagItem(
            flag_type="red",
            flag_name="brand_impersonation_risk",
            description=f"Unauthorized use of banking brands ({', '.join(payload.suspiciousKeywords)}) on external domain."
        ))
        
    # 4. Sentiment Analysis
    if payload.urgencyKeywords:
        red_flags.append(FlagItem(
            flag_type="red",
            flag_name="urgency_language",
            description=f"High-pressure psychological triggers detected: {', '.join(payload.urgencyKeywords)}"
        ))

    # 5. Tech & Infrastructure Analysis
    hosting_provider = "Unknown"
    tech_str = str(payload.techStack).lower()
    meta_str = str(payload.metaMetadata).lower()
    
    # Improved Hosting Detection
    if any(k in tech_str or k in meta_str for k in ["cloudfront", "amazon", "aws", "s3"]):
        hosting_provider = "AWS (Amazon Web Services)"
    elif any(k in tech_str or k in meta_str for k in ["google", "appspot", "gcp"]):
        hosting_provider = "Google Cloud (GCP)"
    elif "azure" in tech_str or "microsoft" in tech_str:
        hosting_provider = "Microsoft Azure"
    elif "cloudflare" in tech_str or "cloudflare" in meta_str:
        hosting_provider = "Cloudflare CDN"
    elif "heroku" in tech_str:
        hosting_provider = "Heroku"
    elif "digitalocean" in tech_str:
        hosting_provider = "DigitalOcean"

    # Programming Language / Framework Detection
    detected_tech = list(payload.techStack)
    if "asp.net" in tech_str or "__viewstate" in meta_str:
        detected_tech.append("C# / ASP.NET")
    if "php" in tech_str:
        detected_tech.append("PHP")
    if "react" in tech_str:
        detected_tech.append("React.js")
    if "vue" in tech_str:
        detected_tech.append("Vue.js")
    if "django" in tech_str:
        detected_tech.append("Python (Django)")
    if "laravel" in tech_str:
        detected_tech.append("PHP (Laravel)")

    # Deduplicate detected tech
    detected_tech = list(set(detected_tech))

    # Detect Security Headers
    has_security_meta = any(k in meta_str for k in ["content-security-policy", "strict-transport-security", "x-frame-options"])
    if has_security_meta:
        green_flags.append(FlagItem(
            flag_type="green",
            flag_name="security_policy_present",
            description="Page defines explicit security or content policies (CSP/HSTS) via meta tags."
        ))

    # 6. Enterprise Scoring Logic (Refined Parameters)
    if is_whitelisted and not intel_hit:
        score = 0.01 
    else:
        # Weighted Scoring
        base_score = 0.15
        if intel_hit: base_score += 0.80 # Automatic Phishing
        if not ssl_info: base_score += 0.45 # Very High Risk
        
        # Heuristic modifiers
        weights = {
            "mismatched_form_action": 0.40,
            "brand_impersonation_risk": 0.50,
            "urgency_language": 0.25,
            "low_assurance_ssl": 0.30,
            "no_ssl_detected": 0.45
        }
        
        score = base_score
        for flag in red_flags:
            score += weights.get(flag.flag_name, 0.15)
    
    score = min(score, 1.0)
    label = "phishing" if score >= 0.70 else "suspicious" if score >= 0.40 else "legitimate"

    # AI Report Generation
    prompt = (
        f"Act as a Senior UK Cybersecurity Architect. Provide an expert-level technical audit of this infrastructure for a doctoral-level research project:\n"
        f"TARGET: {payload.domain} (Resolved IP: {ip_address})\n"
        f"INFRASTRUCTURE: {hosting_provider}\n"
        f"SSL STATUS: {ssl_info['issuer'] if ssl_info else 'NONE/INVALID'}\n"
        f"TECH STACK & VERSIONS: {', '.join(detected_tech) or 'Standard Web Server'}\n"
        f"CRITICAL RED FLAGS: {', '.join([f.description for f in red_flags]) or 'None identified'}\n"
        f"SECURITY COMPLIANCE: {', '.join([f.description for f in green_flags]) or 'Standard security posture'}\n\n"
        f"INSTRUCTIONS: Write a 5-sentence technical synthesis. Use advanced terminology (e.g., 'asymmetric attack surface', 'XSS mitigation', 'hosting topology', 'certificate transparency'). "
        f"Explicitly discuss any detected software versions (e.g., jQuery, WordPress, AEM) and their security implications in a banking context. Be precise and authoritative."
    )
    
    explanation = ""
    try:
        if settings.GEMINI_API_KEY:
            import google.generativeai as genai
            genai.configure(api_key=settings.GEMINI_API_KEY)
            m_name = settings.GEMINI_MODEL if settings.GEMINI_MODEL.startswith("models/") else f"models/{settings.GEMINI_MODEL}"
            model = genai.GenerativeModel(m_name)
            response = model.generate_content(prompt)
            explanation = response.text.strip()
    except Exception:
        pass

    if not explanation:
        explanation = f"Analysis complete for {payload.domain}. Hosted on {hosting_provider}. IP identified as {ip_address}. Programming stack: {', '.join(detected_tech) or 'Unknown'}."

    # 5. Persist to Database for Dashboard (Only if a user exists)
    if target_user:
        new_scan = Scan(
            user_id=target_user.id,
            scan_type="domain", # Used to differentiate from pure URL scans
            input_value=payload.url,
            label=label,
            score=score,
            explanation=explanation,
            feature_values={
                "hosting": hosting_provider,
                "ip": ip_address,
                "ssl_issuer": ssl_info['issuer'] if ssl_info else "None",
                "ssl_expiry": ssl_info['expiry_days'] if ssl_info else 0,
                "tech": detected_tech,
                "meta": payload.metaMetadata
            }
        )
        db.add(new_scan)
        await db.flush() # Get scan ID
    
        # Add flags
        for f in red_flags + green_flags:
            db.add(ScanFlag(
                scan_id=new_scan.id,
                flag_name=f.flag_name,
                description=f.description,
                flag_type=f.flag_type
            ))
        
        await db.commit()
    else:
        logger.info("Scan results generated but not persisted (No user).")

    return {
        "url": payload.url,
        "label": label,
        "score": score,
        "score_pct": int(score * 100),
        "tech_stack": detected_tech,
        "hosting": hosting_provider,
        "server_ip": ip_address,
        "red_flags": red_flags,
        "green_flags": green_flags,
        "explanation": explanation
    }
