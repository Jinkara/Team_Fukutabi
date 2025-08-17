from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Text
from sqlalchemy.sql import func
from app.db.database import Base

class DetourSuggestion(Base):
    __tablename__ = "detour_suggestions"

    id = Column(Integer, primary_key=True, index=True)
    detour_type = Column(String, nullable=False)  # food / event / souvenir
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    lat = Column(Float, nullable=False)
    lng = Column(Float, nullable=False)
    distance_km = Column(Float, nullable=False)
    duration_min = Column(Integer, nullable=False)
    rating = Column(Float, nullable=True)
    open_now = Column(Boolean, nullable=True)
    opening_hours = Column(Text, nullable=True)
    parking = Column(String, nullable=True)  # "あり" / "なし" / "不明"
    source = Column(String, nullable=False)  # google / hotpepper / connpass
    url = Column(String, nullable=True)
    photo_url = Column(String, nullable=True)
    chosen_at = Column(DateTime(timezone=True), server_default=func.now())
    note = Column(Text, nullable=True)
