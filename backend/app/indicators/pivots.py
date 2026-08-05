"""Classic (floor trader) pivot points computed from the prior period's OHLC."""

from __future__ import annotations

import pandas as pd


def classic_pivots(prev_high: float, prev_low: float, prev_close: float) -> dict:
    pp = (prev_high + prev_low + prev_close) / 3
    r1 = 2 * pp - prev_low
    s1 = 2 * pp - prev_high
    r2 = pp + (prev_high - prev_low)
    s2 = pp - (prev_high - prev_low)
    r3 = pp + 2 * (prev_high - prev_low)
    s3 = pp - 2 * (prev_high - prev_low)
    return {
        "pp": round(pp, 8),
        "r1": round(r1, 8),
        "r2": round(r2, 8),
        "r3": round(r3, 8),
        "s1": round(s1, 8),
        "s2": round(s2, 8),
        "s3": round(s3, 8),
    }


def daily_pivots_from_klines(df: pd.DataFrame) -> dict:
    if len(df) < 2:
        return {}
    prev = df.iloc[-2]
    return classic_pivots(float(prev["high"]), float(prev["low"]), float(prev["close"]))
