# backend/app/services/events.py
import httpx
from typing import List, Dict
# 1) 逆ジオコーディング（Nominatim）で市区町村名を取得
async def reverse_geocode_city(lat: float, lng: float) -> str | None:
    url = "https://nominatim.openstreetmap.org/reverse"
    params = {"format":"jsonv2", "lat":lat, "lon":lng}
    headers = {"User-Agent":"Fukutabi/1.0"}
    async with httpx.AsyncClient(timeout=10, headers=headers) as client:
        r = await client.get(url, params=params)
        j = r.json()
    addr = j.get("address", {})
    return addr.get("city") or addr.get("town") or addr.get("village") or addr.get("municipality")

# 2) connpass API（キーワードに市区町村＋“イベント”で近傍を疑似）
async def connpass_events(near_word: str, count=30) -> List[Dict]:
    url = "https://connpass.com/api/v1/event/"
    params = {"keyword_or": near_word, "count": count}
    async with httpx.AsyncClient(timeout=10) as client:
        r = await client.get(url, params=params)
        j = r.json()
    events = []
    for e in j.get("events", []):
        events.append({
            "name": e.get("title"),
            "lat": e.get("lat"),
            "lng": e.get("lon"),
            "url": e.get("event_url"),
            "opening_hours": e.get("started_at"),
            "source": "connpass",
        })
    return events
