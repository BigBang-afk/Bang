from functools import lru_cache
from typing import List

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # App
    APP_NAME: str = "Bang Trading Platform"
    ENV: str = "development"
    DEBUG: bool = True
    API_V1_PREFIX: str = "/api/v1"

    # Security
    SECRET_KEY: str = "CHANGE_ME_IN_PRODUCTION"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24
    REFRESH_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7
    ALGORITHM: str = "HS256"
    ENCRYPTION_KEY: str = "CHANGE_ME_32_BYTE_FERNET_KEY_____"

    # CORS
    CORS_ORIGINS: List[str] = ["http://localhost:3000"]

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://bang:bang@localhost:5432/bang"
    SYNC_DATABASE_URL: str = "postgresql://bang:bang@localhost:5432/bang"

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # Celery
    CELERY_BROKER_URL: str = "redis://localhost:6379/1"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/2"

    # MEXC
    MEXC_SPOT_REST_URL: str = "https://api.mexc.com"
    MEXC_FUTURES_REST_URL: str = "https://contract.mexc.com"
    MEXC_SPOT_WS_URL: str = "wss://wbs.mexc.com/ws"
    MEXC_FUTURES_WS_URL: str = "wss://contract.mexc.com/ws"
    MEXC_API_KEY: str = ""
    MEXC_API_SECRET: str = ""

    # Scanner
    SCANNER_INTERVAL_SECONDS: int = 5
    QUOTE_ASSET: str = "USDT"

    # AI Assistant
    ANTHROPIC_API_KEY: str = ""

    # Alerts
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM: str = "alerts@bang.trade"
    TELEGRAM_BOT_TOKEN: str = ""
    DISCORD_WEBHOOK_URL: str = ""


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
