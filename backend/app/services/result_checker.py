"""Background result checker and signal-lifecycle ticker.

Runs on a short interval (see app/worker) and performs three jobs, always in
this order so state transitions stay consistent:

1. Entry capture: PENDING_ENTRY -> ACTIVE (captures provider entry price at
   the exact entry_time) or -> ENTRY_WINDOW_CLOSED/DATA_ERROR if no price was
   available before the entry window closed.
2. Expiring flag: ACTIVE -> EXPIRING once inside the final-seconds window,
   for admin/API visibility (the frontend also derives this from countdown
   math independently).
3. Result check: ACTIVE/EXPIRING whose expiry_time has passed -> CHECKING_RESULT
   -> COMPLETED with WIN/LOSS/DRAW/DATA_ERROR, broadcast over WebSocket.

Results, once completed, are never editable by users. Admin corrections (if
ever required) must go through a dedicated endpoint that writes an
AuditLog entry - see app/api/v1/admin.py.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from decimal import Decimal

import orjson
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import get_logger
from app.db.redis import get_redis
from app.models.asset import Asset
from app.models.enums import SignalDirection, SignalResult, SignalStatus
from app.models.signal import Signal
from app.services.candles.aggregator import get_latest_price
from app.services.signal_engine.countdown import EXPIRING_THRESHOLD_SECONDS

logger = get_logger(__name__)


async def _broadcast_signal_update(signal: Signal) -> None:
    redis = get_redis()
    payload = {
        "public_signal_id": signal.public_signal_id,
        "status": signal.status.value,
        "result": signal.result.value,
        "entry_price": str(signal.entry_price) if signal.entry_price is not None else None,
        "expiry_price": str(signal.expiry_price) if signal.expiry_price is not None else None,
    }
    await redis.publish("signals:updates", orjson.dumps(payload).decode())
    await redis.publish(f"signals:{signal.public_signal_id}", orjson.dumps(payload).decode())


async def capture_entries(session: AsyncSession) -> int:
    now = datetime.now(timezone.utc)
    result = await session.execute(
        select(Signal, Asset)
        .join(Asset, Signal.asset_id == Asset.id)
        .where(Signal.status == SignalStatus.PENDING_ENTRY, Signal.entry_time <= now)
    )
    processed = 0
    for signal, asset in result.all():
        price_info = get_latest_price(asset.provider_symbol)
        if price_info is not None:
            price, _ts = price_info
            signal.entry_price = price
            signal.status = SignalStatus.ACTIVE
            processed += 1
        elif now > signal.entry_window_end:
            signal.status = SignalStatus.ENTRY_WINDOW_CLOSED
            signal.result = SignalResult.DATA_ERROR
            signal.completed_at = now
            processed += 1
        await _broadcast_signal_update(signal)
    if processed:
        await session.commit()
    return processed


async def mark_expiring(session: AsyncSession) -> int:
    now = datetime.now(timezone.utc)
    result = await session.execute(
        select(Signal).where(
            Signal.status == SignalStatus.ACTIVE,
            Signal.expiry_time <= now + timedelta(seconds=EXPIRING_THRESHOLD_SECONDS),
        )
    )
    signals = result.scalars().all()
    for signal in signals:
        signal.status = SignalStatus.EXPIRING
    if signals:
        await session.commit()
    return len(signals)


async def check_results(session: AsyncSession) -> int:
    now = datetime.now(timezone.utc)
    result = await session.execute(
        select(Signal, Asset)
        .join(Asset, Signal.asset_id == Asset.id)
        .where(Signal.status.in_([SignalStatus.ACTIVE, SignalStatus.EXPIRING]), Signal.expiry_time <= now)
    )
    processed = 0
    for signal, asset in result.all():
        signal.status = SignalStatus.CHECKING_RESULT
        price_info = get_latest_price(asset.provider_symbol)

        if price_info is None or signal.entry_price is None:
            signal.result = SignalResult.DATA_ERROR
        else:
            expiry_price, _ts = price_info
            signal.expiry_price = expiry_price
            entry_price = Decimal(str(signal.entry_price))
            if expiry_price == entry_price:
                signal.result = SignalResult.DRAW
            elif signal.direction == SignalDirection.CALL:
                signal.result = SignalResult.WIN if expiry_price > entry_price else SignalResult.LOSS
            else:  # PUT
                signal.result = SignalResult.WIN if expiry_price < entry_price else SignalResult.LOSS

        signal.status = SignalStatus.COMPLETED
        signal.completed_at = datetime.now(timezone.utc)
        processed += 1
        logger.info(
            "signal_result_checked",
            public_signal_id=signal.public_signal_id,
            result=signal.result.value,
            direction=signal.direction.value,
        )
        await _broadcast_signal_update(signal)

    if processed:
        await session.commit()
    return processed


async def run_lifecycle_tick(session: AsyncSession) -> dict[str, int]:
    entries = await capture_entries(session)
    expiring = await mark_expiring(session)
    completed = await check_results(session)
    return {"entries_captured": entries, "marked_expiring": expiring, "results_completed": completed}
