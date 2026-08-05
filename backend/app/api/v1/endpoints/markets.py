from fastapi import APIRouter, HTTPException, Query

from app.mexc.client import MexcClientError, get_mexc_client

router = APIRouter(prefix="/markets", tags=["markets"])


@router.get("/symbols")
async def list_symbols():
    client = get_mexc_client()
    try:
        return {"symbols": await client.spot_usdt_symbols()}
    except MexcClientError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@router.get("/ticker")
async def ticker(symbol: str | None = Query(default=None), market: str = Query(default="spot")):
    client = get_mexc_client()
    try:
        if market == "futures":
            return await client.futures_ticker(symbol.replace("USDT", "_USDT") if symbol else None)
        return await client.spot_ticker_24hr(symbol)
    except MexcClientError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@router.get("/klines")
async def klines(symbol: str, interval: str = "15m", limit: int = 500, market: str = "spot"):
    client = get_mexc_client()
    try:
        if market == "futures":
            return await client.futures_klines(symbol, interval)
        return await client.spot_klines(symbol, interval, limit)
    except MexcClientError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@router.get("/depth")
async def depth(symbol: str, limit: int = 100, market: str = "spot"):
    client = get_mexc_client()
    try:
        if market == "futures":
            return await client.futures_depth(symbol)
        return await client.spot_depth(symbol, limit)
    except MexcClientError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@router.get("/trades")
async def trades(symbol: str, limit: int = 200, market: str = "spot"):
    client = get_mexc_client()
    try:
        if market == "futures":
            return await client.futures_deals(symbol)
        return await client.spot_trades(symbol, limit)
    except MexcClientError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@router.get("/funding-rate")
async def funding_rate(symbol: str):
    client = get_mexc_client()
    try:
        return await client.futures_funding_rate(symbol)
    except MexcClientError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@router.get("/mark-price")
async def mark_price(symbol: str):
    client = get_mexc_client()
    try:
        return await client.futures_fair_price(symbol)
    except MexcClientError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@router.get("/open-interest")
async def open_interest(symbol: str):
    client = get_mexc_client()
    try:
        data = await client.futures_ticker(symbol)
        d = data.get("data", data)
        return {"symbol": symbol, "open_interest": d.get("holdVol") if isinstance(d, dict) else None}
    except MexcClientError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
