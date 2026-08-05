from fastapi import APIRouter, HTTPException

from app.indicators import momentum, trend, volatility, volume
from app.indicators.engine import build_dataframe
from app.mexc.client import MexcClientError, get_mexc_client

router = APIRouter(prefix="/charts", tags=["charts"])


def _series(df, col) -> list[dict]:
    return [
        {"time": int(t / 1000), "value": round(float(v), 8)}
        for t, v in zip(df["open_time"], df[col])
        if v == v  # filter NaN
    ]


@router.get("/candles")
async def candles(symbol: str, interval: str = "15m", limit: int = 500, market: str = "spot"):
    if market != "spot":
        raise HTTPException(status_code=400, detail="Use /markets/klines for raw futures kline payloads")

    client = get_mexc_client()
    try:
        raw = await client.spot_klines(symbol, interval, limit)
    except MexcClientError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    if len(raw) < 5:
        raise HTTPException(status_code=400, detail="Not enough candle data")

    df = build_dataframe(raw)
    candles_out = [
        {
            "time": int(t / 1000),
            "open": round(o, 8),
            "high": round(h, 8),
            "low": round(l, 8),
            "close": round(c, 8),
            "volume": round(v, 4),
        }
        for t, o, h, l, c, v in zip(df["open_time"], df["open"], df["high"], df["low"], df["close"], df["volume"])
    ]

    df = trend.add_ema_stack(df)
    df["rsi"] = momentum.rsi(df["close"])
    macd_df = momentum.macd(df["close"])
    df["macd"] = macd_df["macd"]
    df["macd_signal"] = macd_df["signal"]
    df["macd_hist"] = macd_df["histogram"]
    bb = volatility.bollinger_bands(df["close"])
    df["bb_upper"], df["bb_mid"], df["bb_lower"] = bb["bb_upper"], bb["bb_mid"], bb["bb_lower"]
    df["vwap"] = volume.vwap(df)

    overlays = {
        "ema_9": _series(df, "ema_9"),
        "ema_20": _series(df, "ema_20"),
        "ema_50": _series(df, "ema_50"),
        "ema_200": _series(df, "ema_200"),
        "vwap": _series(df, "vwap"),
        "bb_upper": _series(df, "bb_upper"),
        "bb_mid": _series(df, "bb_mid"),
        "bb_lower": _series(df, "bb_lower"),
    }
    indicators = {
        "rsi": _series(df, "rsi"),
        "macd": _series(df, "macd"),
        "macd_signal": _series(df, "macd_signal"),
        "macd_hist": _series(df, "macd_hist"),
    }

    return {"symbol": symbol, "interval": interval, "candles": candles_out, "overlays": overlays, "indicators": indicators}
