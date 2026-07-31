"""Candlestick price-action pattern detection.

Every detector looks only at the current row and a small trailing window
(never future candles) and returns a bool for the *last* row of the frame.
Patterns are intentionally conservative - strategies must still require
trend/S-R/volatility context before acting on any of these flags.
"""

from __future__ import annotations

import pandas as pd


def _body(row) -> float:
    return abs(row["close"] - row["open"])


def _range(row) -> float:
    return max(row["high"] - row["low"], 1e-12)


def _upper_wick(row) -> float:
    return row["high"] - max(row["close"], row["open"])


def _lower_wick(row) -> float:
    return min(row["close"], row["open"]) - row["low"]


def is_bullish(row) -> bool:
    return row["close"] > row["open"]


def is_bearish(row) -> bool:
    return row["close"] < row["open"]


def bullish_engulfing(df: pd.DataFrame) -> bool:
    if len(df) < 2:
        return False
    prev, cur = df.iloc[-2], df.iloc[-1]
    return is_bearish(prev) and is_bullish(cur) and cur["close"] >= prev["open"] and cur["open"] <= prev["close"]


def bearish_engulfing(df: pd.DataFrame) -> bool:
    if len(df) < 2:
        return False
    prev, cur = df.iloc[-2], df.iloc[-1]
    return is_bullish(prev) and is_bearish(cur) and cur["open"] >= prev["close"] and cur["close"] <= prev["open"]


def hammer(df: pd.DataFrame) -> bool:
    cur = df.iloc[-1]
    body = _body(cur)
    rng = _range(cur)
    return _lower_wick(cur) >= 2 * body and _upper_wick(cur) <= 0.25 * rng and body / rng < 0.4


def shooting_star(df: pd.DataFrame) -> bool:
    cur = df.iloc[-1]
    body = _body(cur)
    rng = _range(cur)
    return _upper_wick(cur) >= 2 * body and _lower_wick(cur) <= 0.25 * rng and body / rng < 0.4


def pin_bar_bullish(df: pd.DataFrame) -> bool:
    return hammer(df)


def pin_bar_bearish(df: pd.DataFrame) -> bool:
    return shooting_star(df)


def morning_star(df: pd.DataFrame) -> bool:
    if len(df) < 3:
        return False
    c1, c2, c3 = df.iloc[-3], df.iloc[-2], df.iloc[-1]
    return (
        is_bearish(c1)
        and _body(c1) / _range(c1) > 0.5
        and _body(c2) / _range(c2) < 0.35
        and is_bullish(c3)
        and c3["close"] > (c1["open"] + c1["close"]) / 2
    )


def evening_star(df: pd.DataFrame) -> bool:
    if len(df) < 3:
        return False
    c1, c2, c3 = df.iloc[-3], df.iloc[-2], df.iloc[-1]
    return (
        is_bullish(c1)
        and _body(c1) / _range(c1) > 0.5
        and _body(c2) / _range(c2) < 0.35
        and is_bearish(c3)
        and c3["close"] < (c1["open"] + c1["close"]) / 2
    )


def inside_bar(df: pd.DataFrame) -> bool:
    if len(df) < 2:
        return False
    prev, cur = df.iloc[-2], df.iloc[-1]
    return cur["high"] <= prev["high"] and cur["low"] >= prev["low"]


def outside_bar(df: pd.DataFrame) -> bool:
    if len(df) < 2:
        return False
    prev, cur = df.iloc[-2], df.iloc[-1]
    return cur["high"] >= prev["high"] and cur["low"] <= prev["low"]


def inside_bar_breakout(df: pd.DataFrame) -> tuple[bool, bool]:
    """Returns (bullish_breakout, bearish_breakout) of the bar before last."""
    if len(df) < 3:
        return False, False
    inside = df.iloc[-2]["high"] <= df.iloc[-3]["high"] and df.iloc[-2]["low"] >= df.iloc[-3]["low"]
    if not inside:
        return False, False
    last = df.iloc[-1]
    bullish_break = last["close"] > df.iloc[-2]["high"]
    bearish_break = last["close"] < df.iloc[-2]["low"]
    return bullish_break, bearish_break


def three_candle_continuation(df: pd.DataFrame) -> tuple[bool, bool]:
    """Returns (bullish_continuation, bearish_continuation)."""
    if len(df) < 3:
        return False, False
    c1, c2, c3 = df.iloc[-3], df.iloc[-2], df.iloc[-1]
    bullish = is_bullish(c1) and is_bullish(c2) and is_bullish(c3) and c3["close"] > c2["close"] > c1["close"]
    bearish = is_bearish(c1) and is_bearish(c2) and is_bearish(c3) and c3["close"] < c2["close"] < c1["close"]
    return bullish, bearish


def detect_all_patterns(df: pd.DataFrame) -> dict[str, bool]:
    bull_break, bear_break = inside_bar_breakout(df)
    bull_cont, bear_cont = three_candle_continuation(df)
    return {
        "bullish_engulfing": bullish_engulfing(df),
        "bearish_engulfing": bearish_engulfing(df),
        "hammer": hammer(df),
        "shooting_star": shooting_star(df),
        "pin_bar_bullish": pin_bar_bullish(df),
        "pin_bar_bearish": pin_bar_bearish(df),
        "morning_star": morning_star(df),
        "evening_star": evening_star(df),
        "inside_bar": inside_bar(df),
        "outside_bar": outside_bar(df),
        "inside_bar_breakout_bullish": bull_break,
        "inside_bar_breakout_bearish": bear_break,
        "three_candle_continuation_bullish": bull_cont,
        "three_candle_continuation_bearish": bear_cont,
    }
