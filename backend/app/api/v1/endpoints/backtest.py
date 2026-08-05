from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.backtest.engine import run_backtest
from app.indicators.engine import build_dataframe
from app.mexc.client import MexcClientError, get_mexc_client

router = APIRouter(prefix="/backtest", tags=["backtest"])


class BacktestRequest(BaseModel):
    symbol: str
    timeframe: str = "15m"
    lookback_candles: int = 1000
    initial_capital: float = 10_000.0


@router.post("/run")
async def run(payload: BacktestRequest):
    client = get_mexc_client()
    try:
        klines = await client.spot_klines(payload.symbol, payload.timeframe, min(payload.lookback_candles, 1000))
    except MexcClientError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    df = build_dataframe(klines)
    try:
        result = run_backtest(df, payload.symbol, payload.timeframe, payload.initial_capital)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return result
