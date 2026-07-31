"""Worker process entrypoint: runs market-data ingestion plus the
scheduled signal-lifecycle/result-checker/health-check jobs.

Started via `python -m app.worker.main` (see docker-compose.yml `worker`
service).
"""

from __future__ import annotations

import asyncio

from app.core.logging import configure_logging, get_logger
from app.services.market_data.manager import market_data_manager
from app.worker.ingestion import run_ingestion
from app.worker.scheduler import build_scheduler

configure_logging()
logger = get_logger(__name__)


async def main() -> None:
    logger.info("worker_starting")
    await market_data_manager.start()

    scheduler = build_scheduler()
    scheduler.start()

    try:
        while True:
            try:
                await run_ingestion()
            except Exception as exc:  # noqa: BLE001
                logger.error("ingestion_crashed_restarting", error=str(exc))
                await asyncio.sleep(5)
    finally:
        scheduler.shutdown(wait=False)
        await market_data_manager.stop()


if __name__ == "__main__":
    asyncio.run(main())
