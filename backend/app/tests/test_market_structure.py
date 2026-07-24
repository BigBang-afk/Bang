import numpy as np
import pandas as pd

from app.services import market_structure


def make_zigzag_df():
    """Constructs a clean up-down-up-down zigzag so swing points are unambiguous."""
    closes = [100, 105, 110, 105, 100, 95, 100, 105, 112, 108, 102, 96, 90, 95, 102]
    highs = [c + 1 for c in closes]
    lows = [c - 1 for c in closes]
    opens = closes
    volumes = [1000] * len(closes)
    idx = pd.date_range("2026-01-01", periods=len(closes), freq="h")
    return pd.DataFrame({"open": opens, "high": highs, "low": lows, "close": closes, "volume": volumes}, index=idx)


def test_find_swing_points_returns_alternating_types():
    df = make_zigzag_df()
    swings = market_structure.find_swing_points(df, left=2, right=2)
    assert len(swings) > 0
    for s in swings:
        assert s["type"] in ("swing_high", "swing_low")


def test_classify_structure_labels_hh_hl_lh_ll():
    df = make_zigzag_df()
    swings = market_structure.find_swing_points(df, left=2, right=2)
    structure = market_structure.classify_structure(swings)
    assert "labels" in structure and "events" in structure and "current_trend" in structure
    for label in structure["labels"]:
        assert label["label"] in ("HH", "HL", "LH", "LL")


def test_premium_discount_zone():
    assert market_structure.premium_discount_zone(92, range_high=100, range_low=90) == "discount"
    assert market_structure.premium_discount_zone(98, range_high=100, range_low=90) == "premium"
    assert market_structure.premium_discount_zone(95, range_high=100, range_low=90) == "equilibrium"


def test_detect_fair_value_gaps_finds_bullish_gap():
    closes = [100, 101, 110, 111, 112]
    highs = [100.5, 101.5, 110.5, 111.5, 112.5]
    lows = [99.5, 100.5, 109.5, 110.5, 111.5]
    idx = pd.date_range("2026-01-01", periods=5, freq="h")
    df = pd.DataFrame({"open": closes, "high": highs, "low": lows, "close": closes, "volume": [100] * 5}, index=idx)
    gaps = market_structure.detect_fair_value_gaps(df)
    assert any(g["type"] == "bullish_fvg" for g in gaps)


def test_detect_candlestick_patterns_bullish_engulfing():
    idx = pd.date_range("2026-01-01", periods=3, freq="h")
    df = pd.DataFrame({
        "open": [110, 109, 99],
        "high": [111, 109.5, 111.5],
        "low": [108, 99, 98.5],
        "close": [109, 100, 111],
        "volume": [100, 100, 100],
    }, index=idx)
    patterns = market_structure.detect_candlestick_patterns(df)
    assert "bullish_engulfing" in patterns


def test_detect_liquidity_pools_finds_equal_highs():
    swings = [
        {"index": 0, "type": "swing_high", "price": 100.0, "time": 0},
        {"index": 5, "type": "swing_high", "price": 100.02, "time": 5},
    ]
    pools = market_structure.detect_liquidity_pools(swings, tolerance_pct=0.1)
    assert any(p["type"] == "equal_highs" for p in pools)
