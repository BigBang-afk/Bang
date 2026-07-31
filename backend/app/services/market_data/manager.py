"""Provider factory and failover manager.

Selects the configured provider and, if it becomes unhealthy (disconnected
or exceeding max latency), fails over to the Mock provider so the platform
keeps running in a clearly-labeled demo state rather than emitting signals
from stale data. Failing over to mock always keeps signals tagged
provider="mock" so real and simulated results are never mixed.
"""

from __future__ import annotations

from app.core.config import settings
from app.core.logging import get_logger
from app.services.market_data.base import MarketDataProvider
from app.services.market_data.mock import MockMarketDataProvider
from app.services.market_data.twelvedata import TwelveDataProvider
from app.services.market_data.unsupported import AlphaVantageProvider, FinnhubProvider, PolygonProvider

logger = get_logger(__name__)

_PROVIDER_FACTORY = {
    "twelvedata": TwelveDataProvider,
    "finnhub": FinnhubProvider,
    "polygon": PolygonProvider,
    "alphavantage": AlphaVantageProvider,
    "mock": MockMarketDataProvider,
}


def create_provider(name: str) -> MarketDataProvider:
    factory = _PROVIDER_FACTORY.get(name)
    if factory is None:
        raise ValueError(f"Unknown market data provider: {name}")
    return factory()


class MarketDataManager:
    """Holds the active provider and provides last-resort failover to mock."""

    def __init__(self) -> None:
        self.primary_name = settings.market_data_provider
        self.primary: MarketDataProvider = create_provider(self.primary_name)
        self.fallback: MarketDataProvider = MockMarketDataProvider() if self.primary_name != "mock" else self.primary
        self._active: MarketDataProvider = self.primary
        self._using_fallback = False

    @property
    def active(self) -> MarketDataProvider:
        return self._active

    @property
    def using_fallback(self) -> bool:
        return self._using_fallback

    async def start(self) -> None:
        try:
            await self.primary.connect()
            self._active = self.primary
            self._using_fallback = False
        except Exception as exc:  # noqa: BLE001 - provider connect failures are expected/recoverable
            logger.error("primary_provider_connect_failed", provider=self.primary_name, error=str(exc))
            await self._failover()

    async def _failover(self) -> None:
        if self._active is not self.fallback:
            logger.warning("market_data_failover_engaged", to="mock")
            if self.fallback is not self.primary:
                await self.fallback.connect()
            self._active = self.fallback
            self._using_fallback = True

    async def check_health(self) -> None:
        if self._active is not self.fallback and not self._active.is_healthy(settings.max_data_latency_ms):
            await self._failover()

    async def stop(self) -> None:
        await self.primary.disconnect()
        if self.fallback is not self.primary:
            await self.fallback.disconnect()


market_data_manager = MarketDataManager()
