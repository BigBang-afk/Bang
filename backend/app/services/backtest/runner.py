"""Wires the backtest engine to the database: loads candles for the
requested asset/timeframe/date-range, runs the strategy chronologically,
and persists metrics onto the BacktestRun row."""

from __future__ import annotations

from dataclasses import asdict
from datetime import datetime, timezone

import pandas as pd
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import get_logger
from app.models.asset import Asset
from app.models.backtest import BacktestRun
from app.models.candle import Candle
from app.models.enums import BacktestStatus
from app.models.strategy import Strategy
from app.services.backtest.engine import run_backtest
from app.services.candles.aggregator import TIMEFRAME_SECONDS
from app.services.strategies.registry import build_strategy

logger = get_logger(__name__)

MIN_SAMPLE_SIZE = 30


async def execute_backtest_run(session: AsyncSession, backtest_id) -> None:
    run = await session.get(BacktestRun, backtest_id)
    if run is None:
        return

    run.status = BacktestStatus.RUNNING
    run.started_at = datetime.now(timezone.utc)
    await session.commit()

    try:
        strategy_row = await session.get(Strategy, run.strategy_id)
        asset_row = await session.get(Asset, run.asset_id)
        if strategy_row is None or asset_row is None:
            raise ValueError("Strategy or asset not found")

        cfg = run.configuration_json or {}
        start = datetime.fromisoformat(cfg["start"]) if "start" in cfg else None
        end = datetime.fromisoformat(cfg["end"]) if "end" in cfg else None

        stmt = (
            select(Candle)
            .where(Candle.asset_id == asset_row.id, Candle.timeframe == run.timeframe, Candle.is_complete.is_(True))
            .order_by(Candle.timestamp.asc())
        )
        if start:
            stmt = stmt.where(Candle.timestamp >= start)
        if end:
            stmt = stmt.where(Candle.timestamp <= end)

        candles = (await session.execute(stmt)).scalars().all()
        df = pd.DataFrame(
            [
                {
                    "timestamp": c.timestamp,
                    "open": float(c.open),
                    "high": float(c.high),
                    "low": float(c.low),
                    "close": float(c.close),
                    "volume": float(c.volume),
                }
                for c in candles
            ]
        )

        if len(df) < MIN_SAMPLE_SIZE + 210:
            run.status = BacktestStatus.FAILED
            run.error_message = (
                f"Insufficient historical candles ({len(df)}) to run a statistically meaningful backtest "
                f"(minimum {MIN_SAMPLE_SIZE + 210})."
            )
            run.completed_at = datetime.now(timezone.utc)
            await session.commit()
            return

        strategy_impl = build_strategy(strategy_row.strategy_code, strategy_row.configuration_json)
        _signals, metrics = run_backtest(
            candles=df,
            strategy=strategy_impl,
            strategy_code=strategy_row.strategy_code,
            expiry_seconds=run.expiry_seconds,
            timeframe_seconds=TIMEFRAME_SECONDS.get(run.timeframe, 60),
            payout_ratio=cfg.get("payout_ratio", 0.85),
        )

        metrics_dict = asdict(metrics)
        metrics_dict["sample_size_warning"] = metrics.total_signals < MIN_SAMPLE_SIZE
        run.metrics_json = metrics_dict
        run.status = BacktestStatus.COMPLETED
        run.completed_at = datetime.now(timezone.utc)
        await session.commit()
        logger.info("backtest_completed", backtest_id=str(backtest_id), total_signals=metrics.total_signals)
    except Exception as exc:  # noqa: BLE001
        run.status = BacktestStatus.FAILED
        run.error_message = str(exc)
        run.completed_at = datetime.now(timezone.utc)
        await session.commit()
        logger.error("backtest_failed", backtest_id=str(backtest_id), error=str(exc))
