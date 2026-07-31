"""Wires the ML pipeline to the database: loads candles, builds training
examples via walk-forward simulation, trains + calibrates, and records a
new ModelVersion row (inactive by default - an admin must activate it)."""

from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path

import pandas as pd
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import get_logger
from app.models.asset import Asset
from app.models.candle import Candle
from app.models.model_version import ModelVersion
from app.models.strategy import Strategy
from app.services.candles.aggregator import TIMEFRAME_SECONDS
from app.services.ml.pipeline import build_training_examples, chronological_split, train_and_calibrate
from app.services.strategies.registry import build_strategy

logger = get_logger(__name__)
MODEL_DIR = Path(__file__).resolve().parent.parent.parent.parent / "models_store"


async def train_model_for(
    session: AsyncSession, asset_id, strategy_id, timeframe: str = "1m", expiry_seconds: int = 60
) -> ModelVersion:
    asset = await session.get(Asset, asset_id)
    strategy_row = await session.get(Strategy, strategy_id)
    if asset is None or strategy_row is None:
        raise ValueError("Asset or strategy not found")

    candles = (
        (
            await session.execute(
                select(Candle)
                .where(Candle.asset_id == asset_id, Candle.timeframe == timeframe, Candle.is_complete.is_(True))
                .order_by(Candle.timestamp.asc())
            )
        )
        .scalars()
        .all()
    )
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

    strategy_impl = build_strategy(strategy_row.strategy_code, strategy_row.configuration_json)
    examples = build_training_examples(
        df, strategy_impl, strategy_row.strategy_code, expiry_seconds, TIMEFRAME_SECONDS.get(timeframe, 60)
    )

    existing_versions = (
        (
            await session.execute(
                select(ModelVersion).where(ModelVersion.strategy_id == strategy_id, ModelVersion.asset_id == asset_id)
            )
        )
        .scalars()
        .all()
    )
    next_version = max((m.version for m in existing_versions), default=0) + 1
    model_name = f"{strategy_row.strategy_code}_{asset.symbol.replace('/', '')}_v{next_version}"

    artifact = train_and_calibrate(examples, MODEL_DIR, model_name)

    train_ex, val_ex, test_ex = chronological_split(examples)
    now = datetime.now(timezone.utc)
    model_version = ModelVersion(
        asset_id=asset_id,
        strategy_id=strategy_id,
        name=model_name,
        version=next_version,
        file_path=artifact.file_path,
        training_start=train_ex[0].timestamp.to_pydatetime() if train_ex else now,
        training_end=train_ex[-1].timestamp.to_pydatetime() if train_ex else now,
        validation_start=val_ex[0].timestamp.to_pydatetime() if val_ex else now,
        validation_end=val_ex[-1].timestamp.to_pydatetime() if val_ex else now,
        test_start=test_ex[0].timestamp.to_pydatetime() if test_ex else now,
        test_end=test_ex[-1].timestamp.to_pydatetime() if test_ex else now,
        features_json=artifact.feature_names,
        metrics_json=artifact.metrics,
        probability_threshold=artifact.probability_threshold,
        is_active=False,
        created_at=now,
    )
    session.add(model_version)
    await session.commit()
    await session.refresh(model_version)
    logger.info("model_trained", model_name=model_name, metrics=artifact.metrics)
    return model_version
