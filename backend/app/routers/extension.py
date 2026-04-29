from fastapi import APIRouter, Depends, HTTPException, status
from app.schemas.extension_schema import ExtensionPayload
from app.services.site_service import analyse_live_site

router = APIRouter(
    prefix="/extension",
    tags=["extension"]
)

from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db

@router.post("/analyse")
async def analyze_extension_payload(
    payload: ExtensionPayload,
    db: AsyncSession = Depends(get_db)
):
    """
    Receives payload from the browser extension and analyzes the live site data.
    """
    try:
        print(f"DEBUG: Extension analysis requested for {payload.domain}")
        result = await analyse_live_site(payload, db)
        return result
    except Exception as e:
        print(f"CRITICAL ERROR in extension router: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
