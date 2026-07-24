"""Async MEXC REST client (Spot + Futures v3 signing scheme).

Spot API reference: https://mexcdevelop.github.io/apidocs/spot_v3_en/
Futures API reference: https://mexcdevelop.github.io/apidocs/contract_v1_en/

Signing: MEXC spot uses HMAC-SHA256 over the sorted query string, same pattern as Binance.
Futures uses a slightly different signing scheme (timestamp + params concatenation with the
secret). Both are implemented below behind one client so callers don't need to know which
market they're hitting.
"""
from __future__ import annotations

import hashlib
import hmac
import time
from typing import Any
from urllib.parse import urlencode

import httpx
from tenacity import retry, stop_after_attempt, wait_exponential

from app.core.config import settings


class MexcApiError(Exception):
    def __init__(self, status_code: int, message: str):
        self.status_code = status_code
        self.message = message
        super().__init__(f"MEXC API error {status_code}: {message}")


class MexcClient:
    def __init__(self, api_key: str | None = None, api_secret: str | None = None):
        self.api_key = api_key
        self.api_secret = api_secret
        self._client = httpx.AsyncClient(timeout=10.0)

    async def aclose(self):
        await self._client.aclose()

    # --- signing ---

    def _spot_signature(self, query_string: str) -> str:
        if not self.api_secret:
            raise ValueError("api_secret is required for signed requests")
        return hmac.new(self.api_secret.encode(), query_string.encode(), hashlib.sha256).hexdigest()

    def _headers(self) -> dict[str, str]:
        headers = {"Content-Type": "application/json"}
        if self.api_key:
            headers["X-MEXC-APIKEY"] = self.api_key
        return headers

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=0.5, min=0.5, max=4))
    async def _request(self, method: str, path: str, params: dict[str, Any] | None = None, signed: bool = False, futures: bool = False) -> Any:
        base_url = settings.MEXC_FUTURES_BASE_URL if futures else settings.MEXC_BASE_URL
        params = {k: v for k, v in (params or {}).items() if v is not None}

        if signed:
            params["timestamp"] = int(time.time() * 1000)
            params["recvWindow"] = params.get("recvWindow", 5000)
            query_string = urlencode(params)
            params["signature"] = self._spot_signature(query_string)

        response = await self._client.request(method, f"{base_url}{path}", params=params, headers=self._headers())
        if response.status_code >= 400:
            raise MexcApiError(response.status_code, response.text)
        return response.json()

    # --- public market data ---

    async def get_ticker_price(self, symbol: str) -> dict:
        return await self._request("GET", "/api/v3/ticker/price", {"symbol": symbol})

    async def get_klines(self, symbol: str, interval: str, limit: int = 500) -> list[list]:
        """interval e.g. 1m, 5m, 15m, 30m, 60m, 4h, 1d"""
        return await self._request("GET", "/api/v3/klines", {"symbol": symbol, "interval": interval, "limit": limit})

    async def get_order_book(self, symbol: str, limit: int = 100) -> dict:
        return await self._request("GET", "/api/v3/depth", {"symbol": symbol, "limit": limit})

    async def get_recent_trades(self, symbol: str, limit: int = 500) -> list[dict]:
        return await self._request("GET", "/api/v3/trades", {"symbol": symbol, "limit": limit})

    async def get_exchange_info(self) -> dict:
        return await self._request("GET", "/api/v3/exchangeInfo")

    async def get_funding_rate(self, symbol: str) -> dict:
        return await self._request("GET", "/api/v1/contract/funding_rate/" + symbol, futures=True)

    # --- account (signed) ---

    async def get_account_info(self) -> dict:
        return await self._request("GET", "/api/v3/account", signed=True)

    async def get_open_orders(self, symbol: str | None = None) -> list[dict]:
        return await self._request("GET", "/api/v3/openOrders", {"symbol": symbol}, signed=True)

    async def get_order_history(self, symbol: str, limit: int = 100) -> list[dict]:
        return await self._request("GET", "/api/v3/allOrders", {"symbol": symbol, "limit": limit}, signed=True)

    async def get_my_trades(self, symbol: str, limit: int = 100) -> list[dict]:
        return await self._request("GET", "/api/v3/myTrades", {"symbol": symbol, "limit": limit}, signed=True)

    # --- trading (signed) ---

    async def place_order(
        self,
        symbol: str,
        side: str,  # BUY | SELL
        order_type: str,  # LIMIT | MARKET
        quantity: float,
        price: float | None = None,
        time_in_force: str = "GTC",
    ) -> dict:
        params: dict[str, Any] = {
            "symbol": symbol,
            "side": side,
            "type": order_type,
            "quantity": quantity,
        }
        if order_type == "LIMIT":
            params["price"] = price
            params["timeInForce"] = time_in_force
        return await self._request("POST", "/api/v3/order", params, signed=True)

    async def cancel_order(self, symbol: str, order_id: str) -> dict:
        return await self._request("DELETE", "/api/v3/order", {"symbol": symbol, "orderId": order_id}, signed=True)

    async def modify_order(self, symbol: str, order_id: str, side: str, price: float, quantity: float) -> dict:
        """MEXC spot has no native order-modify; implemented as cancel + replace."""
        await self.cancel_order(symbol, order_id)
        return await self.place_order(symbol, side=side, order_type="LIMIT", quantity=quantity, price=price)

    async def get_futures_positions(self) -> list[dict]:
        return await self._request("GET", "/api/v1/private/position/open_positions", signed=True, futures=True)
