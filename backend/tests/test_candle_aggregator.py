"""Candle aggregation: duplicate ticks, out-of-order ticks, missing-candle
detection. Uses an in-memory Asset stand-in and a fake Redis publish so no
network/DB is required for these pure aggregation-logic tests."""

from datetime import datetime, timedelta, timezone
from decimal import Decimal
from unittest.mock import AsyncMock, patch

import pytest

from app.services.candles.aggregator import CandleAggregator, bucket_start
from app.services.market_data.base import Tick


class _FakeAsset:
    def __init__(self, symbol="EUR/USD"):
        self.id = "asset-1"
        self.symbol = symbol
        self.provider_symbol = symbol


def _tick(symbol: str, price: str, ts: datetime) -> Tick:
    return Tick(provider_symbol=symbol, price=Decimal(price), timestamp=ts)


@pytest.fixture(autouse=True)
def _mock_redis():
    with patch("app.services.candles.aggregator.get_redis") as mock_get_redis:
        mock_redis = AsyncMock()
        mock_get_redis.return_value = mock_redis
        yield mock_redis


def test_bucket_start_floors_to_timeframe():
    ts = datetime(2026, 1, 1, 12, 0, 37, tzinfo=timezone.utc)
    assert bucket_start(ts, 60) == datetime(2026, 1, 1, 12, 0, 0, tzinfo=timezone.utc)
    assert bucket_start(ts, 300) == datetime(2026, 1, 1, 12, 0, 0, tzinfo=timezone.utc)


def test_duplicate_tick_is_detected_and_ignored():
    aggregator = CandleAggregator("mock")
    asset = _FakeAsset()
    ts = datetime(2026, 1, 1, 12, 0, 0, tzinfo=timezone.utc)
    tick = _tick("EUR/USD", "1.0850", ts)

    assert aggregator.is_duplicate(asset.provider_symbol, "1m", tick) is False
    # The exact same (timestamp, price) tick arriving again must be ignored.
    assert aggregator.is_duplicate(asset.provider_symbol, "1m", tick) is True


def test_different_price_same_timestamp_is_not_a_duplicate():
    aggregator = CandleAggregator("mock")
    asset = _FakeAsset()
    ts = datetime(2026, 1, 1, 12, 0, 0, tzinfo=timezone.utc)

    assert aggregator.is_duplicate(asset.provider_symbol, "1m", _tick("EUR/USD", "1.0850", ts)) is False
    assert aggregator.is_duplicate(asset.provider_symbol, "1m", _tick("EUR/USD", "1.0851", ts)) is False


@pytest.mark.asyncio
async def test_ingest_tick_builds_and_closes_candles():
    aggregator = CandleAggregator("mock")
    asset = _FakeAsset()
    session = AsyncMock()
    base = datetime(2026, 1, 1, 12, 0, 0, tzinfo=timezone.utc)

    # Two ticks within the same 1m bucket should not close a candle yet.
    result1 = await aggregator.ingest_tick(session, asset, "1m", _tick("EUR/USD", "1.0850", base))
    result2 = await aggregator.ingest_tick(
        session, asset, "1m", _tick("EUR/USD", "1.0855", base + timedelta(seconds=30))
    )
    assert result1 is None
    assert result2 is None

    # A tick in the next bucket must close the previous candle.
    result3 = await aggregator.ingest_tick(
        session, asset, "1m", _tick("EUR/USD", "1.0860", base + timedelta(seconds=61))
    )
    assert result3 is not None
    assert result3["is_complete"] is True
    assert result3["open"] == "1.0850"
    assert result3["close"] == "1.0855"


@pytest.mark.asyncio
async def test_missing_candle_gap_is_flagged():
    aggregator = CandleAggregator("mock")
    asset = _FakeAsset()
    session = AsyncMock()
    base = datetime(2026, 1, 1, 12, 0, 0, tzinfo=timezone.utc)

    await aggregator.ingest_tick(session, asset, "1m", _tick("EUR/USD", "1.0850", base))
    assert aggregator.has_missing_gap(asset.provider_symbol, "1m") is False

    # Jump two full bars ahead (a 1-minute candle went missing in between).
    await aggregator.ingest_tick(session, asset, "1m", _tick("EUR/USD", "1.0860", base + timedelta(seconds=125)))
    assert aggregator.has_missing_gap(asset.provider_symbol, "1m") is True
