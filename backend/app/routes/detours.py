# backend/app/routes/detours.py
from fastapi import APIRouter, Query, Depends, HTTPException
from typing import List, Optional
from app.schemas.detour import DetourSearchQuery, DetourSuggestion, DetourHistoryItem
from app.services.geo import minutes_to_radius_km, haversine_km
from app.services.places_nearby import google_nearby
from app.services.hotpepper import hotpepper_food  # 無設定なら空配列を返す
from app.services.events import reverse_geocode_city, connpass_events
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.database import get_db
from app.models.detour_history import DetourHistory
from sqlalchemy import select, desc
import math

router = APIRouter()

@router.get("/search", response_model=List[DetourSuggestion])
async def search_detours(
    lat: float = Query(...),
    lng: float = Query(...),
    mode: str = Query(..., regex="^(walk|drive)$"),
    minutes: int = Query(..., ge=1, le=120),
    detour_type: str = Query(..., regex="^(food|event|souvenir)$"),
    categories: Optional[List[str]] = Query(None),
):
    radius_km = minutes_to_radius_km(minutes, mode)
    radius_m = int(radius_km * 1000)

    items: List[dict] = []

    if detour_type in ("food", "souvenir"):
        g = await google_nearby(lat, lng, radius_m, detour_type, categories)
        items.extend(g)
        if detour_type == "food":
            hp = await hotpepper_food(lat, lng, radius_m, categories)
            items.extend(hp)

    elif detour_type == "event":
        city = await reverse_geocode_city(lat, lng)
        if city:
            evs = await connpass_events(city)
            # 距離があれば付与してフィルタ
            out = []
            for e in evs:
                if e.get("lat") and e.get("lng"):
                    d = haversine_km(lat, lng, float(e["lat"]), float(e["lng"]))
                    if d <= radius_km * 1.5:  # ちょい緩め
                        e["distance_km"] = d
                        e["duration_min"] = math.ceil(minutes * (d / radius_km)) if radius_km>0 else minutes
                        e["open_now"] = None
                        e["rating"] = None
                        e["parking"] = None
                        e["photo_url"] = None
                        e["opening_hours"] = e.get("opening_hours")
                        out.append(e)
            items.extend(out)

    # 距離・評価でソートし、上位3件を返す
    for x in items:
        if "distance_km" not in x:
            x["distance_km"] = haversine_km(lat, lng, x["lat"], x["lng"])
        if "duration_min" not in x:
            x["duration_min"] = math.ceil((x["distance_km"] / radius_km) * minutes) if radius_km>0 else minutes

    items.sort(key=lambda x: (x["distance_km"], -(x.get("rating") or 0)))
    top3 = items[:3]

    return [DetourSuggestion(**x) for x in top3]

@router.post("/choose", response_model=DetourHistoryItem)
async def choose_detour(
    detour: DetourSuggestion,
    detour_type: str = Query(..., regex="^(food|event|souvenir)$"),
    db: AsyncSession = Depends(get_db),
):
    rec = DetourHistory(
        detour_type=detour_type,
        name=detour.name, lat=detour.lat, lng=detour.lng, note=detour.description
    )
    db.add(rec)
    await db.commit()
    await db.refresh(rec)
    return DetourHistoryItem(
        id=rec.id, detour_type=rec.detour_type, name=rec.name,
        lat=rec.lat, lng=rec.lng, chosen_at=rec.chosen_at.isoformat(),
        note=rec.note
    )

@router.get("/history", response_model=List[DetourHistoryItem])
async def list_history(db: AsyncSession = Depends(get_db), limit: int = 50):
    q = await db.execute(select(DetourHistory).order_by(desc(DetourHistory.id)).limit(limit))
    rows = q.scalars().all()
    return [
        DetourHistoryItem(
            id=r.id, detour_type=r.detour_type, name=r.name,
            lat=r.lat, lng=r.lng, chosen_at=r.chosen_at.isoformat(), note=r.note
        ) for r in rows
    ]
