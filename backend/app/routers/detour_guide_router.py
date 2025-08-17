from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
from app.db.database import get_db
from app.schemas.detour import DetourSuggestionResponse
from app.services.detour_places import search_detour_places
from app.db import models

router = APIRouter(prefix="/detour-guide", tags=["detour-guide"])

@router.get("/", response_model=List[DetourSuggestionResponse])
async def get_detour_suggestions(
    lat: float = Query(..., description="現在地の緯度"),
    lng: float = Query(..., description="現在地の経度"),
    mode: str = Query("driving", description="移動手段: driving または walking"),
    minutes: int = Query(30, description="移動時間（分）"),
    db: AsyncSession = Depends(get_db)
):
    try:
        results = await search_detour_places(lat, lng, mode, minutes)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"検索エラー: {str(e)}")

    # DBに保存
    for r in results:
        suggestion = models.DetourSuggestion(
            name=r["name"],
            address=r["address"],
            lat=r["lat"],
            lng=r["lng"],
            duration=r["duration"],
            mode=mode
        )
        db.add(suggestion)
    await db.commit()

    return results
