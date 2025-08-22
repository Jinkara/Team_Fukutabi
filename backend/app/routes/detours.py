# backend/app/routes/detours.py
from fastapi import APIRouter, Query, Depends, HTTPException
from typing import List, Optional
import math, uuid, re, unicodedata  # 追加8/21: チェーン判定のため re を使用
from datetime import datetime  # 追加8/21: created_at統一のため
from sqlalchemy import select, desc
from sqlalchemy.orm import Session
from app.schemas.detour import (
    DetourSearchQuery,
    DetourSuggestion,
    DetourHistoryItem,
    TravelMode,   # 追加8/21: Query型を厳密化
    DetourType,   # 追加8/21: Query型を厳密化
)
from app.services.geo import minutes_to_radius_km, haversine_km
from app.services.places_nearby import google_nearby
from app.services.hotpepper import hotpepper_food  # 無設定なら空配列を返す
from app.services.events import reverse_geocode_city, connpass_events
from app.db.database import get_db                  # ← 同期Sessionを返す
from app.models.detour_history import DetourHistory

router = APIRouter(prefix="/detour", tags=["Detour"])  # 修正8/21: prefix/tagsを明示

# 追加8/21: 簡易チェーン判定（必要に応じて拡張）
_CHAIN_RE = re.compile(
    r"(マクドナルド|吉野家|スターバックス|ドトール|すき家|CoCo壱|サイゼ|ガスト|松屋|ミスタードーナツ|ケンタッキー|"
    r"セブン-?イレブン|ファミリーマート|ローソン|コメダ|モスバーガー|バーガーキング|はま寿司|スシロー|くら寿司|かっぱ寿司|"
    r"リンガーハット|王将|ココス|ビックカメラ|ヤマダ電機|ケーズデンキ|イオン|ユニクロ|無印良品)"
)

def _is_chain(name: str) -> bool:  # 追加8/21
    return bool(_CHAIN_RE.search(name or ""))

def _eta_text(mode: str, minutes: int, meters: int) -> str:
    return f"徒歩約{minutes}分・{meters}m" if mode == "walk" else f"車で約{minutes}分・{meters}m"
# =========================
# コア検索（純粋関数）
# =========================
async def search_detours_core(query: DetourSearchQuery, db: Session) -> List[DetourSuggestion]:  # 修正8/21
    """
    history_only=True -> DB履歴のみを返す。
    local_only=True  -> 外部API検索は行い、結果からチェーン店舗を除外する。
    """  # 修正8/21

    # 半径の決定（優先: query.radius_m、なければ minutes→km から算出）
    if query.radius_m is not None:
        radius_m = int(query.radius_m)
        radius_km = radius_m / 1000.0
    else:
        radius_km = minutes_to_radius_km(query.minutes, query.mode)
        radius_m = int(radius_km * 1000)

    # -------------------------
    # history_only: DB（履歴）だけで返す
    # -------------------------
    if query.history_only:  # 追加8/21
        rows = (
            db.execute(
                select(DetourHistory).order_by(desc(DetourHistory.id)).limit(100)
            ).scalars().all()
        )
        suggestions: List[DetourSuggestion] = []
        for r in rows:
            d_km = haversine_km(query.lat, query.lng, r.lat, r.lng)
            if radius_km <= 0 or d_km <= radius_km * 1.5:
                duration_min = (
                    math.ceil((d_km / radius_km) * query.minutes) if radius_km > 0 else query.minutes
                )
                suggestions.append(
                    DetourSuggestion(
                        id=str(uuid.uuid4()),
                        name=r.name,
                        description=r.note,
                        lat=r.lat,
                        lng=r.lng,
                        distance_km=d_km,
                        duration_min=duration_min,
                        rating=None,
                        open_now=None,
                        opening_hours=None,
                        parking=None,
                        source="local",  # DB由来は "local"
                        url=None,
                        photo_url=None,
                        created_at=(r.chosen_at or datetime.utcnow()).isoformat(),
                    )
                )
        suggestions.sort(key=lambda x: x.distance_km)
        return suggestions[:3]

    # -------------------------
    # 外部API検索（通常モード）
    # -------------------------
    items: List[dict] = []
    if query.detour_type in ("food", "souvenir"):
        g = await google_nearby(query.lat, query.lng, radius_m, query.detour_type, query.categories)
        items.extend(g)
        if query.detour_type == "food":
            hp = await hotpepper_food(query.lat, query.lng, radius_m, query.categories)
            items.extend(hp)

    elif (query.detour_type == "spot" or 
        (isinstance(query.detour_type, DetourType) and query.detour_type == DetourType.spot)):  # ★追加
        g = await google_nearby(
            query.lat, query.lng, radius_m,
            detour_type="spot",
            categories=query.categories,
        )
        items.extend(g)

    elif query.detour_type == "event":
        evs = await connpass_events(
            lat=query.lat,
            lng=query.lng,
            minutes=query.minutes,
            keyword=getattr(query, "keyword", None),
            categories=getattr(query, "categories", None),
            local_only=getattr(query, "local_only", False),
            mode=(query.mode if isinstance(query.mode, str) else getattr(query.mode, "value", "walk")),
        )
        out = []
        for e in evs:
            if e.get("lat") and e.get("lng"):
                d = haversine_km(query.lat, query.lng, float(e["lat"]), float(e["lng"]))
                if radius_km <= 0 or d <= radius_km * 1.5:
                    e["distance_km"] = d
                    e["duration_min"] = math.ceil(query.minutes * (d / radius_km)) if radius_km > 0 else query.minutes
                    e["open_now"] = None
                    e["rating"] = None
                    e["parking"] = None
                    e["photo_url"] = None
                    e["opening_hours"] = e.get("opening_hours")
                    e["source"] = e.get("source") or "yolp"  # ← connpass → yolp に変更
                    out.append(e)   
        items.extend(out)  # ← ここ必須！

    # 距離/分の補完
    for x in items:
        if "distance_km" not in x:
            x["distance_km"] = haversine_km(query.lat, query.lng, x["lat"], x["lng"])
        if "duration_min" not in x:
            x["duration_min"] = math.ceil((x["distance_km"] / radius_km) * query.minutes) if radius_km > 0 else query.minutes

    # 追加8/21: local_only=True のときはチェーンを除外（＝ローカル店舗優先）
    if query.local_only:
        items = [x for x in items if not _is_chain(x.get("name", ""))]

    # ソートとトップ3選定
    items.sort(key=lambda x: (x["distance_km"], -(x.get("rating") or 0)))
    top3 = items[:3]

    # DetourSuggestion に整形
    results: List[DetourSuggestion] = []
    now_iso = datetime.utcnow().isoformat()
    mode_str = query.mode if isinstance(query.mode, str) else query.mode.value

    for x in top3:
        meters = int(x["distance_km"] * 1000)

        results.append(
            DetourSuggestion(
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
                source=x.get("source") or "google",
                url=x.get("url"),
                photo_url=x.get("photo_url"),
                created_at=now_iso,
                eta_text=_eta_text(x["duration_min"], x["distance_km"], mode_str),
                detour_type=query.detour_type,  # ← "food" | "souvenir" | "event" | ...
            )
        )

    return results

