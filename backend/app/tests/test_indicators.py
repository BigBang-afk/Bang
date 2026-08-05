import pytest

from app.indicators.engine import analyze


def test_analyze_uptrend_detects_bullish_trend(uptrend_df):
    result = analyze(uptrend_df)
    assert result["trend"]["direction"] == "bullish"
    assert result["price"] > 0


def test_analyze_downtrend_detects_bearish_trend(downtrend_df):
    result = analyze(downtrend_df)
    assert result["trend"]["direction"] == "bearish"


def test_analyze_requires_minimum_candles(uptrend_df):
    with pytest.raises(ValueError):
        analyze(uptrend_df.head(10))


def test_analyze_returns_all_expected_sections(uptrend_df):
    result = analyze(uptrend_df)
    for key in ("trend", "momentum", "volatility", "volume", "supertrend", "structure", "pivots", "patterns", "ema"):
        assert key in result


def test_rsi_bounded(uptrend_df):
    from app.indicators.momentum import rsi

    values = rsi(uptrend_df["close"]).dropna()
    assert (values >= 0).all() and (values <= 100).all()


def test_volume_profile_has_poc(uptrend_df):
    from app.indicators.volume import volume_profile

    profile = volume_profile(uptrend_df)
    assert profile["poc"] is not None
    assert profile["value_area_low"] <= profile["poc"] <= profile["value_area_high"]


def test_order_book_imbalance_bias():
    from app.indicators.volume import order_book_imbalance

    bids = [[100, 5], [99, 5]]
    asks = [[101, 1], [102, 1]]
    result = order_book_imbalance(bids, asks)
    assert result["bias"] == "bid_heavy"
