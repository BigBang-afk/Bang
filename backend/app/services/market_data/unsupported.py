"""Architecture-ready stubs for providers not yet implemented.

The platform's provider abstraction supports Twelve Data, Finnhub, Polygon
and Alpha Vantage by design (see base.MarketDataProvider), but only Twelve
Data and the Mock provider ship with a working implementation today. These
stubs let the factory/admin UI reference the other vendors without
fabricating incorrect endpoint behavior. Implementing one is a matter of
subclassing MarketDataProvider the same way TwelveDataProvider does.
"""

from __future__ import annotations

from collections.abc import AsyncIterator

from app.services.market_data.base import MarketDataProvider, ProviderCandle, ProviderCapabilities, Tick


class _NotImplementedProvider(MarketDataProvider):
    def __init__(self) -> None:
        super().__init__()
        self.capabilities = ProviderCapabilities(
            supports_subsecond_ticks=False,
            min_reliable_expiry_seconds=60,
            max_requests_per_minute=0,
            supports_websocket=False,
        )

    async def connect(self) -> None:
        raise NotImplementedError(f"{self.name} provider is not yet implemented")

    async def disconnect(self) -> None:
        return None

    async def get_historical_candles(
        self, provider_symbol: str, interval: str, output_size: int = 300
    ) -> list[ProviderCandle]:
        raise NotImplementedError(f"{self.name} provider is not yet implemented")

    async def stream_ticks(self, provider_symbols: list[str]) -> AsyncIterator[Tick]:
        raise NotImplementedError(f"{self.name} provider is not yet implemented")
        yield  # pragma: no cover - makes this an async generator


class FinnhubProvider(_NotImplementedProvider):
    name = "finnhub"


class PolygonProvider(_NotImplementedProvider):
    name = "polygon"


class AlphaVantageProvider(_NotImplementedProvider):
    name = "alphavantage"
