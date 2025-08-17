from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
from app.db.database import get_db
from app.services.detour_places import search_places
from app.schemas.detour import DetourSuggestion, TravelMode
from app.models.detour_history import DetourHistory
from app.services.security import get_current_user
from datetime import datetime

router = APIRouter(prefix="/detour-guide", tags=["Detour Guide"])

@router.get("/search", response_model=List[DetourSuggestion])
async def search_detour_guide(
    lat: float = Query(...),
    lng: float = Query(...),
    mode: TravelMode = Query("walk"),
    minutes: int = Query(15, ge=1, le=120),
    keyword: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user)
):
    results = await search_places(lat, lng, mode, minutes, keyword)

    # 履歴に保存
    for r in results:
        history = DetourHistory(
            user_id=current_user.id,
            name=r.name,
            lat=r.lat,
            lng=r.lng,
            chosen_at=datetime.utcnow(),
            note=r.description
        )
        db.add(history)
    await db.commit()

    return results
