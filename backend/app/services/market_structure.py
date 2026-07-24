"""Market structure detection: swing points, BOS/CHOCH, and basic candlestick pattern recognition.

This uses simple, explainable heuristics (fractal swing detection) rather than a black-box model,
so every signal can cite the exact structural reason it fired.
"""
from __future__ import annotations

import pandas as pd


def find_swing_points(df: pd.DataFrame, left: int = 3, right: int = 3) -> list[dict]:
    """Fractal-based swing high/low detection: a candle is a swing high/low if it is the
    highest/lowest within `left` bars before and `right` bars after it."""
    swings: list[dict] = []
    highs, lows = df["high"].values, df["low"].values
    n = len(df)

    for i in range(left, n - right):
        window_high = highs[i - left : i + right + 1]
        window_low = lows[i - left : i + right + 1]

        if highs[i] == window_high.max() and highs[i] == window_high[left]:
            swings.append({"index": i, "type": "swing_high", "price": float(highs[i]), "time": df.index[i]})
        if lows[i] == window_low.min() and lows[i] == window_low[left]:
            swings.append({"index": i, "type": "swing_low", "price": float(lows[i]), "time": df.index[i]})

    return sorted(swings, key=lambda s: s["index"])


def classify_structure(swings: list[dict]) -> dict:
    """Classify the sequence of swing highs/lows into HH/HL/LH/LL and detect BOS / CHOCH."""
    highs = [s for s in swings if s["type"] == "swing_high"]
    lows = [s for s in swings if s["type"] == "swing_low"]

    labels: list[dict] = []
    for i in range(1, len(highs)):
        label = "HH" if highs[i]["price"] > highs[i - 1]["price"] else "LH"
        labels.append({**highs[i], "label": label})
    for i in range(1, len(lows)):
        label = "HL" if lows[i]["price"] > lows[i - 1]["price"] else "LL"
        labels.append({**lows[i], "label": label})

    labels.sort(key=lambda s: s["index"])

    trend = "undefined"
    bos_choch: list[dict] = []
    last_trend = None
    for lab in labels:
        if lab["label"] in ("HH", "HL"):
            current_trend = "bullish"
        else:
            current_trend = "bearish"

        if last_trend and current_trend != last_trend:
            bos_choch.append({**lab, "event": "CHOCH", "new_trend": current_trend})
        elif last_trend == current_trend:
            bos_choch.append({**lab, "event": "BOS", "new_trend": current_trend})

        last_trend = current_trend
        trend = current_trend

    return {"labels": labels, "events": bos_choch, "current_trend": trend}


def detect_order_blocks(df: pd.DataFrame, swings: list[dict], lookback: int = 15) -> list[dict]:
    """Heuristic order block detection: the last opposite-colored candle before a strong
    impulsive move that breaks a swing point."""
    blocks: list[dict] = []
    for swing in swings[-lookback:]:
        idx = swing["index"]
        if idx < 1 or idx >= len(df):
            continue
        candle = df.iloc[idx]
        prev = df.iloc[idx - 1]

        if swing["type"] == "swing_low" and prev["close"] > prev["open"] and candle["close"] < candle["open"]:
            blocks.append({
                "type": "bullish_order_block",
                "high": float(prev["high"]),
                "low": float(prev["low"]),
                "time": df.index[idx - 1],
            })
        if swing["type"] == "swing_high" and prev["close"] < prev["open"] and candle["close"] > candle["open"]:
            blocks.append({
                "type": "bearish_order_block",
                "high": float(prev["high"]),
                "low": float(prev["low"]),
                "time": df.index[idx - 1],
            })
    return blocks


def detect_fair_value_gaps(df: pd.DataFrame) -> list[dict]:
    """3-candle imbalance: gap between candle[i-1].high and candle[i+1].low (bullish FVG) or
    candle[i-1].low and candle[i+1].high (bearish FVG)."""
    gaps: list[dict] = []
    for i in range(1, len(df) - 1):
        prev, nxt = df.iloc[i - 1], df.iloc[i + 1]
        if prev["high"] < nxt["low"]:
            gaps.append({"type": "bullish_fvg", "top": float(nxt["low"]), "bottom": float(prev["high"]), "time": df.index[i]})
        if prev["low"] > nxt["high"]:
            gaps.append({"type": "bearish_fvg", "top": float(prev["low"]), "bottom": float(nxt["high"]), "time": df.index[i]})
    return gaps


def detect_liquidity_pools(swings: list[dict], tolerance_pct: float = 0.05) -> list[dict]:
    """Equal highs / equal lows within tolerance_pct% are marked as resting liquidity pools."""
    pools: list[dict] = []
    highs = [s for s in swings if s["type"] == "swing_high"]
    lows = [s for s in swings if s["type"] == "swing_low"]

    for group, label in ((highs, "equal_highs"), (lows, "equal_lows")):
        for i in range(len(group)):
            for j in range(i + 1, len(group)):
                a, b = group[i]["price"], group[j]["price"]
                if abs(a - b) / max(a, b) * 100 <= tolerance_pct:
                    pools.append({"type": label, "price_a": a, "price_b": b, "level": (a + b) / 2})
    return pools


def premium_discount_zone(current_price: float, range_high: float, range_low: float) -> str:
    if range_high == range_low:
        return "equilibrium"
    fib = (current_price - range_low) / (range_high - range_low)
    if fib >= 0.618:
        return "premium"
    if fib <= 0.382:
        return "discount"
    return "equilibrium"


def detect_candlestick_patterns(df: pd.DataFrame) -> list[str]:
    """Detect the last candle's pattern using body/wick ratios. Cheap, explainable, no TA-Lib dependency."""
    if len(df) < 3:
        return []

    patterns: list[str] = []
    c0, c1, c2 = df.iloc[-1], df.iloc[-2], df.iloc[-3]

    def body(c):
        return abs(c["close"] - c["open"])

    def rng(c):
        return max(c["high"] - c["low"], 1e-12)

    b0, r0 = body(c0), rng(c0)

    if b0 / r0 < 0.1:
        patterns.append("doji")
    if b0 / r0 > 0.9:
        patterns.append("marubozu")

    upper_wick = c0["high"] - max(c0["close"], c0["open"])
    lower_wick = min(c0["close"], c0["open"]) - c0["low"]
    if lower_wick > b0 * 2 and upper_wick < b0 * 0.5:
        patterns.append("bullish_pin_bar")
    if upper_wick > b0 * 2 and lower_wick < b0 * 0.5:
        patterns.append("bearish_pin_bar")

    if c1["close"] < c1["open"] and c0["close"] > c0["open"] and c0["close"] > c1["open"] and c0["open"] < c1["close"]:
        patterns.append("bullish_engulfing")
    if c1["close"] > c1["open"] and c0["close"] < c0["open"] and c0["close"] < c1["open"] and c0["open"] > c1["close"]:
        patterns.append("bearish_engulfing")

    if c0["high"] < c1["high"] and c0["low"] > c1["low"]:
        patterns.append("inside_bar")
    if c0["high"] > c1["high"] and c0["low"] < c1["low"]:
        patterns.append("outside_bar")

    if (
        c2["close"] < c2["open"]
        and body(c1) / rng(c1) < 0.3
        and c0["close"] > c0["open"]
        and c0["close"] > (c2["open"] + c2["close"]) / 2
    ):
        patterns.append("morning_star")
    if (
        c2["close"] > c2["open"]
        and body(c1) / rng(c1) < 0.3
        and c0["close"] < c0["open"]
        and c0["close"] < (c2["open"] + c2["close"]) / 2
    ):
        patterns.append("evening_star")

    return patterns
