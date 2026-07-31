"""Result checker: WIN/LOSS/DRAW/DATA_ERROR resolution and immutability."""

from datetime import datetime, timedelta, timezone
from decimal import Decimal

import pytest
from sqlalchemy import select

from app.models.enums import ConfidenceType, MarketCondition, SignalDirection, SignalResult, SignalStatus
from app.models.signal import Signal
from app.services.candles.aggregator import LATEST_PRICES
from app.services.result_checker import check_results
from tests.conftest import requires_db


def _make_signal(asset_id, strategy_id, direction, entry_price, expiry_seconds_ago=5) -> Signal:
    now = datetime.now(timezone.utc)
    return Signal(
        public_signal_id=f"SIG-TEST-{direction}-{expiry_seconds_ago}",
        asset_id=asset_id,
        strategy_id=strategy_id,
        direction=direction,
        timeframe="1m",
        expiry_seconds=60,
        generated_at=now - timedelta(seconds=70),
        entry_time=now - timedelta(seconds=65),
        entry_window_end=now - timedelta(seconds=60),
        entry_price=Decimal(str(entry_price)),
        expiry_time=now - timedelta(seconds=expiry_seconds_ago),
        confidence=80.0,
        confidence_type=ConfidenceType.RULE_BASED,
        market_condition=MarketCondition.UNCLEAR,
        status=SignalStatus.ACTIVE,
        strategy_version=1,
        provider="mock",
        data_latency_ms=5,
        created_at=now - timedelta(seconds=70),
    )


@requires_db
@pytest.mark.asyncio
async def test_call_wins_when_price_rises(db_session, eurusd_asset, seeded_strategies):
    strategy = seeded_strategies["ema_trend_pullback"]
    signal = _make_signal(eurusd_asset.id, strategy.id, SignalDirection.CALL, entry_price="1.0800")
    db_session.add(signal)
    await db_session.commit()

    LATEST_PRICES[eurusd_asset.provider_symbol] = (Decimal("1.0850"), datetime.now(timezone.utc))
    await check_results(db_session)

    refreshed = (await db_session.execute(select(Signal).where(Signal.id == signal.id))).scalar_one()
    assert refreshed.status == SignalStatus.COMPLETED
    assert refreshed.result == SignalResult.WIN
    assert refreshed.completed_at is not None


@requires_db
@pytest.mark.asyncio
async def test_call_loses_when_price_falls(db_session, eurusd_asset, seeded_strategies):
    strategy = seeded_strategies["ema_trend_pullback"]
    signal = _make_signal(eurusd_asset.id, strategy.id, SignalDirection.CALL, entry_price="1.0800")
    db_session.add(signal)
    await db_session.commit()

    LATEST_PRICES[eurusd_asset.provider_symbol] = (Decimal("1.0750"), datetime.now(timezone.utc))
    await check_results(db_session)

    refreshed = (await db_session.execute(select(Signal).where(Signal.id == signal.id))).scalar_one()
    assert refreshed.result == SignalResult.LOSS


@requires_db
@pytest.mark.asyncio
async def test_put_wins_when_price_falls(db_session, eurusd_asset, seeded_strategies):
    strategy = seeded_strategies["ema_trend_pullback"]
    signal = _make_signal(eurusd_asset.id, strategy.id, SignalDirection.PUT, entry_price="1.0800")
    db_session.add(signal)
    await db_session.commit()

    LATEST_PRICES[eurusd_asset.provider_symbol] = (Decimal("1.0750"), datetime.now(timezone.utc))
    await check_results(db_session)

    refreshed = (await db_session.execute(select(Signal).where(Signal.id == signal.id))).scalar_one()
    assert refreshed.result == SignalResult.WIN


@requires_db
@pytest.mark.asyncio
async def test_exact_same_price_is_a_draw(db_session, eurusd_asset, seeded_strategies):
    strategy = seeded_strategies["ema_trend_pullback"]
    signal = _make_signal(eurusd_asset.id, strategy.id, SignalDirection.CALL, entry_price="1.0800")
    db_session.add(signal)
    await db_session.commit()

    LATEST_PRICES[eurusd_asset.provider_symbol] = (Decimal("1.0800"), datetime.now(timezone.utc))
    await check_results(db_session)

    refreshed = (await db_session.execute(select(Signal).where(Signal.id == signal.id))).scalar_one()
    assert refreshed.result == SignalResult.DRAW


@requires_db
@pytest.mark.asyncio
async def test_missing_expiry_price_produces_data_error_not_a_guess(db_session, eurusd_asset, seeded_strategies):
    strategy = seeded_strategies["ema_trend_pullback"]
    signal = _make_signal(eurusd_asset.id, strategy.id, SignalDirection.CALL, entry_price="1.0800")
    db_session.add(signal)
    await db_session.commit()

    LATEST_PRICES.pop(eurusd_asset.provider_symbol, None)
    await check_results(db_session)

    refreshed = (await db_session.execute(select(Signal).where(Signal.id == signal.id))).scalar_one()
    assert refreshed.result == SignalResult.DATA_ERROR


@requires_db
@pytest.mark.asyncio
async def test_signals_router_never_exposes_a_delete_or_edit_endpoint():
    """Losing signals must never be deletable/editable by users. Assert the
    public signals router does not register DELETE or PATCH/PUT routes."""
    from app.api.v1 import signals as signals_router

    methods = set()
    for route in signals_router.router.routes:
        methods.update(getattr(route, "methods", set()) or set())
    assert "DELETE" not in methods
    assert "PATCH" not in methods
    assert "PUT" not in methods
