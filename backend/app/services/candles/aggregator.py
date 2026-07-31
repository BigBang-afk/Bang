"""Realtime candle aggregation from live ticks.

Responsibilities (per platform spec):
* Build 1m / 5m / 15m candles from a live tick stream.
* Prevent duplicate ticks from creating duplicate/corrupted candles.
* Detect missing candles (gaps) and flag them for the NO TRADE filter.
* Persist only complete candles; publish both in-progress and complete
  candles over Redis pub/sub for WebSocket broadcast.
"""

from __future__ import annotations

import math
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from decimal import Decimal

import orjson
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import get_logger
from app.db.redis import get_redis
from app.models.asset import Asset
from app.models.candle import Candle
from app.services.market_data.base import Tick

logger = get_logger(__name__)

TIMEFRAME_SECONDS: dict[str, int] = {"1m": 60, "5m": 300, "15m": 900}

# Latest known live price per provider_symbol, updated on every ingested tick.
# Used by the signal engine / result checker to capture entry and expiry
# prices at the exact synchronized moment they are due, without needing a
# separate tick-storage table.
LATEST_PRICES: dict[str, tuple[Decimal, datetime]] = {}


def get_latest_price(provider_symbol: str) -> tuple[Decimal, datetime] | None:
    return LATEST_PRICES.get(provider_symbol)


def bucket_start(ts: datetime, timeframe_seconds: int) -> datetime:
    epoch_seconds = ts.timestamp()
    floored = math.floor(epoch_seconds / timeframe_seconds) * timeframe_seconds
    return datetime.fromtimestamp(floored, tz=timezone.utc)


@dataclass
class InProgressCandle:
    bucket_start: datetime
    open: Decimal
    high: Decimal
    low: Decimal
    close: Decimal
    volume: Decimal = Decimal(0)
    tick_count: int = 0

    def apply(self, price: Decimal, volume: Decimal) -> None:
        self.high = max(self.high, price)
        self.low = min(self.low, price)
        self.close = price
        self.volume += volume
        self.tick_count += 1

    def to_candle_dict(self, is_complete: bool, provider: str) -> dict:
        return {
            "timestamp": self.bucket_start.isoformat(),
            "open": str(self.open),
            "high": str(self.high),
            "low": str(self.low),
            "close": str(self.close),
            "volume": str(self.volume),
            "is_complete": is_complete,
            "provider": provider,
        }


@dataclass
class _BuilderState:
    builder: InProgressCandle | None = None
    last_completed_bucket: datetime | None = None
    missing_gap: bool = False
    seen_ticks: set[tuple[str, str]] = field(default_factory=set)


