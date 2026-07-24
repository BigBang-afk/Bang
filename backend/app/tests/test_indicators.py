import numpy as np
import pandas as pd
import pytest

from app.services import indicators


def make_trending_df(n=250, start=100.0, step=0.5, noise=0.0, seed=42):
    rng = np.random.default_rng(seed)
    closes = start + np.arange(n) * step + rng.normal(0, noise, n)
    highs = closes + 0.5
    lows = closes - 0.5
    opens = closes - step / 2
    volumes = rng.uniform(100, 1000, n)
    idx = pd.date_range("2026-01-01", periods=n, freq="h")
    return pd.DataFrame({"open": opens, "high": highs, "low": lows, "close": closes, "volume": volumes}, index=idx)


def test_ema_tracks_price_direction():
    df = make_trending_df()
    e20 = indicators.ema(df["close"], 20)
    assert e20.iloc[-1] > e20.iloc[0]


def test_rsi_bounded_0_100():
    df = make_trending_df(noise=2.0)
    r = indicators.rsi(df["close"])
    assert (r >= 0).all() and (r <= 100).all()


def test_rsi_strong_uptrend_is_high():
    df = make_trending_df(step=1.0, noise=0.0)
    r = indicators.rsi(df["close"])
    assert r.iloc[-1] > 60


def test_macd_keys_present():
    df = make_trending_df()
    result = indicators.macd(df["close"])
    assert set(result.keys()) == {"macd", "signal", "histogram"}


def test_atr_positive():
    df = make_trending_df(noise=1.0)
    a = indicators.atr(df)
    assert (a.dropna() > 0).all()


def test_adx_bounded():
    df = make_trending_df(noise=1.0)
    result = indicators.adx(df)
    assert (result["adx"] >= 0).all()


def test_trend_direction_bullish():
    df = make_trending_df(step=1.0, noise=0.0)
    close = df["close"]
    e_fast = indicators.ema(close, 5)
    e_slow = indicators.ema(close, 20)
    assert indicators.trend_direction(close, e_fast, e_slow) == "bullish"


def test_compute_all_indicators_returns_expected_keys():
    df = make_trending_df()
    result = indicators.compute_all_indicators(df)
    for key in ("ema", "rsi", "macd", "stoch_rsi", "atr", "adx", "vwap", "relative_volume", "short_term_trend", "long_term_trend", "trend_strength"):
        assert key in result
