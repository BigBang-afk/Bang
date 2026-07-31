"""Application configuration loaded from environment variables."""

from functools import lru_cache
from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Database
    database_url: str = Field(
        default="postgresql+asyncpg://quotex_signals:quotex_signals@localhost:5432/quotex_signals"
    )
    database_url_sync: str = Field(
        default="postgresql+psycopg2://quotex_signals:quotex_signals@localhost:5432/quotex_signals"
    )

    # Redis
    redis_url: str = Field(default="redis://localhost:6379/0")

    # Market data
    market_data_provider: Literal["twelvedata", "finnhub", "polygon", "alphavantage", "mock"] = "mock"
    twelve_data_api_key: str = ""
    finnhub_api_key: str = ""
    polygon_api_key: str = ""
    alpha_vantage_api_key: str = ""

    # Auth
    jwt_secret_key: str = "insecure-dev-secret-change-me"  # noqa: S105 - dev-only default, must be overridden in production
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 30

    # CORS
    cors_origins: str = "http://localhost:3000"

    # App
    app_env: Literal["development", "staging", "production"] = "development"
    log_level: str = "INFO"
    frontend_url: str = "http://localhost:3000"

    # Frontend public (unused by backend, kept for parity with .env.example)
    next_public_api_url: str = "http://localhost:8000"
    next_public_websocket_url: str = "ws://localhost:8000"

    # Signal engine
    signal_engine_enabled: bool = True
    default_timezone: str = "UTC"
    max_data_latency_ms: int = 3000
    signal_cooldown_seconds: int = 60

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def is_production(self) -> bool:
        return self.app_env == "production"


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
