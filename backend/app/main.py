from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes.destinations import router as destinations_router
from app.db.database import engine
from app.db.models import Base

app = FastAPI(title="SerendiGo API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

Base.metadata.create_all(bind=engine)  # ★ 初回にSQLiteへテーブル作成

app.include_router(destinations_router)

@app.get("/health")
def health():
    return {"status": "ok"}