from fastapi import APIRouter, HTTPException, Query
from app.services import places as svc

router = APIRouter(prefix="/places", tags=["places"])

MOCK_PREDS = [
    {"description": "清水寺, 京都", "place_id": "mock_kiyomizu"},
    {"description": "清水寺 成就院", "place_id": "mock_jojuin"},
    {"description": "清水寺 奥の院", "place_id": "mock_okunoin"},
]

MOCK_DETAIL = {
    "place_id": "mock_kiyomizu",
    "name": "清水寺",
    "formatted_address": "京都府京都市東山区清水",
    "geometry": {"location": {"lat": 34.994856, "lng": 135.785046}},
}
@router.get("/predictions")
async def predictions(input: str = Query(..., min_length=1), limit: int = 3):
    try:
        items = await svc.predictions(input, limit)
        return {"items": items}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/details")
async def details(place_id: str):
    try:
        return await svc.details(place_id)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))