"""Technical indicator calculations operating on pandas DataFrames of OHLCV candles.

Expected input DataFrame columns: open, high, low, close, volume (indexed by time, ascending).
"""
from __future__ import annotations

import numpy as np
import pandas as pd


def ema(series: pd.Series, period: int) -> pd.Series:
    return series.ewm(span=period, adjust=False).mean()


def sma(series: pd.Series, period: int) -> pd.Series:
    return series.rolling(window=period).mean()


def rsi(series: pd.Series, period: int = 14) -> pd.Series:
    delta = series.diff()
    gain = delta.clip(lower=0)
    loss = -delta.clip(upper=0)
    avg_gain = gain.ewm(alpha=1 / period, adjust=False).mean()
    avg_loss = loss.ewm(alpha=1 / period, adjust=False).mean()

    rs = avg_gain / avg_loss.replace(0, np.nan)
    result = 100 - (100 / (1 + rs))

    result = result.where(avg_loss != 0, 100.0)  # no losses at all -> maximally overbought
    result = result.where((avg_gain != 0) | (avg_loss != 0), 50.0)  # no movement at all -> neutral
    return result.fillna(50)


def macd(series: pd.Series, fast: int = 12, slow: int = 26, signal: int = 9) -> dict[str, pd.Series]:
    ema_fast = ema(series, fast)
    ema_slow = ema(series, slow)
    macd_line = ema_fast - ema_slow
    signal_line = ema(macd_line, signal)
    histogram = macd_line - signal_line
    return {"macd": macd_line, "signal": signal_line, "histogram": histogram}


def stochastic_rsi(series: pd.Series, rsi_period: int = 14, stoch_period: int = 14, smooth_k: int = 3, smooth_d: int = 3) -> dict[str, pd.Series]:
    rsi_series = rsi(series, rsi_period)
    lowest = rsi_series.rolling(stoch_period).min()
    highest = rsi_series.rolling(stoch_period).max()
    stoch = ((rsi_series - lowest) / (highest - lowest).replace(0, np.nan)) * 100
    k = stoch.rolling(smooth_k).mean().fillna(50)
    d = k.rolling(smooth_d).mean().fillna(50)
    return {"k": k, "d": d}


def true_range(df: pd.DataFrame) -> pd.Series:
    prev_close = df["close"].shift(1)
    ranges = pd.concat(
        [
            df["high"] - df["low"],
            (df["high"] - prev_close).abs(),
            (df["low"] - prev_close).abs(),
        ],
        axis=1,
    )
    return ranges.max(axis=1)


def atr(df: pd.DataFrame, period: int = 14) -> pd.Series:
    tr = true_range(df)
    return tr.ewm(alpha=1 / period, adjust=False).mean()


def adx(df: pd.DataFrame, period: int = 14) -> dict[str, pd.Series]:
    up_move = df["high"].diff()
    down_move = -df["low"].diff()

    plus_dm = np.where((up_move > down_move) & (up_move > 0), up_move, 0.0)
    minus_dm = np.where((down_move > up_move) & (down_move > 0), down_move, 0.0)

    tr = true_range(df)
    atr_smooth = tr.ewm(alpha=1 / period, adjust=False).mean().replace(0, np.nan)

    plus_di = 100 * pd.Series(plus_dm, index=df.index).ewm(alpha=1 / period, adjust=False).mean() / atr_smooth
    minus_di = 100 * pd.Series(minus_dm, index=df.index).ewm(alpha=1 / period, adjust=False).mean() / atr_smooth

    dx = ((plus_di - minus_di).abs() / (plus_di + minus_di).replace(0, np.nan)) * 100
    adx_series = dx.ewm(alpha=1 / period, adjust=False).mean().fillna(0)

    return {"adx": adx_series, "plus_di": plus_di.fillna(0), "minus_di": minus_di.fillna(0)}


def vwap(df: pd.DataFrame) -> pd.Series:
    typical_price = (df["high"] + df["low"] + df["close"]) / 3
    cumulative_pv = (typical_price * df["volume"]).cumsum()
    cumulative_vol = df["volume"].cumsum().replace(0, np.nan)
    return (cumulative_pv / cumulative_vol).bfill()


def relative_volume(df: pd.DataFrame, period: int = 20) -> pd.Series:
    avg_vol = df["volume"].rolling(period).mean().replace(0, np.nan)
    return (df["volume"] / avg_vol).fillna(1.0)


def trend_direction(price_series: pd.Series, ema_fast: pd.Series, ema_slow: pd.Series) -> str:
    if price_series.iloc[-1] > ema_fast.iloc[-1] > ema_slow.iloc[-1]:
        return "bullish"
    if price_series.iloc[-1] < ema_fast.iloc[-1] < ema_slow.iloc[-1]:
        return "bearish"
    return "ranging"


def compute_all_indicators(df: pd.DataFrame) -> dict:
    """Compute the full indicator set used by the signal engine for a single timeframe of candles."""
    close = df["close"]

    ema20, ema50, ema100, ema200 = ema(close, 20), ema(close, 50), ema(close, 100), ema(close, 200)
    macd_data = macd(close)
    stoch_rsi_data = stochastic_rsi(close)
    adx_data = adx(df)

    return {
        "ema": {"ema20": ema20.iloc[-1], "ema50": ema50.iloc[-1], "ema100": ema100.iloc[-1], "ema200": ema200.iloc[-1]},
        "rsi": rsi(close).iloc[-1],
        "macd": {k: v.iloc[-1] for k, v in macd_data.items()},
        "stoch_rsi": {k: v.iloc[-1] for k, v in stoch_rsi_data.items()},
        "atr": atr(df).iloc[-1],
        "adx": {k: v.iloc[-1] for k, v in adx_data.items()},
        "vwap": vwap(df).iloc[-1],
        "relative_volume": relative_volume(df).iloc[-1],
        "short_term_trend": trend_direction(close, ema20, ema50),
        "long_term_trend": trend_direction(close, ema50, ema200),
        "trend_strength": float(adx_data["adx"].iloc[-1]),
    }
