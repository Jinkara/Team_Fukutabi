from pydantic import BaseModel, Field
from typing import Literal, List, Optional

TravelMode = Literal["walk", "drive"]
DetourType = Literal["food", "event", "souvenir"]

class DetourSearchQuery(BaseModel):
    lat: float
    lng: float
    minutes: int = Field(..., ge=1, le=120)
    mode: TravelMode
    detour_type: DetourType
    categories: Optional[List[str]] = None  # 例: ["ramen","cafe"]

class DetourSuggestion(BaseModel):
    id: Optional[int] = None              # DB保存時に付与
    name: str
    description: Optional[str] = None     # 一言ガイダンス（後で生成）
    lat: float
    lng: float
    distance_km: float
    duration_min: int
    rating: Optional[float] = None
    open_now: Optional[bool] = None
    opening_hours: Optional[str] = None
    parking: Optional[str] = None         # "あり/なし/不明"
    source: str                           # "google" | "hotpepper" | "connpass"
    url: Optional[str] = None
    photo_url: Optional[str] = None

class DetourHistoryItem(BaseModel):
    id: int
    detour_type: DetourType
    name: str
    lat: float
    lng: float
    chosen_at: str
    note: Optional[str] = None