# =========================
# ルーター（公開API）
# =========================
@router.get("/search", response_model=List[DetourSuggestion])
async def search_detours(
    lat: float = Query(...),
    lng: float = Query(...),
    mode: TravelMode = Query(...),  # 修正8/21: 型をLiteralに
    minutes: int = Query(..., ge=1, le=120),
    detour_type: DetourType = Query(...),  # 修正8/21: 型をLiteralに
    categories: Optional[List[str]] = Query(None),
    exclude_ids: Optional[List[str]] = Query(None),
    seed: Optional[int] = Query(None),
    radius_m: Optional[int] = Query(None, ge=100, le=10000),
    local_only: bool = Query(False),    # 修正8/21: 非チェーンのみ抽出
    history_only: bool = Query(False),  # 追加8/21: DB履歴のみ
    db: Session = Depends(get_db),
):
    query = DetourSearchQuery(
        lat=lat,
        lng=lng,
        minutes=minutes,
        mode=mode,
        detour_type=detour_type,
        categories=categories,
        exclude_ids=exclude_ids,
        seed=seed,
        radius_m=radius_m if radius_m is not None else None,
        local_only=local_only,
        history_only=history_only,
    )
    return await search_detours_core(query, db)

@router.post("/choose", response_model=DetourHistoryItem)  # 追加8/21
async def choose_detour(  # 追加8/21
    detour: DetourSuggestion,
    detour_type: DetourType = Query(...),
    db: Session = Depends(get_db),
):
    rec = DetourHistory(
        detour_type=detour_type,
        name=detour.name,
        lat=detour.lat,
        lng=detour.lng,
        note=detour.description,
    )
    db.add(rec)
    db.commit()           # 同期Sessionのため await 不要
    db.refresh(rec)
    return DetourHistoryItem(
        id=rec.id,
        detour_type=rec.detour_type,
        name=rec.name,
        lat=rec.lat,
        lng=rec.lng,
        chosen_at=rec.chosen_at.isoformat(),
        note=rec.note,
    )
@router.get("/history", response_model=List[DetourHistoryItem])  # 追加8/21
async def list_history(  # 追加8/21
    db: Session = Depends(get_db),
    limit: int = Query(50, ge=1, le=200),
):
    result = db.execute(
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

