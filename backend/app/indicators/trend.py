"""Trend indicators: EMA family, ADX, Supertrend, simplified Ichimoku."""

from __future__ import annotations

import numpy as np
import pandas as pd


def ema(series: pd.Series, length: int) -> pd.Series:
    return series.ewm(span=length, adjust=False).mean()


def add_ema_stack(df: pd.DataFrame) -> pd.DataFrame:
    for length in (9, 20, 50, 100, 200):
        df[f"ema_{length}"] = ema(df["close"], length)
    return df


def true_range(df: pd.DataFrame) -> pd.Series:
    prev_close = df["close"].shift(1)
    ranges = pd.concat(
        [df["high"] - df["low"], (df["high"] - prev_close).abs(), (df["low"] - prev_close).abs()], axis=1
    )
    return ranges.max(axis=1)


def atr(df: pd.DataFrame, length: int = 14) -> pd.Series:
    tr = true_range(df)
    return tr.ewm(alpha=1 / length, adjust=False).mean()


def adx(df: pd.DataFrame, length: int = 14) -> pd.DataFrame:
    up_move = df["high"].diff()
    down_move = -df["low"].diff()
    plus_dm = np.where((up_move > down_move) & (up_move > 0), up_move, 0.0)
    minus_dm = np.where((down_move > up_move) & (down_move > 0), down_move, 0.0)
    tr = true_range(df)
    atr_n = tr.ewm(alpha=1 / length, adjust=False).mean()
    plus_di = 100 * pd.Series(plus_dm, index=df.index).ewm(alpha=1 / length, adjust=False).mean() / atr_n.replace(0, np.nan)
    minus_di = 100 * pd.Series(minus_dm, index=df.index).ewm(alpha=1 / length, adjust=False).mean() / atr_n.replace(0, np.nan)
    dx = (plus_di - minus_di).abs() / (plus_di + minus_di).replace(0, np.nan) * 100
    adx_val = dx.ewm(alpha=1 / length, adjust=False).mean()
    return pd.DataFrame({"plus_di": plus_di, "minus_di": minus_di, "adx": adx_val})


def supertrend(df: pd.DataFrame, length: int = 10, multiplier: float = 3.0) -> pd.DataFrame:
    atr_val = atr(df, length)
    hl2 = (df["high"] + df["low"]) / 2
    upper_band = hl2 + multiplier * atr_val
    lower_band = hl2 - multiplier * atr_val

    final_upper = upper_band.copy()
    final_lower = lower_band.copy()
    trend = pd.Series(1, index=df.index)

    for i in range(1, len(df)):
        if df["close"].iloc[i - 1] > final_upper.iloc[i - 1]:
            final_upper.iloc[i] = max(upper_band.iloc[i], final_upper.iloc[i - 1]) if trend.iloc[i - 1] == -1 else upper_band.iloc[i]
        if upper_band.iloc[i] < final_upper.iloc[i - 1] and df["close"].iloc[i - 1] <= final_upper.iloc[i - 1]:
            final_upper.iloc[i] = upper_band.iloc[i]
        else:
            final_upper.iloc[i] = final_upper.iloc[i - 1] if df["close"].iloc[i - 1] <= final_upper.iloc[i - 1] else upper_band.iloc[i]

        if lower_band.iloc[i] > final_lower.iloc[i - 1] and df["close"].iloc[i - 1] >= final_lower.iloc[i - 1]:
            final_lower.iloc[i] = lower_band.iloc[i]
        else:
            final_lower.iloc[i] = final_lower.iloc[i - 1] if df["close"].iloc[i - 1] >= final_lower.iloc[i - 1] else lower_band.iloc[i]

        if df["close"].iloc[i] > final_upper.iloc[i - 1]:
            trend.iloc[i] = 1
        elif df["close"].iloc[i] < final_lower.iloc[i - 1]:
            trend.iloc[i] = -1
        else:
            trend.iloc[i] = trend.iloc[i - 1]

    supertrend_line = np.where(trend == 1, final_lower, final_upper)
    return pd.DataFrame({"supertrend": supertrend_line, "trend": trend}, index=df.index)


def ichimoku(df: pd.DataFrame) -> pd.DataFrame:
    high9 = df["high"].rolling(9).max()
    low9 = df["low"].rolling(9).min()
    tenkan = (high9 + low9) / 2

    high26 = df["high"].rolling(26).max()
    low26 = df["low"].rolling(26).min()
    kijun = (high26 + low26) / 2

    senkou_a = ((tenkan + kijun) / 2).shift(26)

    high52 = df["high"].rolling(52).max()
    low52 = df["low"].rolling(52).min()
    senkou_b = ((high52 + low52) / 2).shift(26)

    chikou = df["close"].shift(-26)

    return pd.DataFrame(
        {"tenkan": tenkan, "kijun": kijun, "senkou_a": senkou_a, "senkou_b": senkou_b, "chikou": chikou}
    )


def trend_summary(df: pd.DataFrame) -> dict:
    last = df.iloc[-1]
    ema_order_bullish = last["ema_9"] > last["ema_20"] > last["ema_50"] > last["ema_100"] > last["ema_200"]
    ema_order_bearish = last["ema_9"] < last["ema_20"] < last["ema_50"] < last["ema_100"] < last["ema_200"]
    direction = "bullish" if ema_order_bullish else "bearish" if ema_order_bearish else "mixed"
    return {
        "direction": direction,
        "price_above_ema200": bool(last["close"] > last["ema_200"]),
        "ema_stack_aligned": bool(ema_order_bullish or ema_order_bearish),
    }
