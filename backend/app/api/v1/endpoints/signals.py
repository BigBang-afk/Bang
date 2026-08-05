from fastapi import APIRouter, HTTPException

from app.core.redis import cache_get_json
from app.indicators.engine import analyze, build_dataframe
from app.mexc.client import MexcClientError, get_mexc_client
from app.scanner.service import SIGNALS_CACHE_KEY
from app.signals.generator import generate_signal

router = APIRouter(prefix="/signals", tags=["signals"])


@router.get("")
async def list_signals():
    data = await cache_get_json(SIGNALS_CACHE_KEY) or []
    return {"count": len(data), "results": data}


@router.get("/{symbol}")
async def signal_for_symbol(symbol: str, timeframe: str = "15m"):
    client = get_mexc_client()
    try:
        klines = await client.spot_klines(symbol, interval=timeframe, limit=200)
        if len(klines) < 60:
            raise HTTPException(status_code=400, detail="Not enough historical data for this symbol")
        analysis = analyze(build_dataframe(klines))

        htf_klines = await client.spot_klines(symbol, interval="1h", limit=200)
        htf_analysis = analyze(build_dataframe(htf_klines)) if len(htf_klines) >= 60 else None
    except MexcClientError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    signal = generate_signal(symbol, timeframe, analysis, htf_analysis)
    return {"symbol": symbol, "analysis": analysis, "signal": signal}
