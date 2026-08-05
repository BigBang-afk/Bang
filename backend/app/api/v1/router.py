from fastapi import APIRouter

from app.api.v1.endpoints import (
    admin,
    alerts,
    assistant,
    auth,
    backtest,
    charts,
    journal,
    markets,
    performance,
    portfolio,
    risk,
    scanner,
    settings as settings_endpoint,
    signals,
    watchlist,
)

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(markets.router)
api_router.include_router(scanner.router)
api_router.include_router(signals.router)
api_router.include_router(charts.router)
api_router.include_router(watchlist.router)
api_router.include_router(journal.router)
api_router.include_router(performance.router)
api_router.include_router(portfolio.router)
api_router.include_router(risk.router)
api_router.include_router(backtest.router)
api_router.include_router(alerts.router)
api_router.include_router(assistant.router)
api_router.include_router(admin.router)
api_router.include_router(settings_endpoint.router)
