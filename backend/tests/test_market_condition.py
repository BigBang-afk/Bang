from datetime import datetime, timedelta, timezone

import numpy as np
import pandas as pd

from app.models.enums import MarketCondition
from app.services.features.engine import feature_engine
from app.services.market_condition.engine import classify, is_strategy_compatible


def _flat_df(n=300) -> pd.DataFrame:
    now = datetime(2026, 1, 1, tzinfo=timezone.utc)
    rows = [
        {
            "timestamp": now + timedelta(minutes=i),
            "open": 1.08,
            "high": 1.0801,
            "low": 1.0799,
            "close": 1.08,
            "volume": 10,
        }
        for i in range(n)
    ]
    return pd.DataFrame(rows)


def _strong_uptrend_df(n=300) -> pd.DataFrame:
    now = datetime(2026, 1, 1, tzinfo=timezone.utc)
    rng = np.random.default_rng(1)
    prices = 1.0800 + np.cumsum(np.full(n, 0.00015) + rng.normal(0, 0.00002, n))
    rows = []
    for i in range(n):
        ts = now + timedelta(minutes=i)
        open_p = prices[i - 1] if i > 0 else prices[0]
        close_p = prices[i]
        rows.append(
            {
                "timestamp": ts,
                "open": open_p,
                "high": max(open_p, close_p) + 0.00002,
                "low": min(open_p, close_p) - 0.00002,
                "close": close_p,
                "volume": 100,
            }
        )
    return pd.DataFrame(rows)


def test_classify_returns_a_valid_enum_member():
    for df in (_flat_df(), _strong_uptrend_df()):
        features = feature_engine.compute(df)
        condition = classify(features)
        assert isinstance(condition, MarketCondition)


def test_strong_uptrend_is_classified_as_bullish():
    features = feature_engine.compute(_strong_uptrend_df())
    condition = classify(features)
    assert condition in (MarketCondition.STRONG_BULLISH_TREND, MarketCondition.WEAK_BULLISH_TREND)


def test_trend_strategy_disabled_in_range_market():
    compatible, reason = is_strategy_compatible("ema_trend_pullback", MarketCondition.RANGE)
    assert compatible is False
    assert reason is not None


def test_reversal_strategy_disabled_during_breakout():
    compatible, _reason = is_strategy_compatible("support_resistance_rejection", MarketCondition.BREAKOUT)
    assert compatible is False


def test_unrestricted_strategy_condition_pair_is_compatible():
    compatible, reason = is_strategy_compatible("ema_trend_pullback", MarketCondition.STRONG_BULLISH_TREND)
    assert compatible is True
    assert reason is None
