from fastapi import APIRouter, Depends, HTTPException, status
from app.schemas.extension_schema import ExtensionPayload
from app.services.site_service import analyse_live_site

router = APIRouter(
    prefix="/extension",
    tags=["extension"]
)

@router.post("/analyse")
async def analyze_extension_payload(payload: ExtensionPayload):
    """
    Receives payload from the browser extension and analyzes the live site data.
    """
    try:
        result = await analyse_live_site(payload)
        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
