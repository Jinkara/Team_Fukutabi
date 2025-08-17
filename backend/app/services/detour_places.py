import os
import math
import httpx
from typing import List
from app.schemas.detour import DetourSuggestion, TravelMode

GOOGLE_PLACES_API_KEY = os.getenv("GOOGLE_PLACES_API_KEY")
BASE_URL = "https://maps.googleapis.com/maps/api/place/nearbysearch/json"

def minutes_to_distance_km(minutes: int, mode: TravelMode) -> float:
    speed_kmh = 4.5 if mode == "walk" else 40.0  # 徒歩/車の平均速度
    return (minutes / 60) * speed_kmh

async def search_places(lat: float, lng: float, mode: TravelMode, minutes: int, keyword: str = None) -> List[DetourSuggestion]:
    radius_km = minutes_to_distance_km(minutes, mode)
    radius_m = int(radius_km * 1000)

    params = {
        "location": f"{lat},{lng}",
        "radius": radius_m,
        "key": GOOGLE_PLACES_API_KEY,
        "language": "ja",
    }
    if keyword:
        params["keyword"] = keyword

    async with httpx.AsyncClient() as client:
        resp = await client.get(BASE_URL, params=params)
        data = resp.json()

    suggestions = []
    for place in data.get("results", []):
        suggestions.append(
            DetourSuggestion(
                name=place["name"],
                description=place.get("vicinity"),
                lat=place["geometry"]["location"]["lat"],
                lng=place["geometry"]["location"]["lng"],
                distance_km=radius_km,  # 本当はルート計算APIで精密化可能
                duration_min=minutes,
                rating=place.get("rating"),
                open_now=place.get("opening_hours", {}).get("open_now") if place.get("opening_hours") else None,
                source="google",
                url=f"https://www.google.com/maps/place/?q=place_id:{place['place_id']}",
                photo_url=f"https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference={place['photos'][0]['photo_reference']}&key={GOOGLE_PLACES_API_KEY}" if place.get("photos") else None
            )
        )

    return suggestions
