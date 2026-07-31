"""Direct tests of every NO TRADE filter predicate."""

from datetime import datetime, timedelta, timezone

import pandas as pd

from app.models.strategy import Strategy
from app.services.market_data.base import ProviderHealth
from app.services.market_data.mock import MockMarketDataProvider
from app.services.market_data.twelvedata import TwelveDataProvider
from app.services.signal_engine import filters


class _StubProvider:
    name = "stub"

    def __init__(self, health: ProviderHealth):
        self.health = health


def test_disconnected_feed_is_rejected():
    reason = filters.check_provider_health(_StubProvider(ProviderHealth(connected=False)))
    assert reason is not None
    assert "disconnected" in reason.lower()


def test_high_latency_feed_is_rejected():
    health = ProviderHealth(connected=True, latency_ms=99999.0)
    reason = filters.check_provider_health(_StubProvider(health))
    assert reason is not None
    assert "latency" in reason.lower()


def test_delayed_feed_is_rejected():
    health = ProviderHealth(connected=True, latency_ms=10.0, is_delayed=True)
    reason = filters.check_provider_health(_StubProvider(health))
    assert reason is not None


def test_healthy_feed_passes():
    health = ProviderHealth(connected=True, latency_ms=10.0, is_delayed=False)
    assert filters.check_provider_health(_StubProvider(health)) is None


def test_insufficient_history_is_rejected():
    df = pd.DataFrame([{"close": 1.0}] * 10)
    reason = filters.check_sufficient_history(df)
    assert reason is not None
    assert "insufficient" in reason.lower()

    assert filters.check_sufficient_history(None) is not None


def test_sufficient_history_passes():
    df = pd.DataFrame([{"close": 1.0}] * (filters.MIN_CANDLES_REQUIRED + 1))
    assert filters.check_sufficient_history(df) is None


def test_missing_candle_gap_is_rejected():
    assert filters.check_missing_candle(True) is not None
    assert filters.check_missing_candle(False) is None


def test_short_expiry_disabled_on_low_granularity_provider():
    provider = TwelveDataProvider(api_key="fake")
    reason = filters.check_expiry_supported_by_provider(provider, 15)
    assert reason is not None


def test_short_expiry_enabled_on_mock_provider():
    provider = MockMarketDataProvider()
    assert filters.check_expiry_supported_by_provider(provider, 15) is None


def test_expiry_not_supported_by_strategy():
    strategy = Strategy(strategy_code="x", name="x", description="x", version=1, supported_expiries_json=[60, 120])
    assert filters.check_expiry_supported_by_strategy(strategy, 15) is not None
    assert filters.check_expiry_supported_by_strategy(strategy, 60) is None


def test_confidence_below_threshold_is_rejected():
    assert filters.check_confidence_threshold(40.0, 55.0) is not None
    assert filters.check_confidence_threshold(60.0, 55.0) is None


def test_entry_window_already_passed_is_rejected():
    now = datetime.now(timezone.utc)
    window_end = now - timedelta(seconds=10)
    assert filters.check_entry_window_not_passed(window_end, now) is not None

    future_window_end = now + timedelta(seconds=10)
    assert filters.check_entry_window_not_passed(future_window_end, now) is None
