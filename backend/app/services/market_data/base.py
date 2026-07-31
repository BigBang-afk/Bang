"""Market-data provider abstraction.

Every real-market provider (Twelve Data, Finnhub, Polygon, Alpha Vantage) and
the Mock development provider implement this interface, so the rest of the
platform (candle engine, signal engine) never depends on a specific vendor.

Security note: provider API keys are read from server-side environment
variables only and must never be included in any object returned to the
frontend.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from collections.abc import AsyncIterator
from dataclasses import dataclass, field
from datetime import datetime, timezone
from decimal import Decimal


@dataclass(frozen=True)
class Tick:
    provider_symbol: str
    price: Decimal
    timestamp: datetime
    volume: Decimal = Decimal(0)
    received_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))


@dataclass(frozen=True)
class ProviderCandle:
    timestamp: datetime
    open: Decimal
    high: Decimal
    low: Decimal
    close: Decimal
    volume: Decimal = Decimal(0)


@dataclass
class ProviderCapabilities:
    """Describes what granularity/features a provider actually offers.

    supports_subsecond_ticks: whether the provider streams ticks with enough
    granularity (sub-second / near-real-time) to make 15s and 30s expiries
    meaningful. When False those expiries are disabled platform-wide for
    this provider, per platform rule.
    """

    supports_subsecond_ticks: bool
    min_reliable_expiry_seconds: int
    max_requests_per_minute: int
    supports_websocket: bool


@dataclass
class ProviderHealth:
    connected: bool = False
    last_tick_at: datetime | None = None
    latency_ms: float | None = None
    reconnect_count: int = 0
    is_delayed: bool = False
    last_error: str | None = None


class MarketDataProvider(ABC):
    """Abstract base for a real-market or mock data provider."""

    name: str
    capabilities: ProviderCapabilities

    def __init__(self) -> None:
        self.health = ProviderHealth()

    @abstractmethod
    async def connect(self) -> None: ...

    @abstractmethod
    async def disconnect(self) -> None: ...

    @abstractmethod
    async def get_historical_candles(
        self, provider_symbol: str, interval: str, output_size: int = 300
    ) -> list[ProviderCandle]:
        """Fetch historical OHLC candles via REST."""

    @abstractmethod
    def stream_ticks(self, provider_symbols: list[str]) -> AsyncIterator[Tick]:
        """Yield live ticks for the given symbols, with automatic reconnection."""

    def is_healthy(self, max_latency_ms: int) -> bool:
        if not self.health.connected:
            return False
        if self.health.latency_ms is not None and self.health.latency_ms > max_latency_ms:
            return False
        return not self.health.is_delayed
