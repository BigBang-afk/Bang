"""Mock development market-data provider.

Generates realistic simulated ticks via a bounded random walk so the whole
platform (candles, features, strategies, signals, countdown, results) can be
exercised end-to-end without a live API key. Mock data is always clearly
tagged with provider="mock" and must never be mixed with live results.
"""

from __future__ import annotations

import asyncio
import random
from collections.abc import AsyncIterator
from datetime import datetime, timedelta, timezone
from decimal import Decimal

from app.services.market_data.base import (
    MarketDataProvider,
    ProviderCandle,
    ProviderCapabilities,
    Tick,
)

_BASE_PRICES: dict[str, Decimal] = {
    "EUR/USD": Decimal("1.0850"),
    "GBP/USD": Decimal("1.2650"),
    "USD/JPY": Decimal("149.50"),
    "AUD/USD": Decimal("0.6550"),
    "USD/CAD": Decimal("1.3650"),
    "EUR/JPY": Decimal("162.20"),
    "GBP/JPY": Decimal("189.10"),
    "EUR/GBP": Decimal("0.8580"),
    "XAU/USD": Decimal("2380.00"),
    "BTC/USD": Decimal("64000.00"),
    "ETH/USD": Decimal("3400.00"),
}


class MockMarketDataProvider(MarketDataProvider):
    name = "mock"

    def __init__(self, tick_interval_seconds: float = 1.0) -> None:
        super().__init__()
        self.capabilities = ProviderCapabilities(
            supports_subsecond_ticks=True,
            min_reliable_expiry_seconds=15,
            max_requests_per_minute=10_000,
            supports_websocket=True,
        )
        self._tick_interval = tick_interval_seconds
        self._prices: dict[str, Decimal] = dict(_BASE_PRICES)
        self._running = False

    async def connect(self) -> None:
        self.health.connected = True
        self.health.latency_ms = 5.0
        self.health.last_tick_at = datetime.now(timezone.utc)
        self._running = True

    async def disconnect(self) -> None:
        self._running = False
        self.health.connected = False

    async def get_historical_candles(
        self, provider_symbol: str, interval: str, output_size: int = 300
    ) -> list[ProviderCandle]:
        seconds_per_bar = {"1m": 60, "5m": 300, "15m": 900}.get(interval, 60)
        base = self._prices.get(provider_symbol, Decimal("1.0000"))
        now = datetime.now(timezone.utc).replace(microsecond=0)
        candles: list[ProviderCandle] = []
        price = base
        rng = random.Random(hash(provider_symbol) & 0xFFFFFFFF)
        volatility = base * Decimal("0.0006")
        start = now - timedelta(seconds=seconds_per_bar * output_size)
        for i in range(output_size):
            ts = start + timedelta(seconds=seconds_per_bar * i)
            open_p = price
            drift = Decimal(str(rng.uniform(-1, 1))) * volatility
            close_p = max(open_p + drift, base * Decimal("0.5"))
            high_p = max(open_p, close_p) + abs(Decimal(str(rng.uniform(0, 0.4)))) * volatility
            low_p = min(open_p, close_p) - abs(Decimal(str(rng.uniform(0, 0.4)))) * volatility
            candles.append(
                ProviderCandle(
                    timestamp=ts,
                    open=open_p,
                    high=high_p,
                    low=low_p,
                    close=close_p,
                    volume=Decimal(str(rng.uniform(10, 500))),
                )
            )
            price = close_p
        self._prices[provider_symbol] = price
        return candles

    async def stream_ticks(self, provider_symbols: list[str]) -> AsyncIterator[Tick]:
        rng = random.Random()
        while self._running:
            for symbol in provider_symbols:
                base = self._prices.get(symbol, Decimal("1.0000"))
                volatility = base * Decimal("0.00015")
                move = Decimal(str(rng.uniform(-1, 1))) * volatility
                new_price = max(base + move, base * Decimal("0.2"))
                self._prices[symbol] = new_price
                now = datetime.now(timezone.utc)
                self.health.last_tick_at = now
                self.health.latency_ms = round(rng.uniform(2, 15), 2)
                yield Tick(provider_symbol=symbol, price=new_price, timestamp=now)
            await asyncio.sleep(self._tick_interval)