class CandleAggregator:
    """One aggregator instance handles all assets/timeframes for a provider."""

    def __init__(self, provider_name: str) -> None:
        self.provider_name = provider_name
        self._state: dict[tuple[str, str], _BuilderState] = {}

    def _key(self, provider_symbol: str, timeframe: str) -> tuple[str, str]:
        return (provider_symbol, timeframe)

    def is_duplicate(self, provider_symbol: str, timeframe: str, tick: Tick) -> bool:
        state = self._state.setdefault(self._key(provider_symbol, timeframe), _BuilderState())
        fingerprint = (tick.timestamp.isoformat(), str(tick.price))
        if fingerprint in state.seen_ticks:
            return True
        state.seen_ticks.add(fingerprint)
        if len(state.seen_ticks) > 500:
            state.seen_ticks = set(list(state.seen_ticks)[-250:])
        return False

    def has_missing_gap(self, provider_symbol: str, timeframe: str) -> bool:
        return self._state.get(self._key(provider_symbol, timeframe), _BuilderState()).missing_gap

    async def ingest_tick(self, session: AsyncSession, asset: Asset, timeframe: str, tick: Tick) -> dict | None:
        """Feed one tick into the builder for (asset, timeframe).

        Returns the completed-candle payload dict when a bucket rolls over,
        else None. Also publishes the live in-progress candle for charting.
        """
        key = self._key(asset.provider_symbol, timeframe)
        state = self._state.setdefault(key, _BuilderState())

        if self.is_duplicate(asset.provider_symbol, timeframe, tick):
            return None

        LATEST_PRICES[asset.provider_symbol] = (tick.price, tick.timestamp)

        seconds = TIMEFRAME_SECONDS[timeframe]
        current_bucket = bucket_start(tick.timestamp, seconds)
        completed_payload: dict | None = None

        if state.builder is None:
            state.builder = InProgressCandle(
                bucket_start=current_bucket, open=tick.price, high=tick.price, low=tick.price, close=tick.price
            )
        elif current_bucket > state.builder.bucket_start:
            completed_payload = await self._close_candle(session, asset, timeframe, state)

            expected_next = state.builder.bucket_start + timedelta(seconds=seconds) if state.builder else None
            state.missing_gap = expected_next is not None and current_bucket > expected_next

            state.builder = InProgressCandle(
                bucket_start=current_bucket, open=tick.price, high=tick.price, low=tick.price, close=tick.price
            )
        else:
            state.missing_gap = False

        state.builder.apply(tick.price, tick.volume)

        redis = get_redis()
        await redis.publish(
            f"candles:{asset.symbol}:{timeframe}",
            orjson.dumps(state.builder.to_candle_dict(is_complete=False, provider=self.provider_name)).decode(),
        )

        return completed_payload

    async def _close_candle(self, session: AsyncSession, asset: Asset, timeframe: str, state: _BuilderState) -> dict:
        builder = state.builder
        assert builder is not None
        now = datetime.now(timezone.utc)

        stmt = (
            pg_insert(Candle)
            .values(
                asset_id=asset.id,
                timeframe=timeframe,
                timestamp=builder.bucket_start,
                open=builder.open,
                high=builder.high,
                low=builder.low,
                close=builder.close,
                volume=builder.volume,
                provider=self.provider_name,
                is_complete=True,
                created_at=now,
            )
            .on_conflict_do_update(
                index_elements=["asset_id", "timeframe", "timestamp", "provider"],
                set_={
                    "high": builder.high,
                    "low": builder.low,
                    "close": builder.close,
                    "volume": builder.volume,
                    "is_complete": True,
                },
            )
        )
        await session.execute(stmt)
        await session.commit()

        state.last_completed_bucket = builder.bucket_start
        payload = builder.to_candle_dict(is_complete=True, provider=self.provider_name)

        redis = get_redis()
        await redis.publish(f"candles:{asset.symbol}:{timeframe}", orjson.dumps(payload).decode())

        logger.info("candle_closed", symbol=asset.symbol, timeframe=timeframe, timestamp=payload["timestamp"])
        return payload


async def backfill_candles(
    session: AsyncSession, asset: Asset, timeframe: str, provider_candles: list, provider_name: str
) -> int:
    """Bulk-insert historical candles fetched via REST, skipping duplicates."""
    count = 0
    now = datetime.now(timezone.utc)
    for c in provider_candles:
        stmt = (
            pg_insert(Candle)
            .values(
                asset_id=asset.id,
                timeframe=timeframe,
                timestamp=c.timestamp,
                open=c.open,
                high=c.high,
                low=c.low,
                close=c.close,
                volume=c.volume,
                provider=provider_name,
                is_complete=True,
                created_at=now,
            )
            .on_conflict_do_nothing(index_elements=["asset_id", "timeframe", "timestamp", "provider"])
        )
        result = await session.execute(stmt)
        count += result.rowcount or 0
    await session.commit()
    return count


async def get_recent_candles(session: AsyncSession, asset_id, timeframe: str, limit: int = 300) -> list[Candle]:
    result = await session.execute(
        select(Candle)
        .where(Candle.asset_id == asset_id, Candle.timeframe == timeframe, Candle.is_complete.is_(True))
        .order_by(Candle.timestamp.desc())
        .limit(limit)
    )
    return list(reversed(result.scalars().all()))
