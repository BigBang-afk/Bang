"""APScheduler jobs: signal lifecycle ticking and provider health checks."""

from __future__ import annotations

from apscheduler.schedulers.asyncio import AsyncIOScheduler

from app.core.logging import get_logger
from app.db.session import AsyncSessionLocal
from app.services.market_data.manager import market_data_manager
from app.services.result_checker import run_lifecycle_tick

logger = get_logger(__name__)


async def _lifecycle_job() -> None:
    async with AsyncSessionLocal() as session:
        result = await run_lifecycle_tick(session)
        if any(result.values()):
            logger.info("lifecycle_tick", **result)


async def _health_check_job() -> None:
    await market_data_manager.check_health()


def build_scheduler() -> AsyncIOScheduler:
    scheduler = AsyncIOScheduler(timezone="UTC")
    scheduler.add_job(_lifecycle_job, "interval", seconds=1, id="signal_lifecycle_tick", max_instances=1)
    scheduler.add_job(_health_check_job, "interval", seconds=10, id="provider_health_check", max_instances=1)
    return scheduler
