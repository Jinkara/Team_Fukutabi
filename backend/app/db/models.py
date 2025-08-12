from sqlalchemy.orm import declarative_base, Mapped, mapped_column, relationship
from sqlalchemy import String, Float, DateTime, func, UniqueConstraint, ForeignKey, Text
import uuid, datetime as dt


Base = declarative_base()

class Destination(Base):
    __tablename__ = "destinations"
    __table_args__ = (UniqueConstraint("place_id", name="uq_dest_place_id"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    place_id: Mapped[str] = mapped_column(String(128), index=True)
    name: Mapped[str] = mapped_column(String(256))
    address: Mapped[str] = mapped_column(String(512))
    lat: Mapped[float] = mapped_column(Float)
    lng: Mapped[float] = mapped_column(Float)
    created_at: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    # Guides へのリレーション（1:N）
    guides: Mapped[list["Guide"]] = relationship(
        "Guide", back_populates="destination", cascade="all, delete-orphan"
    )

class VisitHistory(Base):
    __tablename__ = "visit_histories"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    # ユーザー未ログインでも使えるよう nullable True
    user_id: Mapped[str | None] = mapped_column(String(36), nullable=True, index=True)
    destination_id: Mapped[str] = mapped_column(String(36), ForeignKey("destinations.id"), index=True, nullable=False)
    created_at: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    destination = relationship("Destination", back_populates="visits")
    guides: Mapped[list["Guide"]] = relationship("Guide", back_populates="visit", cascade="all, delete-orphan")

# Destination にリレーションを追加（クラス内に追記）
# guides は既にある想定。無ければ合わせて追加してください
Destination.visits = relationship("VisitHistory", back_populates="destination", cascade="all, delete-orphan")


class Guide(Base):
    __tablename__ = "guides"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    destination_id: Mapped[str] = mapped_column(String(36), ForeignKey("destinations.id"), index=True, nullable=False)
    visit_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("visit_histories.id"), index=True, nullable=True)
    guide_text: Mapped[str] = mapped_column(Text, nullable=False)
    voice: Mapped[str | None] = mapped_column(String(64), nullable=True)
    style: Mapped[str | None] = mapped_column(String(64), nullable=True)
    audio_url: Mapped[str] = mapped_column(String(512), nullable=False)
    created_at: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    
    # Destination テーブルとのリレーション
    destination = relationship("Destination", back_populates="guides")
    visit = relationship("VisitHistory", back_populates="guides")