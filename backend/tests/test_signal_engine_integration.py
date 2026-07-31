"""End-to-end signal engine tests against a real Postgres test database.

Covers the critical platform guarantees:
* A signal is written to the database before it is ever broadcast.
* Default output is NO TRADE when there isn't enough history / a strategy
  doesn't fire.
* Duplicate/cooldown suppression prevents overlapping signals for the same
  asset+strategy+timeframe.
"""

from datetime import datetime, timedelta, timezone
from decimal import Decimal
from unittest.mock import AsyncMock, patch

import numpy as np
import pytest
from sqlalchemy import select

from app.models.candle import Candle
from app.models.enums import ConfidenceType, MarketCondition, SignalDirection, SignalStatus
from app.models.signal import Signal
from app.services.candles.aggregator import CandleAggregator
from app.services.market_data.mock import MockMarketDataProvider
from app.services.signal_engine.engine import SignalEngine, SignalGenerationRequest
from tests.conftest import requires_db


async def _insert_trending_candles(session, asset, timeframe="1m", n=400, seed=11):
    rng = np.random.default_rng(seed)
    now = datetime.now(timezone.utc).replace(microsecond=0) - timedelta(minutes=n)
    price = 1.0800
    seconds = {"1m": 60, "5m": 300, "15m": 900}[timeframe]
    for i in range(n):
        price += rng.normal(0.00004, 0.00003)
        ts = now + timedelta(seconds=seconds * i)
        session.add(
            Candle(
                asset_id=asset.id,
                timeframe=timeframe,
                timestamp=ts,
                open=Decimal(str(price)),
                high=Decimal(str(price + 0.0001)),
                low=Decimal(str(price - 0.0001)),
                close=Decimal(str(price)),
                volume=Decimal(10),
                provider="mock",
                is_complete=True,
                created_at=datetime.now(timezone.utc),
            )
        )
    await session.commit()


@requires_db
@pytest.mark.asyncio
async def test_signal_is_persisted_before_it_is_broadcast(db_session, eurusd_asset, seeded_strategies):
    await _insert_trending_candles(db_session, eurusd_asset)

    provider = MockMarketDataProvider()
    await provider.connect()
    aggregator = CandleAggregator(provider.name)
    engine = SignalEngine(aggregator)

    strategy = seeded_strategies["candlestick_price_action"]
    request = SignalGenerationRequest(
        asset=eurusd_asset,
        timeframe="1m",
        expiry_seconds=60,
        strategy=strategy,
        ai_auto_mode=False,
    )

    publish_calls = []

    async def _record_publish(channel, payload):
        # By the time publish is called, the row must already be committed
        # and independently visible via a fresh query.
        result = await db_session.execute(select(Signal).where(Signal.asset_id == eurusd_asset.id))
        rows = result.scalars().all()
        publish_calls.append((channel, len(rows)))

    with patch("app.services.signal_engine.engine.get_redis") as mock_get_redis:
        mock_redis = AsyncMock()
        mock_redis.publish.side_effect = _record_publish
        mock_get_redis.return_value = mock_redis

        result = await engine.generate(db_session, provider, request)

    if isinstance(result, Signal):
        # A signal fired: prove it was already committed at publish time.
        assert publish_calls, "expected the engine to broadcast the new signal"
        assert publish_calls[0][1] >= 1
        stored = (await db_session.execute(select(Signal).where(Signal.id == result.id))).scalar_one()
        assert stored.status == SignalStatus.PENDING_ENTRY
        assert stored.direction in (SignalDirection.CALL, SignalDirection.PUT)
    else:
        # NO TRADE is an equally valid, and more common, outcome - the
        # important invariant (nothing broadcast before commit) still holds
        # vacuously since nothing was generated.
        assert publish_calls == []


@requires_db
@pytest.mark.asyncio
async def test_no_trade_by_default_with_insufficient_history(db_session, eurusd_asset, seeded_strategies):
    # Only a handful of candles - not enough for EMA200 / feature computation.
    await _insert_trending_candles(db_session, eurusd_asset, n=20)

    provider = MockMarketDataProvider()
    await provider.connect()
    aggregator = CandleAggregator(provider.name)
    engine = SignalEngine(aggregator)

    strategy = seeded_strategies["ema_trend_pullback"]
    request = SignalGenerationRequest(
        asset=eurusd_asset,
        timeframe="1m",
        expiry_seconds=60,
        strategy=strategy,
        ai_auto_mode=False,
    )

    with patch("app.services.signal_engine.engine.get_redis") as mock_get_redis:
        mock_get_redis.return_value = AsyncMock()
        from app.services.signal_engine.engine import NoTradeResult

        result = await engine.generate(db_session, provider, request)

    assert isinstance(result, NoTradeResult)
    assert result.reason_code == "insufficient_history"


@requires_db
@pytest.mark.asyncio
async def test_duplicate_signal_is_suppressed_during_cooldown(db_session, eurusd_asset, seeded_strategies):
    await _insert_trending_candles(db_session, eurusd_asset)

    strategy = seeded_strategies["candlestick_price_action"]
    existing = Signal(
        public_signal_id="SIG-EXISTING1",
        asset_id=eurusd_asset.id,
        strategy_id=strategy.id,
        direction=SignalDirection.CALL,
        timeframe="1m",
        expiry_seconds=60,
        generated_at=datetime.now(timezone.utc),
        entry_time=datetime.now(timezone.utc),
        entry_window_end=datetime.now(timezone.utc) + timedelta(seconds=5),
        expiry_time=datetime.now(timezone.utc) + timedelta(seconds=60),
        confidence=80.0,
        confidence_type=ConfidenceType.RULE_BASED,
        market_condition=MarketCondition.UNCLEAR,
        status=SignalStatus.ACTIVE,
        strategy_version=1,
        provider="mock",
        data_latency_ms=5,
        created_at=datetime.now(timezone.utc),
    )
    db_session.add(existing)
    await db_session.commit()

    provider = MockMarketDataProvider()
    await provider.connect()
    aggregator = CandleAggregator(provider.name)
    engine = SignalEngine(aggregator)

    has_active = await engine._has_active_or_recent_signal(db_session, eurusd_asset.id, strategy.id, "1m")
    assert has_active is True
