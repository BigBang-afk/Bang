"""Volatility indicators: Bollinger Bands, Keltner Channels, Donchian, ATR regime."""

from __future__ import annotations

import pandas as pd

from app.indicators.trend import atr


def bollinger_bands(series: pd.Series, length: int = 20, stddev: float = 2.0) -> pd.DataFrame:
    mid = series.rolling(length).mean()
    std = series.rolling(length).std()
    return pd.DataFrame({"bb_mid": mid, "bb_upper": mid + stddev * std, "bb_lower": mid - stddev * std})


def keltner_channels(df: pd.DataFrame, length: int = 20, multiplier: float = 2.0) -> pd.DataFrame:
    mid = df["close"].ewm(span=length, adjust=False).mean()
    atr_val = atr(df, length)
    return pd.DataFrame({"kc_mid": mid, "kc_upper": mid + multiplier * atr_val, "kc_lower": mid - multiplier * atr_val})


def donchian_channels(df: pd.DataFrame, length: int = 20) -> pd.DataFrame:
    upper = df["high"].rolling(length).max()
    lower = df["low"].rolling(length).min()
    return pd.DataFrame({"dc_upper": upper, "dc_lower": lower, "dc_mid": (upper + lower) / 2})


def volatility_regime(df: pd.DataFrame, atr_col: str = "atr", lookback: int = 100) -> dict:
    atr_series = df[atr_col].dropna()
    if len(atr_series) < 20:
        return {"regime": "unknown", "atr_percentile": None, "atr_expanding": False}
    window = atr_series.tail(lookback)
    percentile = float((window <= window.iloc[-1]).mean() * 100)
    expanding = bool(atr_series.iloc[-1] > atr_series.iloc[-5:-1].mean()) if len(atr_series) > 5 else False
    if percentile >= 75:
        regime = "high"
    elif percentile <= 25:
        regime = "low"
    else:
        regime = "normal"
    return {"regime": regime, "atr_percentile": round(percentile, 1), "atr_expanding": expanding}
