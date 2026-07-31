"""FastAPI application entrypoint."""

from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1 import admin, assets, auth, backtests, health, signals, strategies
from app.core.config import settings
from app.core.logging import configure_logging, get_logger
from app.services.market_data.manager import market_data_manager
from app.ws import admin_health, countdown, market, system_time
from app.ws import signals as ws_signals

configure_logging()
logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("app_startup", env=settings.app_env, provider=settings.market_data_provider)
    await market_data_manager.start()
    yield
    await market_data_manager.stop()
    logger.info("app_shutdown")


app = FastAPI(
    title="Quotex Real Market AI Signals API",
    description=(
        "Independent market-analysis and signal platform. Signals are generated from an "
        "authorized independent market-data provider for manual execution on any trading "
        "platform. This service never places trades automatically and never claims "
        "guaranteed profits."
    ),
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def security_headers_middleware(request, call_next):
    response = await call_next(request)
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    if settings.is_production:
        response.headers["Strict-Transport-Security"] = "max-age=63072000; includeSubDomains"
    return response


API_PREFIX = "/api/v1"
app.include_router(health.router, prefix=API_PREFIX)
app.include_router(auth.router, prefix=API_PREFIX)
app.include_router(assets.router, prefix=API_PREFIX)
app.include_router(strategies.router, prefix=API_PREFIX)
app.include_router(signals.router, prefix=API_PREFIX)
app.include_router(backtests.router, prefix=API_PREFIX)
app.include_router(admin.router, prefix=API_PREFIX)

app.include_router(market.router)
app.include_router(ws_signals.router)
app.include_router(countdown.router)
app.include_router(system_time.router)
app.include_router(admin_health.router)
