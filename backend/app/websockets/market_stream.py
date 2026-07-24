"""Background tasks that keep connected clients updated in real time:
 - price_stream_task: polls MEXC ticker prices for the scan universe and broadcasts them.
 - signal_scan_task: runs the market scanner on a fixed interval and broadcasts new signals.

Both are started from app.main's lifespan and cancelled cleanly on shutdown. A polling loop
is used rather than proxying MEXC's raw WebSocket 1:1, so the same broadcast logic works
whether the upstream feed is REST or WS, and so we can rate-limit/dedupe before fanning out.
"""
from __future__ import annotations

import asyncio
import logging

from app.services.mexc_client import MexcApiError, MexcClient
from app.services.scanner import scan_market
from app.websockets.manager import manager

logger = logging.getLogger(__name__)

SCAN_UNIVERSE = [
    "BTCUSDT", "ETHUSDT", "SOLUSDT", "BNBUSDT", "XRPUSDT",
    "DOGEUSDT", "ADAUSDT", "AVAXUSDT", "LINKUSDT", "TONUSDT",
]


async def price_stream_task(interval_seconds: int = 5):
    client = MexcClient()
    try:
        while True:
            for symbol in SCAN_UNIVERSE:
                try:
                    ticker = await client.get_ticker_price(symbol)
                    await manager.broadcast("prices", {"symbol": symbol, **ticker})
                except MexcApiError:
                    logger.debug("Price fetch failed for %s", symbol, exc_info=True)
            await asyncio.sleep(interval_seconds)
    except asyncio.CancelledError:
        pass
    finally:
        await client.aclose()


async def signal_scan_task(trading_mode: str = "intraday", interval_seconds: int = 300):
    client = MexcClient()
    try:
        while True:
            try:
                signals = await scan_market(client, SCAN_UNIVERSE, trading_mode)
                for signal in signals:
                    await manager.broadcast("signals", {
                        "symbol": signal.symbol,
                        "direction": signal.direction,
                        "confidence_score": signal.confidence_score,
                        "entry_price": signal.entry_price,
                        "stop_loss": signal.stop_loss,
                        "take_profit_1": signal.take_profit_1,
                        "reasons": signal.reasons,
                    })
            except Exception:
                logger.exception("Signal scan iteration failed")
            await asyncio.sleep(interval_seconds)
    except asyncio.CancelledError:
        pass
    finally:
        await client.aclose()
