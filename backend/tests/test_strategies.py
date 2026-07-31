"""Every strategy must default to NO TRADE, never crash, and never fabricate
a signal on random/insufficient data."""

from datetime import datetime, timedelta, timezone

import numpy as np
import pandas as pd
import pytest

from app.db.seed_data import STRATEGIES
from app.models.enums import SignalDirection
from app.services.features.engine import feature_engine
from app.services.strategies.registry import STRATEGY_REGISTRY, build_strategy


def _random_walk_df(n=300, seed=7) -> pd.DataFrame:
    rng = np.random.default_rng(seed)
    now = datetime(2026, 1, 1, tzinfo=timezone.utc)
    prices = 1.0800 + np.cumsum(rng.normal(0, 0.00005, n))
    rows = []
    for i in range(n):
        ts = now + timedelta(minutes=i)
        open_p = prices[i - 1] if i > 0 else prices[0]
        close_p = prices[i]
        high_p = max(open_p, close_p) + abs(rng.normal(0, 0.00003))
        low_p = min(open_p, close_p) - abs(rng.normal(0, 0.00003))
        rows.append({"timestamp": ts, "open": open_p, "high": high_p, "low": low_p, "close": close_p, "volume": 100})
    return pd.DataFrame(rows)


STRATEGY_CONFIGS = {s["strategy_code"]: s["configuration_json"] for s in STRATEGIES}


@pytest.mark.parametrize("strategy_code", list(STRATEGY_REGISTRY.keys()))
def test_strategy_never_crashes_and_defaults_safely(strategy_code):
    df = _random_walk_df()
    features = feature_engine.compute(df)
    assert features is not None

    strategy = build_strategy(strategy_code, STRATEGY_CONFIGS[strategy_code])
    result = strategy.evaluate(df, features, None)

    assert result.direction in (SignalDirection.CALL, SignalDirection.PUT, SignalDirection.NO_TRADE)
    if result.direction == SignalDirection.NO_TRADE:
        assert result.confidence == 0.0
    else:
        assert 0.0 <= result.confidence <= 100.0
        assert len(result.reasons) > 0


def test_no_strategy_signals_without_reasons():
    """A CALL/PUT must always carry at least one human-readable reason -
    never a bare direction with no justification."""
    df = _random_walk_df(seed=123)
    features = feature_engine.compute(df)
    for strategy_code in STRATEGY_REGISTRY:
        strategy = build_strategy(strategy_code, STRATEGY_CONFIGS[strategy_code])
        result = strategy.evaluate(df, features, None)
        if result.direction != SignalDirection.NO_TRADE:
            assert all(r.text for r in result.reasons)


def test_flat_zero_volatility_market_never_produces_a_signal():
    """A perfectly flat market (no volatility at all) must never produce
    CALL/PUT from any strategy - there is nothing to trade."""
    now = datetime(2026, 1, 1, tzinfo=timezone.utc)
    rows = [
        {
            "timestamp": now + timedelta(minutes=i),
            "open": 1.0800,
            "high": 1.0800,
            "low": 1.0800,
            "close": 1.0800,
            "volume": 0,
        }
        for i in range(300)
    ]
    df = pd.DataFrame(rows)
    features = feature_engine.compute(df)
    assert features is not None

    for strategy_code in STRATEGY_REGISTRY:
        strategy = build_strategy(strategy_code, STRATEGY_CONFIGS[strategy_code])
        result = strategy.evaluate(df, features, None)
        assert result.direction == SignalDirection.NO_TRADE
