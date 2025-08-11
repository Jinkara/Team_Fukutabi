from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from typing import List

from app.db.database import get_db
from app.db import models
from app.schemas.destination import DestinationCreate, DestinationRead

router = APIRouter(prefix="/destinations", tags=["destinations"])

@router.post("/", response_model=DestinationRead)
def create_destination(payload: DestinationCreate, db: Session = Depends(get_db)):
    obj = models.Destination(
        place_id=payload.placeId, name=payload.name, address=payload.address,
        lat=payload.lat, lng=payload.lng
    )
    db.add(obj)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        # 既に登録済みなら409を返す
        raise HTTPException(status_code=409, detail="Destination already exists (place_id)")
    db.refresh(obj)
    return DestinationRead(
        id=obj.id, placeId=obj.place_id, name=obj.name, address=obj.address, lat=obj.lat, lng=obj.lng
    )

@router.get("/", response_model=List[DestinationRead])
def list_destinations(
    db: Session = Depends(get_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
):
    rows = db.query(models.Destination).offset(skip).limit(limit).all()
    return [
        DestinationRead(id=r.id, placeId=r.place_id, name=r.name, address=r.address, lat=r.lat, lng=r.lng)
        for r in rows
    ]
