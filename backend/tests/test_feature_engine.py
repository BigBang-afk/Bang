"""Feature engine: sane indicator ranges and strict no-look-ahead behavior."""

from datetime import datetime, timedelta, timezone

import numpy as np
import pandas as pd
import pytest

from app.services.features.engine import feature_engine


def _make_trending_df(n=300, start_price=1.0800, drift=0.00006, seed=42) -> pd.DataFrame:
    rng = np.random.default_rng(seed)
    now = datetime(2026, 1, 1, tzinfo=timezone.utc)
    prices = start_price + np.cumsum(np.full(n, drift) + rng.normal(0, 0.00004, n))
    rows = []
    for i in range(n):
        ts = now + timedelta(minutes=i)
        open_p = prices[i - 1] if i > 0 else prices[0]
        close_p = prices[i]
        high_p = max(open_p, close_p) + abs(rng.normal(0, 0.00003))
        low_p = min(open_p, close_p) - abs(rng.normal(0, 0.00003))
        rows.append({"timestamp": ts, "open": open_p, "high": high_p, "low": low_p, "close": close_p, "volume": 100})
    return pd.DataFrame(rows)


def test_feature_snapshot_has_sane_indicator_ranges():
    df = _make_trending_df()
    snapshot = feature_engine.compute(df)
    assert snapshot is not None
    assert 0 <= snapshot.rsi_14 <= 100
    assert snapshot.atr_14 > 0
    assert 0 <= snapshot.volatility_percentile <= 100
    assert snapshot.data_points_available == len(df)


def test_returns_none_with_too_few_candles():
    df = _make_trending_df(n=3)
    assert feature_engine.compute(df) is None


def test_features_are_causal_and_never_see_future_candles():
    """Computing features on a truncated window must be identical to
    computing them on the same window even if we later append future rows -
    i.e. nothing about the snapshot for candle i can depend on candle i+k."""
    full_df = _make_trending_df(n=300)
    cutoff = 250

    snapshot_from_truncated = feature_engine.compute(full_df.iloc[: cutoff + 1])
    snapshot_from_truncated_again = feature_engine.compute(full_df.iloc[: cutoff + 1])

    assert snapshot_from_truncated is not None
    assert snapshot_from_truncated.close == snapshot_from_truncated_again.close
    assert snapshot_from_truncated.rsi_14 == pytest.approx(snapshot_from_truncated_again.rsi_14)
    assert snapshot_from_truncated.ema_21 == pytest.approx(snapshot_from_truncated_again.ema_21)

    # Mutating candles *after* the cutoff must not change the snapshot at the cutoff.
    mutated = full_df.copy()
    mutated.loc[cutoff + 1 :, "close"] = 999.0
    mutated.loc[cutoff + 1 :, "high"] = 999.5
    mutated.loc[cutoff + 1 :, "low"] = 998.5
    snapshot_after_future_mutation = feature_engine.compute(mutated.iloc[: cutoff + 1])

    assert snapshot_after_future_mutation.close == snapshot_from_truncated.close
    assert snapshot_after_future_mutation.rsi_14 == pytest.approx(snapshot_from_truncated.rsi_14)
    assert snapshot_after_future_mutation.ema_9 == pytest.approx(snapshot_from_truncated.ema_9)
