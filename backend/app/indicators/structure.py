"""Market structure / Smart-Money-Concepts style analysis:
swing highs/lows, support & resistance, BOS/CHoCH, fair value gaps,
order blocks, liquidity pools, equal highs/lows, premium/discount zones.
"""

from __future__ import annotations

import pandas as pd


def swing_points(df: pd.DataFrame, left: int = 3, right: int = 3) -> pd.DataFrame:
    highs = df["high"]
    lows = df["low"]
    is_swing_high = pd.Series(False, index=df.index)
    is_swing_low = pd.Series(False, index=df.index)

    for i in range(left, len(df) - right):
        window_high = highs.iloc[i - left : i + right + 1]
        window_low = lows.iloc[i - left : i + right + 1]
        if highs.iloc[i] == window_high.max() and (window_high == window_high.max()).sum() == 1:
            is_swing_high.iloc[i] = True
        if lows.iloc[i] == window_low.min() and (window_low == window_low.min()).sum() == 1:
            is_swing_low.iloc[i] = True

    return pd.DataFrame({"swing_high": is_swing_high, "swing_low": is_swing_low})


def support_resistance_levels(df: pd.DataFrame, swings: pd.DataFrame, tolerance_pct: float = 0.15) -> dict:
    highs = df.loc[swings["swing_high"], "high"].tail(20).tolist()
    lows = df.loc[swings["swing_low"], "low"].tail(20).tolist()

    def cluster(levels: list[float]) -> list[float]:
        clustered: list[float] = []
        for level in sorted(levels):
            if clustered and abs(level - clustered[-1]) / clustered[-1] * 100 <= tolerance_pct:
                clustered[-1] = (clustered[-1] + level) / 2
            else:
                clustered.append(level)
        return clustered

    return {"resistance": cluster(highs)[-5:], "support": cluster(lows)[-5:]}


def equal_highs_lows(df: pd.DataFrame, swings: pd.DataFrame, tolerance_pct: float = 0.1) -> dict:
    highs = df.loc[swings["swing_high"], "high"].tail(10)
    lows = df.loc[swings["swing_low"], "low"].tail(10)
    equal_highs = []
    equal_lows = []
    hv = highs.values
    for i in range(len(hv) - 1):
        if abs(hv[i] - hv[i + 1]) / hv[i] * 100 <= tolerance_pct:
            equal_highs.append(round(float((hv[i] + hv[i + 1]) / 2), 8))
    lv = lows.values
    for i in range(len(lv) - 1):
        if abs(lv[i] - lv[i + 1]) / lv[i] * 100 <= tolerance_pct:
            equal_lows.append(round(float((lv[i] + lv[i + 1]) / 2), 8))
    return {"equal_highs": equal_highs, "equal_lows": equal_lows}


def break_of_structure(df: pd.DataFrame, swings: pd.DataFrame) -> dict:
    """Detects the most recent BOS (trend continuation break) or CHoCH
    (character change / potential reversal) by comparing the latest close
    against the last two confirmed swing highs/lows."""
    swing_highs = df.loc[swings["swing_high"], "high"]
    swing_lows = df.loc[swings["swing_low"], "low"]
    last_close = df["close"].iloc[-1]

    event = None
    if len(swing_highs) >= 2:
        last_high = swing_highs.iloc[-1]
        prior_high = swing_highs.iloc[-2]
        if last_close > last_high and last_high > prior_high:
            event = "bullish_bos"
        elif last_close > last_high and last_high < prior_high:
            event = "bullish_choch"
    if len(swing_lows) >= 2:
        last_low = swing_lows.iloc[-1]
        prior_low = swing_lows.iloc[-2]
        if last_close < last_low and last_low < prior_low:
            event = event or "bearish_bos"
        elif last_close < last_low and last_low > prior_low:
            event = event or "bearish_choch"

    return {"event": event}


def fair_value_gaps(df: pd.DataFrame, lookback: int = 60) -> list[dict]:
    """3-candle imbalance: gap between candle[i-1].high/low and candle[i+1].low/high."""
    gaps = []
    sub = df.tail(lookback).reset_index(drop=True)
    for i in range(1, len(sub) - 1):
        prev_c, next_c = sub.iloc[i - 1], sub.iloc[i + 1]
        if next_c["low"] > prev_c["high"]:
            gaps.append(
                {"type": "bullish", "top": round(float(next_c["low"]), 8), "bottom": round(float(prev_c["high"]), 8)}
            )
        elif next_c["high"] < prev_c["low"]:
            gaps.append(
                {"type": "bearish", "top": round(float(prev_c["low"]), 8), "bottom": round(float(next_c["high"]), 8)}
            )
    return gaps[-5:]


def order_blocks(df: pd.DataFrame, swings: pd.DataFrame, lookback: int = 80) -> list[dict]:
    """Simplified order block detection: the last opposite-direction candle
    immediately preceding an impulsive move that broke structure."""
    sub = df.tail(lookback).reset_index(drop=True)
    blocks = []
    for i in range(2, len(sub) - 1):
        candle = sub.iloc[i]
        next_candle = sub.iloc[i + 1]
        body = abs(candle["close"] - candle["open"])
        next_body = abs(next_candle["close"] - next_candle["open"])
        is_bearish_candle = candle["close"] < candle["open"]
        is_bullish_candle = candle["close"] > candle["open"]
        impulsive = next_body > body * 1.5

        if is_bearish_candle and next_candle["close"] > next_candle["open"] and impulsive:
            blocks.append(
                {
                    "type": "bullish",
                    "top": round(float(candle["high"]), 8),
                    "bottom": round(float(candle["low"]), 8),
                }
            )
        elif is_bullish_candle and next_candle["close"] < next_candle["open"] and impulsive:
            blocks.append(
                {
                    "type": "bearish",
                    "top": round(float(candle["high"]), 8),
                    "bottom": round(float(candle["low"]), 8),
                }
            )
    return blocks[-3:]


def premium_discount_zone(df: pd.DataFrame, lookback: int = 50) -> dict:
    window = df.tail(lookback)
    high, low = window["high"].max(), window["low"].min()
    mid = (high + low) / 2
    last_close = df["close"].iloc[-1]
    zone = "premium" if last_close > mid else "discount" if last_close < mid else "equilibrium"
    return {"zone": zone, "range_high": round(float(high), 8), "range_low": round(float(low), 8), "equilibrium": round(float(mid), 8)}


def structure_summary(df: pd.DataFrame) -> dict:
    swings = swing_points(df)
    return {
        "support_resistance": support_resistance_levels(df, swings),
        "equal_highs_lows": equal_highs_lows(df, swings),
        "bos_choch": break_of_structure(df, swings),
        "fair_value_gaps": fair_value_gaps(df),
        "order_blocks": order_blocks(df, swings),
        "premium_discount": premium_discount_zone(df),
    }
