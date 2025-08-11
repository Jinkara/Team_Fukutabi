# app/db/database.py
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
import os

# 後でMySQLに切替えるときは環境変数 DB_URL を差し替えればOK
DB_URL = os.getenv("DB_URL", "sqlite:///./serendigo.db")

engine = create_engine(DB_URL, future=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)

def get_db():
    """FastAPIのDepends用：DBセッションをyieldして最後にclose"""
    db: Session = SessionLocal()
    try:
        yield db
    finally:
        db.close()
