from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes.destinations import router as destinations_router
from app.routes.detours import router as detours_router   # ← 追加

from app.db.database import engine
from app.db.models import Base

app = FastAPI(title="SerendiGo API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000", "http://0.0.0.0:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ★ 起動時に一度だけテーブル作成（SQLiteのMVPならこれでOK）
@app.on_event("startup")
def on_startup():
    Base.metadata.create_all(bind=engine)

# ルーター登録
app.include_router(destinations_router)
app.include_router(detours_router, prefix="/detours", tags=["detours"])  # ← 追加

@app.get("/health")
def health():
    return {"status": "ok"}
