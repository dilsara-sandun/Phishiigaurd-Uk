import asyncio
import os
import sys
from pathlib import Path

# Fix paths to allow importing from 'app'
project_root = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(project_root))

from app.services import ai_service
import logging

logging.basicConfig(level=logging.INFO)

async def test_ai():
    print("--- PhishGuard UK AI Verification ---")
    print("Testing connection to local Ollama (phi3)...")
    
    # Sample data for a fake phishing detection
    input_url = "https://lloyds-secure-banking-login.com/update"
    label = "phishing"
    score_pct = 98
    red_flags = [
        {"flag_name": "brand_name_in_domain", "description": "Contains 'lloyds'"},
        {"flag_name": "suspicious_url_pattern", "description": "Uses 'secure-banking' keywords"},
        {"flag_name": "high_entropy", "description": "Domain name looks random"}
    ]
    green_flags = []
    
    print("\nGenerating AI explanation...")
    explanation = await ai_service.generate_explanation(
        input_value=input_url,
        label=label,
        score_pct=score_pct,
        red_flags=red_flags,
        green_flags=green_flags
    )
    
    print("\n=== AI RESPONSE ===")
    print(explanation)
    print("===================\n")
    
    if "template" not in explanation.lower():
        print("Success! The AI (Phi-3) generated a custom explanation.")
    else:
        print("Warning: The AI service used the static template. Is Ollama running?")

if __name__ == "__main__":
    asyncio.run(test_ai())
