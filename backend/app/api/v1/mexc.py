from fastapi import APIRouter, Depends, HTTPException

from app.api.deps import get_current_user, get_user_mexc_client
from app.db.models.user import User
from app.services.mexc_client import MexcApiError, MexcClient

router = APIRouter(prefix="/mexc", tags=["mexc"])


@router.get("/account")
async def account(client: MexcClient = Depends(get_user_mexc_client), _: User = Depends(get_current_user)):
    try:
        return await client.get_account_info()
    except MexcApiError as e:
        raise HTTPException(status_code=502, detail=e.message)
    finally:
        await client.aclose()


@router.get("/orders/open")
async def open_orders(symbol: str | None = None, client: MexcClient = Depends(get_user_mexc_client), _: User = Depends(get_current_user)):
    try:
        return await client.get_open_orders(symbol)
    except MexcApiError as e:
        raise HTTPException(status_code=502, detail=e.message)
    finally:
        await client.aclose()


@router.get("/orders/history")
async def order_history(symbol: str, limit: int = 100, client: MexcClient = Depends(get_user_mexc_client), _: User = Depends(get_current_user)):
    try:
        return await client.get_order_history(symbol, limit)
    except MexcApiError as e:
        raise HTTPException(status_code=502, detail=e.message)
    finally:
        await client.aclose()


@router.get("/trades")
async def my_trades(symbol: str, limit: int = 100, client: MexcClient = Depends(get_user_mexc_client), _: User = Depends(get_current_user)):
    try:
        return await client.get_my_trades(symbol, limit)
    except MexcApiError as e:
        raise HTTPException(status_code=502, detail=e.message)
    finally:
        await client.aclose()


@router.get("/positions")
async def positions(client: MexcClient = Depends(get_user_mexc_client), _: User = Depends(get_current_user)):
    try:
        return await client.get_futures_positions()
    except MexcApiError as e:
        raise HTTPException(status_code=502, detail=e.message)
    finally:
        await client.aclose()


@router.get("/ticker/{symbol}")
async def ticker(symbol: str):
    client = MexcClient()
    try:
        return await client.get_ticker_price(symbol)
    except MexcApiError as e:
        raise HTTPException(status_code=502, detail=e.message)
    finally:
        await client.aclose()


@router.get("/klines/{symbol}")
async def klines(symbol: str, interval: str = "15m", limit: int = 300):
    client = MexcClient()
    try:
        return await client.get_klines(symbol, interval, limit)
    except MexcApiError as e:
        raise HTTPException(status_code=502, detail=e.message)
    finally:
        await client.aclose()


@router.get("/depth/{symbol}")
async def depth(symbol: str, limit: int = 50):
    client = MexcClient()
    try:
        return await client.get_order_book(symbol, limit)
    except MexcApiError as e:
        raise HTTPException(status_code=502, detail=e.message)
    finally:
        await client.aclose()


@router.post("/orders")
async def place_order(
    symbol: str,
    side: str,
    order_type: str,
    quantity: float,
    price: float | None = None,
    client: MexcClient = Depends(get_user_mexc_client),
    user: User = Depends(get_current_user),
):
    try:
        return await client.place_order(symbol, side, order_type, quantity, price)
    except MexcApiError as e:
        raise HTTPException(status_code=502, detail=e.message)
    finally:
        await client.aclose()


@router.delete("/orders/{symbol}/{order_id}")
async def cancel_order(symbol: str, order_id: str, client: MexcClient = Depends(get_user_mexc_client), _: User = Depends(get_current_user)):
    try:
        return await client.cancel_order(symbol, order_id)
    except MexcApiError as e:
        raise HTTPException(status_code=502, detail=e.message)
    finally:
        await client.aclose()
