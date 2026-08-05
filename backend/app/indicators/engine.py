"""Analysis engine orchestrator: runs the full indicator + market-structure
suite over an OHLCV dataframe and returns a single structured result used by
both the signal engine and the API layer (charts/markets endpoints)."""

from __future__ import annotations

import pandas as pd

from app.indicators import momentum, patterns, pivots, structure, trend, volatility, volume


def build_dataframe(klines: list[list]) -> pd.DataFrame:
    """klines: MEXC spot kline rows
    [openTime, open, high, low, close, volume, closeTime, quoteVolume, ...]
    """
    cols = ["open_time", "open", "high", "low", "close", "volume", "close_time", "quote_volume"]
    trimmed = [row[: len(cols)] for row in klines]
    df = pd.DataFrame(trimmed, columns=cols[: len(trimmed[0])] if trimmed else cols)
    for col in ("open", "high", "low", "close", "volume"):
        df[col] = df[col].astype(float)
    return df


def analyze(df: pd.DataFrame) -> dict:
    if len(df) < 60:
        raise ValueError("Not enough candles for analysis (need >= 60)")

    df = df.copy()
    df = trend.add_ema_stack(df)
    df["atr"] = trend.atr(df)
    adx_df = trend.adx(df)
    df["adx"] = adx_df["adx"]
    st_df = trend.supertrend(df)
    df["supertrend"] = st_df["supertrend"]
    df["supertrend_dir"] = st_df["trend"]

    df["rsi"] = momentum.rsi(df["close"])
    macd_df = momentum.macd(df["close"])
    df["macd"] = macd_df["macd"]
    df["macd_signal"] = macd_df["signal"]
    df["macd_hist"] = macd_df["histogram"]

    bb = volatility.bollinger_bands(df["close"])
    kc = volatility.keltner_channels(df)
    dc = volatility.donchian_channels(df)
    df["vwap"] = volume.vwap(df)
    df["cvd"] = volume.cumulative_volume_delta(df)

    last = df.iloc[-1]

    result = {
        "price": round(float(last["close"]), 8),
        "trend": trend.trend_summary(df),
        "momentum": momentum.momentum_summary(df),
        "volatility": {
            "atr": round(float(last["atr"]), 8) if pd.notna(last["atr"]) else None,
            "adx": round(float(last["adx"]), 2) if pd.notna(last["adx"]) else None,
            "bollinger": {k: round(float(v.iloc[-1]), 8) for k, v in bb.items() if pd.notna(v.iloc[-1])},
            "keltner": {k: round(float(v.iloc[-1]), 8) for k, v in kc.items() if pd.notna(v.iloc[-1])},
            "donchian": {k: round(float(v.iloc[-1]), 8) for k, v in dc.items() if pd.notna(v.iloc[-1])},
            "regime": volatility.volatility_regime(df),
            "squeeze": bool(bb["bb_upper"].iloc[-1] < kc["kc_upper"].iloc[-1] and bb["bb_lower"].iloc[-1] > kc["kc_lower"].iloc[-1])
            if pd.notna(bb["bb_upper"].iloc[-1]) and pd.notna(kc["kc_upper"].iloc[-1])
            else False,
        },
        "volume": {
            "vwap": round(float(last["vwap"]), 8) if pd.notna(last["vwap"]) else None,
            "price_above_vwap": bool(last["close"] > last["vwap"]) if pd.notna(last["vwap"]) else None,
            "cvd": round(float(last["cvd"]), 4) if pd.notna(last["cvd"]) else None,
            "cvd_rising": bool(df["cvd"].iloc[-1] > df["cvd"].iloc[-5]) if len(df) > 5 else None,
            "volume_profile": volume.volume_profile(df.tail(150)),
            "current_volume_vs_avg": round(float(last["volume"] / df["volume"].tail(20).mean()), 2)
            if df["volume"].tail(20).mean() > 0
            else None,
        },
        "supertrend": {
            "value": round(float(last["supertrend"]), 8) if pd.notna(last["supertrend"]) else None,
            "direction": "bullish" if last["supertrend_dir"] == 1 else "bearish",
        },
        "structure": structure.structure_summary(df),
        "pivots": pivots.daily_pivots_from_klines(df),
        "patterns": patterns.detect_patterns(df),
        "ema": {f"ema_{n}": round(float(last[f"ema_{n}"]), 8) for n in (9, 20, 50, 100, 200) if pd.notna(last[f"ema_{n}"])},
    }
    return result
