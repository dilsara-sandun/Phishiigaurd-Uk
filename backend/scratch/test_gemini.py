import os
from dotenv import load_dotenv
import google.generativeai as genai

load_dotenv()

def test_gemini():
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        print("GEMINI_API_KEY not found in .env")
        return

    print(f"Testing Gemini with key: {api_key[:10]}...")
    genai.configure(api_key=api_key)
    model = genai.GenerativeModel("gemini-1.5-flash")
    
    try:
        response = model.generate_content("Say hello")
        print(f"Success! Response: {response.text}")
    except Exception as e:
        print(f"Failed! Error: {e}")

if __name__ == "__main__":
    test_gemini()
