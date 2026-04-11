"""
routers/ai.py
─────────────
Endpoints for AI-powered interactions:
  POST /ai/chat      General-purpose chatbot conversation
"""

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from app.middleware.auth_middleware import get_current_user
from app.models.user import User
from app.services.ai_service import generate_chat_response

router = APIRouter(prefix="/ai", tags=["AI Assistance"])

class ChatRequest(BaseModel):
    message: str

class ChatResponse(BaseModel):
    response: str

@router.post("/chat", response_model=ChatResponse)
async def chat_with_ai(
    body: ChatRequest,
    current_user: User = Depends(get_current_user),
):
    """
    Chat with PhishGuard AI.
    Requires authentication.
    """
    if not body.message:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Message cannot be empty"
        )
    
    response = await generate_chat_response(body.message)
    return ChatResponse(response=response)
