"""Lightweight candlestick pattern recognition (last-candle focused)."""

from __future__ import annotations

import pandas as pd


def _body(c) -> float:
    return abs(c["close"] - c["open"])


def _range(c) -> float:
    return max(c["high"] - c["low"], 1e-12)


def _upper_wick(c) -> float:
    return c["high"] - max(c["close"], c["open"])


def _lower_wick(c) -> float:
    return min(c["close"], c["open"]) - c["low"]


def detect_patterns(df: pd.DataFrame) -> list[str]:
    if len(df) < 3:
        return []
    c0, c1, c2 = df.iloc[-1], df.iloc[-2], df.iloc[-3]
    patterns: list[str] = []

    body0, range0 = _body(c0), _range(c0)

    # Doji
    if body0 / range0 < 0.1:
        patterns.append("doji")

    # Hammer / Shooting star
    if _lower_wick(c0) > body0 * 2 and _upper_wick(c0) < body0:
        patterns.append("hammer")
    if _upper_wick(c0) > body0 * 2 and _lower_wick(c0) < body0:
        patterns.append("shooting_star")

    # Engulfing
    prev_bearish = c1["close"] < c1["open"]
    prev_bullish = c1["close"] > c1["open"]
    curr_bullish = c0["close"] > c0["open"]
    curr_bearish = c0["close"] < c0["open"]
    if prev_bearish and curr_bullish and c0["close"] >= c1["open"] and c0["open"] <= c1["close"]:
        patterns.append("bullish_engulfing")
    if prev_bullish and curr_bearish and c0["open"] >= c1["close"] and c0["close"] <= c1["open"]:
        patterns.append("bearish_engulfing")

    # Morning / Evening star (3-candle)
    if (
        c2["close"] < c2["open"]
        and _body(c1) / _range(c1) < 0.35
        and c0["close"] > c0["open"]
        and c0["close"] > (c2["open"] + c2["close"]) / 2
    ):
        patterns.append("morning_star")
    if (
        c2["close"] > c2["open"]
        and _body(c1) / _range(c1) < 0.35
        and c0["close"] < c0["open"]
        and c0["close"] < (c2["open"] + c2["close"]) / 2
    ):
        patterns.append("evening_star")

    # Pin bar continuation of three white soldiers / black crows (simplified)
    if all(df.iloc[-i]["close"] > df.iloc[-i]["open"] for i in (1, 2, 3)) and c0["close"] > c1["close"] > c2["close"]:
        patterns.append("three_white_soldiers")
    if all(df.iloc[-i]["close"] < df.iloc[-i]["open"] for i in (1, 2, 3)) and c0["close"] < c1["close"] < c2["close"]:
        patterns.append("three_black_crows")

    return patterns
