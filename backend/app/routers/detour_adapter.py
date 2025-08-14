# app/routers/detour_adapter.py
from fastapi import APIRouter, Query
from typing import List, Dict, Any
import math

# 既存の実ルータ関数を呼ぶ
from app.routes.detours import search_detours as core_search

router = APIRouter(prefix="/detour", tags=["Detour (Compat)"])

def cat_to_detour_type(category: str) -> str:
    c = (category or "").lower()
    if c in ("gourmet", "food"): return "food"
    if c == "event": return "event"
    # Figmaの「ローカル名所」は便宜的にsouvenirへ
    return "souvenir"

def eta_text(distance_km: float, mode: str) -> str:
    speed_kmh = 4.5 if mode == "walk" else 20.0  # ざっくり
    minutes = max(1, math.ceil((distance_km / speed_kmh) * 60))
    meters = int(distance_km * 1000)
    return f"{'徒歩' if mode=='walk' else '車'}約{minutes}分・{meters}m"

@router.get("/search", response_model=List[Dict[str, Any]])
async def search_detour_compat(
    mode: str = Query("walk", pattern="^(walk|drive)$"),
    duration: int = Query(15, ge=1, le=120),
    category: str = Query("local"),
    # 既定の座標（東京駅）。将来はフロントから渡すか、位置サービスで補完。
    lat: float = Query(35.681236),
    lng: float = Query(139.767125),
):
    detour_type = cat_to_detour_type(category)
    items = await core_search(
        lat=lat, lng=lng, mode=mode, minutes=duration,
        detour_type=detour_type, categories=None
    )
    out = []
    for i, it in enumerate(items, start=1):
        dkm = getattr(it, "distance_km", None) or 0.5
        out.append({
            "id": i,
            "name": it.name,
            "category": category,
            "eta_text": eta_text(dkm, mode),
            "description": getattr(it, "description", "") or getattr(it, "note", "") or "",
        })
    return out
