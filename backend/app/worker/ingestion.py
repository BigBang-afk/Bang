"""Market-data ingestion loop: backfills history, streams live ticks into
the candle aggregator for every enabled timeframe, and triggers the signal
engine whenever a new 1-minute candle closes."""

from __future__ import annotations

from sqlalchemy import select

from app.core.config import settings
from app.core.dynamic_config import is_signal_engine_paused
from app.core.logging import get_logger
from app.db.session import AsyncSessionLocal
from app.models.asset import Asset
from app.models.strategy import Strategy
from app.services.candles.aggregator import TIMEFRAME_SECONDS, CandleAggregator, backfill_candles
from app.services.market_data.manager import market_data_manager
from app.services.signal_engine.engine import SignalEngine, SignalGenerationRequest

logger = get_logger(__name__)

LIVE_TIMEFRAMES = list(TIMEFRAME_SECONDS.keys())
DEFAULT_LIVE_EXPIRY_SECONDS = 60


async def backfill_all(aggregator: CandleAggregator) -> None:
    async with AsyncSessionLocal() as session:
        assets = (await session.execute(select(Asset).where(Asset.is_enabled.is_(True)))).scalars().all()
        provider = market_data_manager.active
        for asset in assets:
            for timeframe in LIVE_TIMEFRAMES:
                try:
                    candles = await provider.get_historical_candles(asset.provider_symbol, timeframe, output_size=400)
                    inserted = await backfill_candles(session, asset, timeframe, candles, provider.name)
                    logger.info("backfill_complete", asset=asset.symbol, timeframe=timeframe, inserted=inserted)
                except Exception as exc:  # noqa: BLE001
                    logger.error("backfill_failed", asset=asset.symbol, timeframe=timeframe, error=str(exc))


async def _generate_signals_for_asset(engine: SignalEngine, asset: Asset, strategies: list[Strategy]) -> None:
    if not settings.signal_engine_enabled or await is_signal_engine_paused():
        return

    provider = market_data_manager.active
    async with AsyncSessionLocal() as session:
        for strategy in strategies:
            request = SignalGenerationRequest(
                asset=asset,
                timeframe="1m",
                expiry_seconds=DEFAULT_LIVE_EXPIRY_SECONDS,
                strategy=strategy,
                ai_auto_mode=False,
            )
            await engine.generate(session, provider, request)

        ai_request = SignalGenerationRequest(
            asset=asset,
            timeframe="1m",
            expiry_seconds=DEFAULT_LIVE_EXPIRY_SECONDS,
            strategy=None,
            ai_auto_mode=True,
            enabled_strategies=strategies,
        )
        await engine.generate(session, provider, ai_request)


async def run_ingestion() -> None:
    aggregator = CandleAggregator(market_data_manager.active.name)
    engine = SignalEngine(aggregator)

    await backfill_all(aggregator)

    async with AsyncSessionLocal() as session:
        assets = (await session.execute(select(Asset).where(Asset.is_enabled.is_(True)))).scalars().all()
        strategies = (await session.execute(select(Strategy).where(Strategy.is_enabled.is_(True)))).scalars().all()

    asset_by_symbol = {a.provider_symbol: a for a in assets}
    provider_symbols = list(asset_by_symbol.keys())

    provider = market_data_manager.active
    async for tick in provider.stream_ticks(provider_symbols):
        asset = asset_by_symbol.get(tick.provider_symbol)
        if asset is None:
            continue

        async with AsyncSessionLocal() as session:
            for timeframe in LIVE_TIMEFRAMES:
                completed = await aggregator.ingest_tick(session, asset, timeframe, tick)
                if completed is not None and timeframe == "1m":
                    await _generate_signals_for_asset(engine, asset, strategies)
