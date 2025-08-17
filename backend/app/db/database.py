from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import declarative_base
from pydantic_settings import BaseSettings
import os

class Settings(BaseSettings):
    # Azure MySQL 接続設定
    MYSQL_USER: str = os.getenv("MYSQL_USER", "<USERNAME>@<SERVER_NAME>")
    MYSQL_PASSWORD: str = os.getenv("MYSQL_PASSWORD", "<PASSWORD>")
    MYSQL_HOST: str = os.getenv("MYSQL_HOST", "<SERVER_NAME>.mysql.database.azure.com")
    MYSQL_DATABASE: str = os.getenv("MYSQL_DATABASE", "<DBNAME>")
    MYSQL_SSL_CA: str = os.getenv("MYSQL_SSL_CA", "./DigiCertGlobalRootCA.pem")  # 証明書パス

    @property
    def DATABASE_URL(self) -> str:
        # Azure MySQL 用の非同期接続文字列
        return (
            f"mysql+aiomysql://{self.MYSQL_USER}:{self.MYSQL_PASSWORD}"
            f"@{self.MYSQL_HOST}/{self.MYSQL_DATABASE}"
            f"?charset=utf8mb4&ssl_ca={self.MYSQL_SSL_CA}"
        )

settings = Settings()

# 非同期エンジン
engine = create_async_engine(settings.DATABASE_URL, echo=False, future=True)

# セッション
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)

# モデルの基底クラス
Base = declarative_base()

# DB 初期化関数
async def init_db():
    from app.db import models  # モデルを必ず import
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

# セッション取得依存関数
async def get_db():
    async with AsyncSessionLocal() as session:
        yield session
