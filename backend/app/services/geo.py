import math

WALK_KMPH = 4.8
DRIVE_KMPH = 40.0  # 都市MVP用の控えめ設定（必要なら調整）
EARTH_R = 6371.0088

def minutes_to_radius_km(minutes: int, mode: str) -> float:
    speed = WALK_KMPH if mode == "walk" else DRIVE_KMPH
    return (speed * minutes) / 60.0

def haversine_km(lat1, lng1, lat2, lng2) -> float:
    to_rad = math.radians
    dlat = to_rad(lat2 - lat1)
    dlng = to_rad(lng2 - lng1)
    a = (math.sin(dlat/2)**2
        + math.cos(to_rad(lat1))*math.cos(to_rad(lat2))*math.sin(dlng/2)**2)
    return 2 * EARTH_R * math.asin(math.sqrt(a))

# 速度テーブル（既存定数を内部で参照）
SPEED_KMH = {
    "walk": WALK_KMPH,    # 4.8 km/h
    "drive": DRIVE_KMPH,  # 40.0 km/h
}

def travel_minutes(distance_km: float, mode: str) -> int:
    """
    距離(km)→分。近距離向けの保守速度を用い、下限1分。
    """
    v = SPEED_KMH.get(mode, SPEED_KMH["walk"])
    if distance_km is None:
        return 1
    try:
        if not distance_km or distance_km <= 0 or math.isnan(distance_km):
            return 1
    except TypeError:
        return 1
    minutes = (distance_km / v) * 60.0
    return max(1, round(minutes))

def eta_text(
    distance_km: float,
    mode: str,
    *,
    distance_only_threshold_m: int = 250,
    force_distance_only: bool = False
) -> str:
    """
    250m未満は距離のみ表記（UI違和感防止）。force_distance_only=Trueなら常に距離のみ。
    例:
    - 0.212km, walk -> '212m'
    - 0.6km, walk   -> '徒歩約8分・600m'
    - 1.2km, drive  -> '車で約3分・1200m'
    """
    meters = int(round((distance_km or 0.0) * 1000))
    if force_distance_only or meters < distance_only_threshold_m:
        return f"{meters}m"

    mins = travel_minutes(distance_km, mode)
    if mode == "walk":
        return f"徒歩約{mins}分・{meters}m"
    elif mode == "drive":
        return f"車で約{mins}分・{meters}m"
    # 未知modeは距離のみ
    return f"{meters}m"
# --- 追加ここまで -----------------------------------------------------------