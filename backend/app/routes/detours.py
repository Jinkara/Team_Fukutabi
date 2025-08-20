# backend/app/routes/detours.py
from fastapi import APIRouter, Query, Depends, HTTPException
from typing import List, Optional
import math
from sqlalchemy import select, desc
from sqlalchemy.orm import Session
from app.schemas.detour import DetourSearchQuery, DetourSuggestion, DetourHistoryItem
from app.services.geo import minutes_to_radius_km, haversine_km
from app.services.places_nearby import google_nearby
from app.services.hotpepper import hotpepper_food  # 無設定なら空配列を返す
from app.services.events import reverse_geocode_city, connpass_events
from app.db.database import get_db                  # ← 同期Sessionを返す
from app.models.detour_history import DetourHistory
import uuid
from datetime import datetime

router = APIRouter()

@router.get("/search", response_model=List[DetourSuggestion])
async def search_detours(
    lat: float = Query(...),
    lng: float = Query(...),
    mode: str = Query(..., regex="^(walk|drive)$"),  # FastAPI新しめなら pattern= でもOK
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
            out = []
            for e in evs:
                if e.get("lat") and e.get("lng"):
                    d = haversine_km(lat, lng, float(e["lat"]), float(e["lng"]))
                    if d <= radius_km * 1.5:
                        e["distance_km"] = d
                        e["duration_min"] = math.ceil(minutes * (d / radius_km)) if radius_km > 0 else minutes
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
            x["duration_min"] = math.ceil((x["distance_km"] / radius_km) * minutes) if radius_km > 0 else minutes

    # ソートとトップ3選定
    items.sort(key=lambda x: (x["distance_km"], -(x.get("rating") or 0)))
    top3 = items[:3]

    # DetourSuggestion に整形
    results = []
    for x in top3:
        results.append(DetourSuggestion(
            id=str(uuid.uuid4()),
            name=x["name"],
            description=x.get("description"),
            lat=x["lat"],
            lng=x["lng"],
            distance_km=x["distance_km"],
            duration_min=x["duration_min"],
            rating=x.get("rating"),
            open_now=x.get("open_now"),
            opening_hours=x.get("opening_hours"),
            parking=x.get("parking"),
            source=x.get("source") or "google",  # デフォルト google
            url=x.get("url"),
            photo_url=x.get("photo_url"),
            created_at=datetime.utcnow().isoformat() # ← 文字列で渡す
        ))

    return results

@router.post("/choose", response_model=DetourHistoryItem)
async def choose_detour(
    detour: DetourSuggestion,
    detour_type: str = Query(..., regex="^(food|event|souvenir)$"),
    db: Session = Depends(get_db),                     # ← Session に変更
):
    rec = DetourHistory(
        detour_type=detour_type,
        name=detour.name,
        lat=detour.lat,
        lng=detour.lng,
        note=detour.description,
    )
    db.add(rec)
    db.commit()                                        # ← await なし
    db.refresh(rec)                                    # ← await なし
    return DetourHistoryItem(
        id=rec.id,
        detour_type=rec.detour_type,
        name=rec.name,
        lat=rec.lat,
        lng=rec.lng,
        chosen_at=rec.chosen_at.isoformat(),           # schemaがdatetimeならそのまま返してもOK
        note=rec.note,
    )

@router.get("/history", response_model=List[DetourHistoryItem])
async def list_history(db: Session = Depends(get_db), limit: int = 50):  # ← Session に変更
    result = db.execute(                                                  # ← 同期実行
        select(DetourHistory).order_by(desc(DetourHistory.id)).limit(limit)
    )
    rows = result.scalars().all()
    return [
        DetourHistoryItem(
            id=r.id,
            detour_type=r.detour_type,
            name=r.name,
            lat=r.lat,
            lng=r.lng,
            chosen_at=r.chosen_at.isoformat(),
            note=r.note,
        )
        for r in rows
    ]
