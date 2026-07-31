"""Twelve Data market-data provider implementation.

REST is used for historical candles, WebSocket for live quotes. Implements
automatic reconnection with exponential backoff, basic rate-limit spacing,
duplicate-tick suppression and latency/health tracking.

Docs: https://twelvedata.com/docs
"""

from __future__ import annotations

import asyncio
from collections.abc import AsyncIterator
from datetime import datetime, timezone
from decimal import Decimal, InvalidOperation

import httpx
import orjson
import websockets
from websockets.exceptions import ConnectionClosed

from app.core.config import settings
from app.core.logging import get_logger
from app.services.market_data.base import (
    MarketDataProvider,
    ProviderCandle,
    ProviderCapabilities,
    Tick,
)

logger = get_logger(__name__)

REST_BASE_URL = "https://api.twelvedata.com"
WS_URL = "wss://ws.twelvedata.com/v1/quotes/price"

_INTERVAL_MAP = {"1m": "1min", "5m": "5min", "15m": "15min"}


class TwelveDataProvider(MarketDataProvider):
    name = "twelvedata"

    def __init__(self, api_key: str | None = None) -> None:
        super().__init__()
        self.api_key = api_key or settings.twelve_data_api_key
        # Twelve Data's free/basic tiers deliver quote updates, not raw
        # sub-second tick prints, so 15s/30s expiries are not considered
        # reliable on this provider by default.
        self.capabilities = ProviderCapabilities(
            supports_subsecond_ticks=False,
            min_reliable_expiry_seconds=60,
            max_requests_per_minute=55,
            supports_websocket=True,
        )
        self._client: httpx.AsyncClient | None = None
        self._ws = None
        self._seen_ticks: dict[str, datetime] = {}
        self._max_backoff = 60.0

    async def connect(self) -> None:
        if not self.api_key:
            raise RuntimeError("TWELVE_DATA_API_KEY is not configured")
        self._client = httpx.AsyncClient(base_url=REST_BASE_URL, timeout=10.0)
        self.health.connected = True

    async def disconnect(self) -> None:
        if self._client:
            await self._client.aclose()
        if self._ws:
            await self._ws.close()
        self.health.connected = False

    async def get_historical_candles(
        self, provider_symbol: str, interval: str, output_size: int = 300
    ) -> list[ProviderCandle]:
        assert self._client is not None, "call connect() first"
        td_interval = _INTERVAL_MAP.get(interval, "1min")
        params = {
            "symbol": provider_symbol,
            "interval": td_interval,
            "outputsize": str(output_size),
            "apikey": self.api_key,
            "order": "ASC",
            "timezone": "UTC",
        }
        response = await self._client.get("/time_series", params=params)
        response.raise_for_status()
        payload = response.json()
        if payload.get("status") == "error":
            raise RuntimeError(f"Twelve Data error: {payload.get('message')}")

        candles: list[ProviderCandle] = []
        for row in payload.get("values", []):
            ts = datetime.strptime(row["datetime"], "%Y-%m-%d %H:%M:%S").replace(tzinfo=timezone.utc)
            candles.append(
                ProviderCandle(
                    timestamp=ts,
                    open=Decimal(row["open"]),
                    high=Decimal(row["high"]),
                    low=Decimal(row["low"]),
                    close=Decimal(row["close"]),
                    volume=Decimal(row.get("volume") or "0"),
                )
            )
        return candles

    async def stream_ticks(self, provider_symbols: list[str]) -> AsyncIterator[Tick]:
        backoff = 1.0
        symbols_param = ",".join(provider_symbols)
        url = f"{WS_URL}?apikey={self.api_key}"

        while True:
            try:
                async with websockets.connect(url, ping_interval=15, ping_timeout=10) as ws:
                    self._ws = ws
                    self.health.connected = True
                    backoff = 1.0
                    await ws.send(orjson.dumps({"action": "subscribe", "params": {"symbols": symbols_param}}).decode())

                    async for raw in ws:
                        message = orjson.loads(raw)
                        tick = self._parse_tick(message)
                        if tick is None:
                            continue
                        if self._is_duplicate(tick):
                            continue
                        received_at = datetime.now(timezone.utc)
                        self.health.latency_ms = max(0.0, (received_at - tick.timestamp).total_seconds() * 1000)
                        self.health.last_tick_at = received_at
                        self.health.is_delayed = self.health.latency_ms > settings.max_data_latency_ms
                        yield tick
            except (ConnectionClosed, OSError, asyncio.TimeoutError) as exc:
                self.health.connected = False
                self.health.reconnect_count += 1
                self.health.last_error = str(exc)
                logger.warning("twelvedata_ws_disconnected", error=str(exc), backoff=backoff)
                await asyncio.sleep(backoff)
                backoff = min(backoff * 2, self._max_backoff)
                continue

    def _parse_tick(self, message: dict) -> Tick | None:
        if message.get("event") != "price":
            return None
        try:
            price = Decimal(str(message["price"]))
        except (KeyError, InvalidOperation):
            return None
        symbol = message.get("symbol")
        if not symbol:
            return None
        ts_raw = message.get("timestamp")
        timestamp = datetime.fromtimestamp(ts_raw, tz=timezone.utc) if ts_raw else datetime.now(timezone.utc)
        return Tick(provider_symbol=symbol, price=price, timestamp=timestamp)

    def _is_duplicate(self, tick: Tick) -> bool:
        last_seen = self._seen_ticks.get(tick.provider_symbol)
        if last_seen is not None and last_seen == tick.timestamp:
            return True
        self._seen_ticks[tick.provider_symbol] = tick.timestamp
        return False
