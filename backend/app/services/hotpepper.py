import os, httpx
from typing import List, Optional

HOTPEPPER_KEY = os.getenv("HOTPEPPER_API_KEY")

async def hotpepper_food(lat: float, lng: float, radius_m: int, keywords: Optional[List[str]]):
    if not HOTPEPPER_KEY:
        return []
    # HotPepperの半径コードは固定
    radius_code = 300 if radius_m<=300 else 500 if radius_m<=500 else 1000 if radius_m<=1000 else 2000 if radius_m<=2000 else 3000
    range_map = {300:1, 500:2, 1000:3, 2000:4, 3000:5}
    params = {
        "key": HOTPEPPER_KEY, "lat": lat, "lng": lng,
        "range": range_map[radius_code], "format": "json", "count": 30
    }
    if keywords: params["keyword"] = " ".join(keywords)
    async with httpx.AsyncClient(timeout=10) as client:
        r = await client.get("https://webservice.recruit.co.jp/hotpepper/gourmet/v1/", params=params)
        data = r.json()
    shops = data.get("results", {}).get("shop", []) if isinstance(data.get("results"), dict) else []
    out = []
    for s in shops:
        out.append({
            "name": s.get("name"),
            "lat": float(s.get("lat")),
            "lng": float(s.get("lng")),
            "rating": None,
            "open_now": None,
            "opening_hours": s.get("open"),
            "parking": s.get("parking"),
            "url": s.get("urls", {}).get("pc"),
            "photo_url": s.get("photo", {}).get("pc", {}).get("l"),
            "source": "hotpepper",
        })
    return out
