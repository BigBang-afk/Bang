import asyncio

from app.celery_app import celery_app
from app.core.logging import get_logger
from app.core.redis import cache_publish
from app.scanner.service import deep_scan_top_movers, scan_all_tickers

logger = get_logger(__name__)


def _run(coro):
    loop = asyncio.new_event_loop()
    try:
        return loop.run_until_complete(coro)
    finally:
        loop.close()


@celery_app.task(name="app.scanner.tasks.run_ticker_scan")
def run_ticker_scan() -> int:
    ranked = _run(scan_all_tickers())
    _run(cache_publish("scanner:update", {"type": "tickers", "count": len(ranked)}))
    logger.info("ticker_scan_complete", count=len(ranked))
    return len(ranked)


@celery_app.task(name="app.scanner.tasks.run_deep_scan")
def run_deep_scan() -> int:
    signals = _run(deep_scan_top_movers())
    _run(cache_publish("scanner:update", {"type": "signals", "count": len(signals)}))
    logger.info("deep_scan_complete", signals=len(signals))
    return len(signals)
