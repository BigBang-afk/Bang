"""Momentum indicators: RSI, MACD, Stochastic."""

from __future__ import annotations

import numpy as np
import pandas as pd


def rsi(series: pd.Series, length: int = 14) -> pd.Series:
    delta = series.diff()
    gain = delta.clip(lower=0)
    loss = -delta.clip(upper=0)
    avg_gain = gain.ewm(alpha=1 / length, adjust=False).mean()
    avg_loss = loss.ewm(alpha=1 / length, adjust=False).mean()
    rs = avg_gain / avg_loss.replace(0, np.nan)
    return 100 - (100 / (1 + rs))


def macd(series: pd.Series, fast: int = 12, slow: int = 26, signal: int = 9) -> pd.DataFrame:
    ema_fast = series.ewm(span=fast, adjust=False).mean()
    ema_slow = series.ewm(span=slow, adjust=False).mean()
    macd_line = ema_fast - ema_slow
    signal_line = macd_line.ewm(span=signal, adjust=False).mean()
    histogram = macd_line - signal_line
    return pd.DataFrame({"macd": macd_line, "signal": signal_line, "histogram": histogram})


def stochastic(df: pd.DataFrame, k_length: int = 14, d_length: int = 3) -> pd.DataFrame:
    low_min = df["low"].rolling(k_length).min()
    high_max = df["high"].rolling(k_length).max()
    k = 100 * (df["close"] - low_min) / (high_max - low_min).replace(0, np.nan)
    d = k.rolling(d_length).mean()
    return pd.DataFrame({"k": k, "d": d})


def momentum_summary(df: pd.DataFrame) -> dict:
    last_rsi = df["rsi"].iloc[-1]
    last_macd_hist = df["macd_hist"].iloc[-1]
    prev_macd_hist = df["macd_hist"].iloc[-2] if len(df) > 1 else last_macd_hist
    return {
        "rsi": round(float(last_rsi), 2) if pd.notna(last_rsi) else None,
        "rsi_state": "overbought" if last_rsi >= 70 else "oversold" if last_rsi <= 30 else "neutral",
        "macd_histogram": round(float(last_macd_hist), 6) if pd.notna(last_macd_hist) else None,
        "macd_rising": bool(last_macd_hist > prev_macd_hist),
        "macd_bullish_cross": bool(prev_macd_hist < 0 <= last_macd_hist),
        "macd_bearish_cross": bool(prev_macd_hist > 0 >= last_macd_hist),
    }
