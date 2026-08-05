from celery import Celery
from celery.schedules import schedule

from app.core.config import settings

celery_app = Celery(
    "bang",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
    include=["app.scanner.tasks"],
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
)

celery_app.conf.beat_schedule = {
    "scan-all-tickers": {
        "task": "app.scanner.tasks.run_ticker_scan",
        "schedule": schedule(run_every=settings.SCANNER_INTERVAL_SECONDS),
    },
    "deep-scan-top-movers": {
        "task": "app.scanner.tasks.run_deep_scan",
        "schedule": schedule(run_every=20.0),
    },
}
