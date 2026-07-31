"""Backtest engine: no-future-data leakage and basic metrics correctness."""

import itertools
from datetime import datetime, timedelta, timezone

import numpy as np
import pandas as pd

from app.db.seed_data import STRATEGIES
from app.models.enums import SignalDirection
from app.services.backtest.engine import run_backtest
from app.services.strategies.base import BaseStrategy, StrategyEvaluation


def _trending_df(n=500, seed=5) -> pd.DataFrame:
    rng = np.random.default_rng(seed)
    now = datetime(2026, 1, 1, tzinfo=timezone.utc)
    prices = 1.0800 + np.cumsum(rng.normal(0, 0.00006, n))
    rows = []
    for i in range(n):
        ts = now + timedelta(minutes=i)
        open_p = prices[i - 1] if i > 0 else prices[0]
        close_p = prices[i]
        rows.append(
            {
                "timestamp": ts,
                "open": open_p,
                "high": max(open_p, close_p) + 0.00003,
                "low": min(open_p, close_p) - 0.00003,
                "close": close_p,
                "volume": 100,
            }
        )
    return pd.DataFrame(rows)


class _SpyStrategy(BaseStrategy):
    """Records exactly what data it was shown on every call, and always
    signals CALL so the backtest engine records a bar - this is purely to
    verify no-look-ahead, not real strategy logic."""

    code = "spy"

    def __init__(self, config=None):
        super().__init__(config or {})
        self.seen_lengths: list[int] = []
        self.seen_last_timestamps: list = []

    def evaluate(self, df, features, extra_timeframes=None):
        self.seen_lengths.append(len(df))
        self.seen_last_timestamps.append(df.iloc[-1]["timestamp"])
        from app.services.strategies.base import SignalReasonItem

        return StrategyEvaluation(
            direction=SignalDirection.CALL,
            confidence=90.0,
            reasons=[SignalReasonItem("spy", "always-call for leakage testing", 1.0)],
        )


def test_backtest_never_shows_the_strategy_future_candles():
    df = _trending_df()
    spy = _SpyStrategy()
    run_backtest(df, spy, "spy", expiry_seconds=60, timeframe_seconds=60, cooldown_seconds=0)

    assert len(spy.seen_lengths) > 0
    for call_index, window_len in enumerate(spy.seen_lengths):
        # window_len candles were visible; the (window_len)-th candle's
        # timestamp must equal what the loop index implies, and must never
        # exceed the full dataset's corresponding timestamp.
        last_ts = spy.seen_last_timestamps[call_index]
        # Find that same timestamp's position in the full dataframe.
        full_index = df.index[df["timestamp"] == last_ts][0]
        assert window_len == full_index + 1, "strategy was shown a window that does not end exactly at the current bar"


def test_backtest_metrics_add_up():
    df = _trending_df()
    strategy_def = next(s for s in STRATEGIES if s["strategy_code"] == "ema_trend_pullback")
    from app.services.strategies.registry import build_strategy

    strategy = build_strategy("ema_trend_pullback", strategy_def["configuration_json"])
    signals, metrics = run_backtest(df, strategy, "ema_trend_pullback", expiry_seconds=60, timeframe_seconds=60)

    assert metrics.total_signals == len(signals)
    assert metrics.wins + metrics.losses + metrics.draws == metrics.total_signals
    if metrics.total_signals:
        assert 0 <= metrics.win_rate <= 100


def test_backtest_respects_cooldown_between_signals():
    df = _trending_df(seed=99)
    spy = _SpyStrategy()
    signals, _ = run_backtest(df, spy, "spy", expiry_seconds=60, timeframe_seconds=60, cooldown_seconds=300)
    for prev, nxt in itertools.pairwise(signals):
        assert (nxt.timestamp - prev.timestamp).total_seconds() >= 300
