"""Maintains persistent WebSocket connections to MEXC Spot + Futures streams
and republishes normalized messages onto Redis pub/sub channels so any
number of FastAPI worker processes / client connections can fan them out
without each opening their own upstream connection to MEXC.

Channels published:
  md:ticker:{symbol}        -> latest ticker (price, %change, volume)
  md:trade:{symbol}         -> latest trade tape entry
  md:depth:{symbol}         -> order book delta/snapshot
  md:funding:{symbol}       -> funding rate (futures)
  md:markprice:{symbol}     -> mark price (futures)
"""

from __future__ import annotations

import asyncio
import json
from typing import Iterable

import websockets

from app.core.config import settings
from app.core.logging import get_logger
from app.core.redis import cache_publish

logger = get_logger(__name__)

SPOT_WS_CHUNK = 25  # MEXC limits number of subscriptions per connection


class MexcSpotStreamer:
    def __init__(self, symbols: Iterable[str]) -> None:
        self.symbols = list(symbols)
        self._stop = False

    def stop(self) -> None:
        self._stop = True

    async def run(self) -> None:
        chunks = [self.symbols[i : i + SPOT_WS_CHUNK] for i in range(0, len(self.symbols), SPOT_WS_CHUNK)]
        await asyncio.gather(*(self._run_chunk(chunk) for chunk in chunks))

    async def _run_chunk(self, symbols: list[str]) -> None:
        backoff = 1
        while not self._stop:
            try:
                async with websockets.connect(settings.MEXC_SPOT_WS_URL, ping_interval=20) as ws:
                    params = []
                    for sym in symbols:
                        params.append(f"spot@public.deals.v3.api@{sym}")
                        params.append(f"spot@public.bookTicker.v3.api@{sym}")
                    await ws.send(json.dumps({"method": "SUBSCRIPTION", "params": params}))
                    backoff = 1
                    async for raw in ws:
                        await self._handle_message(raw)
            except (websockets.exceptions.WebSocketException, OSError) as exc:
                logger.warning("spot_ws_reconnect", error=str(exc), backoff=backoff)
                await asyncio.sleep(backoff)
                backoff = min(backoff * 2, 30)

    async def _handle_message(self, raw: str | bytes) -> None:
        try:
            msg = json.loads(raw)
        except (ValueError, TypeError):
            return
        channel = msg.get("c", "")
        if "deals" in channel:
            symbol = channel.split("@")[-1]
            await cache_publish(f"md:trade:{symbol}", msg.get("d"))
        elif "bookTicker" in channel:
            symbol = channel.split("@")[-1]
            await cache_publish(f"md:ticker:{symbol}", msg.get("d"))


class MexcFuturesStreamer:
    def __init__(self, symbols: Iterable[str]) -> None:
        self.symbols = list(symbols)
        self._stop = False

    def stop(self) -> None:
        self._stop = True

    async def run(self) -> None:
        backoff = 1
        while not self._stop:
            try:
                async with websockets.connect(settings.MEXC_FUTURES_WS_URL, ping_interval=20) as ws:
                    for sym in self.symbols:
                        for method in ("sub.ticker", "sub.funding.rate", "sub.deal"):
                            await ws.send(json.dumps({"method": method, "param": {"symbol": sym}}))
                    backoff = 1
                    async for raw in ws:
                        await self._handle_message(raw)
            except (websockets.exceptions.WebSocketException, OSError) as exc:
                logger.warning("futures_ws_reconnect", error=str(exc), backoff=backoff)
                await asyncio.sleep(backoff)
                backoff = min(backoff * 2, 30)

    async def _handle_message(self, raw: str | bytes) -> None:
        try:
            msg = json.loads(raw)
        except (ValueError, TypeError):
            return
        channel = msg.get("channel", "")
        data = msg.get("data")
        symbol = data.get("symbol") if isinstance(data, dict) else None
        if not symbol:
            return
        if channel == "push.ticker":
            await cache_publish(f"md:ticker:{symbol}", data)
        elif channel == "push.deal":
            await cache_publish(f"md:trade:{symbol}", data)
        elif channel == "push.funding.rate":
            await cache_publish(f"md:funding:{symbol}", data)
