"""Market structure: swing points, trend structure, support/resistance levels."""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np
import pandas as pd


@dataclass
class SwingPoint:
    index: int
    price: float
    kind: str  # "high" | "low"


def find_swing_points(df: pd.DataFrame, window: int = 3) -> list[SwingPoint]:
    highs = df["high"].to_numpy()
    lows = df["low"].to_numpy()
    points: list[SwingPoint] = []
    n = len(df)
    for i in range(window, n - window):
        if highs[i] == max(highs[i - window : i + window + 1]):
            points.append(SwingPoint(index=i, price=float(highs[i]), kind="high"))
        if lows[i] == min(lows[i - window : i + window + 1]):
            points.append(SwingPoint(index=i, price=float(lows[i]), kind="low"))
    points.sort(key=lambda p: p.index)
    return points


def structure_state(swings: list[SwingPoint]) -> str:
    """Classify the most recent structure as HH, HL, LH, LL or UNCLEAR."""
    highs = [p for p in swings if p.kind == "high"]
    lows = [p for p in swings if p.kind == "low"]
    if len(highs) < 2 or len(lows) < 2:
        return "UNCLEAR"
    hh = highs[-1].price > highs[-2].price
    hl = lows[-1].price > lows[-2].price
    lh = highs[-1].price < highs[-2].price
    ll = lows[-1].price < lows[-2].price
    if hh and hl:
        return "HH_HL"  # bullish structure
    if lh and ll:
        return "LH_LL"  # bearish structure
    if hh and ll:
        return "EXPANSION"
    return "RANGE_STRUCTURE"


def break_of_structure(swings: list[SwingPoint], current_close: float) -> str | None:
    """Detect BOS/CHoCH relative to the most recent opposite swing."""
    highs = [p for p in swings if p.kind == "high"]
    lows = [p for p in swings if p.kind == "low"]
    if highs and current_close > highs[-1].price:
        return "BOS_BULLISH"
    if lows and current_close < lows[-1].price:
        return "BOS_BEARISH"
    return None


def support_resistance_levels(swings: list[SwingPoint], tolerance: float) -> tuple[list[float], list[float]]:
    """Cluster swing highs/lows into multi-touch support/resistance levels."""
    highs = sorted([p.price for p in swings if p.kind == "high"])
    lows = sorted([p.price for p in swings if p.kind == "low"])

    def cluster(prices: list[float]) -> list[float]:
        if not prices:
            return []
        clusters: list[list[float]] = [[prices[0]]]
        for p in prices[1:]:
            if p - clusters[-1][-1] <= tolerance:
                clusters[-1].append(p)
            else:
                clusters.append([p])
        return [float(np.mean(c)) for c in clusters if len(c) >= 1]

    return cluster(lows), cluster(highs)


def nearest_distance(levels: list[float], price: float) -> float | None:
    if not levels:
        return None
    return min(abs(price - lvl) for lvl in levels)
