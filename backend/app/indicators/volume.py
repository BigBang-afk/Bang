"""Volume-based analysis: VWAP, anchored VWAP, CVD approximation, volume profile."""

from __future__ import annotations

import numpy as np
import pandas as pd


def vwap(df: pd.DataFrame) -> pd.Series:
    typical_price = (df["high"] + df["low"] + df["close"]) / 3
    cum_vol = df["volume"].cumsum()
    cum_vol_price = (typical_price * df["volume"]).cumsum()
    return cum_vol_price / cum_vol.replace(0, np.nan)


def anchored_vwap(df: pd.DataFrame, anchor_index: int) -> pd.Series:
    sub = df.iloc[anchor_index:]
    typical_price = (sub["high"] + sub["low"] + sub["close"]) / 3
    cum_vol = sub["volume"].cumsum()
    cum_vol_price = (typical_price * sub["volume"]).cumsum()
    result = pd.Series(index=df.index, dtype=float)
    result.iloc[anchor_index:] = (cum_vol_price / cum_vol.replace(0, np.nan)).values
    return result


def candle_delta(df: pd.DataFrame) -> pd.Series:
    """Approximate per-candle buy/sell delta volume using close position within range
    (proxy for order-flow delta when raw bid/ask trade tape is unavailable)."""
    rng = (df["high"] - df["low"]).replace(0, np.nan)
    buy_ratio = ((df["close"] - df["low"]) / rng).clip(0, 1).fillna(0.5)
    return df["volume"] * (2 * buy_ratio - 1)


def cumulative_volume_delta(df: pd.DataFrame) -> pd.Series:
    return candle_delta(df).cumsum()


def volume_profile(df: pd.DataFrame, bins: int = 24) -> dict:
    price_min, price_max = df["low"].min(), df["high"].max()
    if price_max <= price_min:
        return {"poc": None, "value_area_high": None, "value_area_low": None, "bins": []}
    edges = np.linspace(price_min, price_max, bins + 1)
    volumes = np.zeros(bins)
    for _, row in df.iterrows():
        idx = np.clip(np.searchsorted(edges, row["close"], side="right") - 1, 0, bins - 1)
        volumes[idx] += row["volume"]

    total = volumes.sum()
    poc_idx = int(np.argmax(volumes))
    order = np.argsort(volumes)[::-1]
    cum = 0.0
    included = set()
    for idx in order:
        cum += volumes[idx]
        included.add(idx)
        if cum >= 0.7 * total:
            break
    va_high = edges[max(included) + 1]
    va_low = edges[min(included)]

    return {
        "poc": round(float((edges[poc_idx] + edges[poc_idx + 1]) / 2), 8),
        "value_area_high": round(float(va_high), 8),
        "value_area_low": round(float(va_low), 8),
        "bins": [
            {"price": round(float((edges[i] + edges[i + 1]) / 2), 8), "volume": round(float(volumes[i]), 4)}
            for i in range(bins)
        ],
    }


def order_book_imbalance(bids: list[list], asks: list[list], depth: int = 20) -> dict:
    bid_vol = sum(float(b[1]) for b in bids[:depth])
    ask_vol = sum(float(a[1]) for a in asks[:depth])
    total = bid_vol + ask_vol
    imbalance = (bid_vol - ask_vol) / total if total else 0.0
    return {
        "bid_volume": round(bid_vol, 4),
        "ask_volume": round(ask_vol, 4),
        "imbalance": round(imbalance, 4),  # -1 (heavy ask) .. +1 (heavy bid)
        "bias": "bid_heavy" if imbalance > 0.15 else "ask_heavy" if imbalance < -0.15 else "balanced",
    }
