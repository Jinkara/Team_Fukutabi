# app/main.py
from dotenv import load_dotenv
load_dotenv()

import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.routes.destinations import router as destinations_router
from app.routes.detours import router as detours_router   # ← 追加

from app.db.database import engine
from app.db.models import Base

# ルーターは import だけ先にしてOK
from app.routes.places import router as places_router
from app.routes.destinations import router as destinations_router
from app.routes.visits import router as visits_router
# guides ルーターを作っている場合は↓のコメントを外す
# from app.routes.guides import router as guides_router

# 1) まず app を作る（これより前に include_router を呼ばない）
app = FastAPI(title="SerendiGo API")

# 2) CORS 設定
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000", "http://0.0.0.0:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 3) DBテーブル作成（SQLiteの開発用）
Base.metadata.create_all(bind=engine)

# 4) メディア配信（TTSのmp3 / フォールバックのtxt を返す用）
app.mount("/media", StaticFiles(directory=os.getenv("MEDIA_ROOT", "./media")), name="media")

# 5) ルーター登録（順不同だがここでまとめて）
app.include_router(places_router)
app.include_router(destinations_router)
app.include_router(visits_router)
# guides を作っていれば有効化
# app.include_router(guides_router)
# 任意のヘルスチェック
# @app.get("/health")
# def health():
#     return {"status": "ok"}
# # ★ 起動時に一度だけテーブル作成（SQLiteのMVPならこれでOK）
@app.on_event("startup")
def on_startup():
    Base.metadata.create_all(bind=engine)

# ルーター登録
app.include_router(destinations_router)
app.include_router(detours_router, prefix="/detours", tags=["detours"])  # ← 追加


