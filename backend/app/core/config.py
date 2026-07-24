from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    APP_NAME: str = "AI Crypto Signal Platform"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True

    # Security
    SECRET_KEY: str = "CHANGE_ME_IN_PRODUCTION"
    API_KEY_ENCRYPTION_KEY: str = "CHANGE_ME_32_BYTE_FERNET_KEY_BASE64"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    ALGORITHM: str = "HS256"

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/crypto_signals"
    REDIS_URL: str = "redis://localhost:6379/0"

    # MEXC
    MEXC_BASE_URL: str = "https://api.mexc.com"
    MEXC_FUTURES_BASE_URL: str = "https://contract.mexc.com"
    MEXC_WS_URL: str = "wss://wbs.mexc.com/ws"
    MEXC_FUTURES_WS_URL: str = "wss://contract.mexc.com/edge"

    # Rate limiting
    RATE_LIMIT_PER_MINUTE: int = 120

    # Notifications
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    TELEGRAM_BOT_TOKEN: str = ""
    DISCORD_WEBHOOK_URL: str = ""

    # CORS
    CORS_ORIGINS: list[str] = ["http://localhost:3000"]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
