# app/models/user.py
from sqlalchemy import Column, Integer, String
from sqlalchemy.orm import relationship
from app.db.database import Base

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)

    # 任意：他モデルに合わせて
    # favorites = relationship("Favorite", back_populates="user", cascade="all, delete")
    # spots = relationship("Spot", back_populates="user", cascade="all, delete")
    # guide_sessions = relationship("GuideSession", back_populates="user", cascade="all, delete")
