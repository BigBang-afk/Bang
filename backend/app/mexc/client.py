"""Async REST client for MEXC Spot (v3) and Futures/Contract (v1) public APIs.

Only public market-data endpoints are used by default (no auth required).
If a user connects an API key/secret (encrypted at rest, see core.security),
the same client can sign requests for private endpoints (account/orders).

NOTE: MEXC occasionally revises field names / paths. Endpoints below reflect
the documented v3 spot and v1 contract APIs as of this build. Centralizing
all HTTP calls here means a future API revision only requires editing this
file.
"""

from __future__ import annotations

import hashlib
import hmac
import time
from typing import Any, Optional
from urllib.parse import urlencode

import httpx
from tenacity import retry, stop_after_attempt, wait_exponential

from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)

SPOT_INTERVAL_MAP = {
    "1m": "1m",
    "3m": "3m",
    "5m": "5m",
    "15m": "15m",
    "30m": "30m",
    "1h": "60m",
    "4h": "4h",
    "1d": "1d",
    "1w": "1W",
    "1M": "1M",
}

FUTURES_INTERVAL_MAP = {
    "1m": "Min1",
    "3m": "Min3",
    "5m": "Min5",
    "15m": "Min15",
    "30m": "Min30",
    "1h": "Min60",
    "4h": "Hour4",
    "1d": "Day1",
    "1w": "Week1",
    "1M": "Month1",
}


class MexcClientError(RuntimeError):
    pass


class MexcClient:
    def __init__(self, api_key: str | None = None, api_secret: str | None = None) -> None:
        self.api_key = api_key or settings.MEXC_API_KEY
        self.api_secret = api_secret or settings.MEXC_API_SECRET
        self._spot = httpx.AsyncClient(base_url=settings.MEXC_SPOT_REST_URL, timeout=10)
        self._futures = httpx.AsyncClient(base_url=settings.MEXC_FUTURES_REST_URL, timeout=10)

    async def aclose(self) -> None:
        await self._spot.aclose()
        await self._futures.aclose()

    def _sign(self, params: dict[str, Any]) -> dict[str, Any]:
        params = {**params, "timestamp": int(time.time() * 1000)}
        query = urlencode(params)
        signature = hmac.new(self.api_secret.encode(), query.encode(), hashlib.sha256).hexdigest()
        params["signature"] = signature
        return params

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=0.5, max=4))
    async def _get(self, client: httpx.AsyncClient, path: str, params: dict | None = None, signed: bool = False):
        headers = {}
        params = params or {}
        if signed:
            params = self._sign(params)
            headers["X-MEXC-APIKEY"] = self.api_key
        resp = await client.get(path, params=params, headers=headers)
        if resp.status_code >= 400:
            logger.warning("mexc_request_failed", path=path, status=resp.status_code, body=resp.text[:300])
            raise MexcClientError(f"MEXC request failed: {resp.status_code} {resp.text[:200]}")
        return resp.json()

    # ---------------------------------------------------------------- SPOT
    async def spot_exchange_info(self) -> dict:
        return await self._get(self._spot, "/api/v3/exchangeInfo")

    async def spot_usdt_symbols(self) -> list[str]:
        info = await self.spot_exchange_info()
        symbols = []
        for s in info.get("symbols", []):
            if s.get("quoteAsset") == settings.QUOTE_ASSET and s.get("isSpotTradingAllowed", True):
                symbols.append(s["symbol"])
        return symbols

    async def spot_ticker_24hr(self, symbol: Optional[str] = None) -> list[dict] | dict:
        params = {"symbol": symbol} if symbol else {}
        return await self._get(self._spot, "/api/v3/ticker/24hr", params)

    async def spot_klines(self, symbol: str, interval: str = "15m", limit: int = 500) -> list[list]:
        params = {"symbol": symbol, "interval": SPOT_INTERVAL_MAP.get(interval, interval), "limit": limit}
        return await self._get(self._spot, "/api/v3/klines", params)

    async def spot_depth(self, symbol: str, limit: int = 100) -> dict:
        return await self._get(self._spot, "/api/v3/depth", {"symbol": symbol, "limit": limit})

    async def spot_trades(self, symbol: str, limit: int = 200) -> list[dict]:
        return await self._get(self._spot, "/api/v3/trades", {"symbol": symbol, "limit": limit})

    async def spot_avg_price(self, symbol: str) -> dict:
        return await self._get(self._spot, "/api/v3/avgPrice", {"symbol": symbol})

    # ----------------------------------------------------------- FUTURES
    async def futures_contract_detail(self) -> dict:
        return await self._get(self._futures, "/api/v1/contract/detail")

    async def futures_ticker(self, symbol: Optional[str] = None) -> dict:
        params = {"symbol": symbol} if symbol else {}
        return await self._get(self._futures, "/api/v1/contract/ticker", params)

    async def futures_klines(self, symbol: str, interval: str = "15m") -> dict:
        params = {"interval": FUTURES_INTERVAL_MAP.get(interval, interval)}
        return await self._get(self._futures, f"/api/v1/contract/kline/{symbol}", params)

    async def futures_depth(self, symbol: str) -> dict:
        return await self._get(self._futures, f"/api/v1/contract/depth/{symbol}")

    async def futures_deals(self, symbol: str) -> dict:
        return await self._get(self._futures, f"/api/v1/contract/deals/{symbol}")

    async def futures_funding_rate(self, symbol: str) -> dict:
        return await self._get(self._futures, f"/api/v1/contract/funding_rate/{symbol}")

    async def futures_funding_rate_history(self, symbol: str) -> dict:
        return await self._get(self._futures, "/api/v1/contract/funding_rate/history", {"symbol": symbol})

    async def futures_index_price(self, symbol: str) -> dict:
        return await self._get(self._futures, f"/api/v1/contract/index_price/{symbol}")

    async def futures_fair_price(self, symbol: str) -> dict:
        """Mark price."""
        return await self._get(self._futures, f"/api/v1/contract/fair_price/{symbol}")


_client_singleton: MexcClient | None = None


def get_mexc_client() -> MexcClient:
    global _client_singleton
    if _client_singleton is None:
        _client_singleton = MexcClient()
    return _client_singleton
