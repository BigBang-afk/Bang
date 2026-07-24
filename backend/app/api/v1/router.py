from fastapi import APIRouter

from app.api.v1 import admin, analytics, auth, journal, mexc, risk, settings, signals

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(auth.router)
api_router.include_router(settings.router)
api_router.include_router(mexc.router)
api_router.include_router(signals.router)
api_router.include_router(risk.router)
api_router.include_router(journal.router)
api_router.include_router(analytics.router)
api_router.include_router(admin.router)
