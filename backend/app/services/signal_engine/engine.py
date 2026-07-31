"""Central signal engine: orchestrates NO TRADE filters, strategy/AI
evaluation and durable signal storage.

Hard platform rules enforced here:
* Default output is always NO TRADE.
* A signal is written to the database (status=PENDING_ENTRY) before it is
  ever broadcast, and before its entry or expiry price is known - so it is
  impossible to "generate" a signal after seeing the outcome.
* No strategy is forced to fire just because a user selected it.
"""

from __future__ import annotations

import random
import string
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone

import orjson
import pandas as pd
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.dynamic_config import get_confidence_thresholds
from app.core.logging import get_logger
from app.db.redis import get_redis
from app.models.asset import Asset
from app.models.enums import ConfidenceType, SignalDirection, SignalStatus
from app.models.model_version import ModelVersion
from app.models.signal import Signal, SignalFeature, SignalReason
from app.models.strategy import Strategy
from app.services.ai_selector.selector import select as ai_select
from app.services.candles.aggregator import CandleAggregator, get_recent_candles
from app.services.features.engine import FeatureSnapshot, feature_engine
from app.services.market_condition.engine import classify, is_strategy_compatible
from app.services.market_data.base import MarketDataProvider
from app.services.ml.inference import get_ml_probability
from app.services.signal_engine import filters
from app.services.strategies.base import StrategyEvaluation
from app.services.strategies.registry import build_strategy

logger = get_logger(__name__)

ENTRY_OPEN_DELAY_SECONDS = 1
ENTRY_WINDOW_SECONDS = 5


@dataclass
class NoTradeResult:
    reason_code: str
    reason_text: str


@dataclass
class SignalGenerationRequest:
    asset: Asset
    timeframe: str
    expiry_seconds: int
    strategy: Strategy | None  # None when ai_auto_mode is True
    ai_auto_mode: bool
    enabled_strategies: list[Strategy] = field(default_factory=list)


def _public_signal_id() -> str:
    suffix = "".join(random.choices(string.ascii_uppercase + string.digits, k=8))
    return f"SIG-{suffix}"


async def _candles_to_df(session: AsyncSession, asset_id, timeframe: str, limit: int) -> pd.DataFrame | None:
    candles = await get_recent_candles(session, asset_id, timeframe, limit)
    if not candles:
        return None
    return pd.DataFrame(
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


class SignalEngine:
    def __init__(self, aggregator: CandleAggregator) -> None:
        self.aggregator = aggregator

    async def _has_active_or_recent_signal(self, session: AsyncSession, asset_id, strategy_id, timeframe: str) -> bool:
        cooldown_cutoff = datetime.now(timezone.utc) - timedelta(seconds=settings.signal_cooldown_seconds)
        result = await session.execute(
            select(Signal.id)
            .where(
                Signal.asset_id == asset_id,
                Signal.strategy_id == strategy_id,
                Signal.timeframe == timeframe,
                Signal.status.in_(
                    [
                        SignalStatus.PENDING_ENTRY,
                        SignalStatus.ACTIVE,
                        SignalStatus.EXPIRING,
                        SignalStatus.CHECKING_RESULT,
                    ]
                ),
            )
            .limit(1)
        )
        if result.scalar_one_or_none() is not None:
            return True
        recent = await session.execute(
            select(Signal.id)
            .where(
                Signal.asset_id == asset_id,
                Signal.strategy_id == strategy_id,
                Signal.timeframe == timeframe,
                Signal.generated_at >= cooldown_cutoff,
            )
            .limit(1)
        )
        return recent.scalar_one_or_none() is not None

    async def generate(
        self,
        session: AsyncSession,
        provider: MarketDataProvider,
        request: SignalGenerationRequest,
    ) -> Signal | NoTradeResult:
        if (reason := filters.check_provider_health(provider)) is not None:
            return NoTradeResult("data_feed_unhealthy", reason)

        df = await _candles_to_df(session, request.asset.id, request.timeframe, 400)
        if (reason := filters.check_sufficient_history(df)) is not None:
            return NoTradeResult("insufficient_history", reason)

        missing_gap = self.aggregator.has_missing_gap(request.asset.provider_symbol, request.timeframe)
        if (reason := filters.check_missing_candle(missing_gap)) is not None:
            return NoTradeResult("missing_candles", reason)

        if (reason := filters.check_expiry_supported_by_provider(provider, request.expiry_seconds)) is not None:
            return NoTradeResult("expiry_incompatible_with_provider", reason)

        features = feature_engine.compute(
            df, feed_latency_ms=provider.health.latency_ms or 0.0, missing_candle=missing_gap
        )
        if features is None:
            return NoTradeResult("insufficient_history", "Not enough candles to compute features.")

        market_condition = classify(features)

        extra_timeframes: dict[str, tuple[pd.DataFrame, FeatureSnapshot]] = {}
        for tf in ("5m", "15m"):
            if tf == request.timeframe:
                continue
            tf_df = await _candles_to_df(session, request.asset.id, tf, 400)
            if tf_df is not None:
                tf_features = feature_engine.compute(tf_df)
                if tf_features is not None:
                    extra_timeframes[tf] = (tf_df, tf_features)

        thresholds = await get_confidence_thresholds()

        if request.ai_auto_mode:
            enabled_pairs = [
                (s.strategy_code, s.configuration_json) for s in request.enabled_strategies if s.is_enabled
            ]
            ai_result = ai_select(enabled_pairs, df, features, market_condition, extra_timeframes)
            if ai_result.direction == SignalDirection.NO_TRADE:
                text = ai_result.reasons[0].text if ai_result.reasons else "AI selector found no qualifying strategy."
                return NoTradeResult("ai_no_trade", text)
            strategy = next(
                (s for s in request.enabled_strategies if s.strategy_code == ai_result.primary_strategy_code), None
            )
            if strategy is None:
                return NoTradeResult("ai_no_trade", "AI selector's primary strategy is not available.")
            evaluation = StrategyEvaluation(
                direction=ai_result.direction, confidence=ai_result.confidence, reasons=ai_result.reasons
            )
            supporting_codes = ai_result.supporting_strategy_codes
        else:
            strategy = request.strategy
            assert strategy is not None
            compatible, reason = is_strategy_compatible(strategy.strategy_code, market_condition)
            if not compatible:
                return NoTradeResult(
                    "strategy_market_incompatible", reason or "Strategy incompatible with market condition."
                )
            if (reason := filters.check_expiry_supported_by_strategy(strategy, request.expiry_seconds)) is not None:
                return NoTradeResult("expiry_incompatible_with_strategy", reason)
            if (reason := filters.check_timeframe_supported_by_strategy(strategy, request.timeframe)) is not None:
                return NoTradeResult("timeframe_incompatible_with_strategy", reason)
            strategy_impl = build_strategy(strategy.strategy_code, strategy.configuration_json)
            evaluation = strategy_impl.evaluate(df, features, extra_timeframes)
            supporting_codes = []

        if evaluation.direction == SignalDirection.NO_TRADE:
            text = evaluation.reasons[0].text if evaluation.reasons else "Strategy conditions not met."
            return NoTradeResult("strategy_no_setup", text)

        confidence_type = ConfidenceType.RULE_BASED
        ml_probability: float | None = None
        model_version_name: str | None = None
        active_model = (
            await session.execute(
                select(ModelVersion).where(
                    ModelVersion.asset_id == request.asset.id,
                    ModelVersion.strategy_id == strategy.id,
                    ModelVersion.is_active.is_(True),
                )
            )
        ).scalar_one_or_none()
        if active_model is not None:
            probability = get_ml_probability(active_model, features)
            if probability is not None:
                ml_probability = probability
                confidence_type = ConfidenceType.ML_CALIBRATED
                evaluation.confidence = round(probability * 100, 2)
                model_version_name = f"{active_model.name}:v{active_model.version}"

        if (
            reason := filters.check_confidence_threshold(evaluation.confidence, thresholds["no_trade_below"])
        ) is not None:
            return NoTradeResult("confidence_below_threshold", reason)

        if await self._has_active_or_recent_signal(session, request.asset.id, strategy.id, request.timeframe):
            return NoTradeResult(
                "duplicate_or_cooldown",
                "A signal already exists or cooldown is active for this asset/strategy/timeframe.",
            )

        now = datetime.now(timezone.utc)
        generated_at = now
        entry_time = generated_at + timedelta(seconds=ENTRY_OPEN_DELAY_SECONDS)
        entry_window_end = entry_time + timedelta(seconds=ENTRY_WINDOW_SECONDS)
        expiry_time = entry_time + timedelta(seconds=request.expiry_seconds)

        if (reason := filters.check_entry_window_not_passed(entry_window_end, now)) is not None:
            return NoTradeResult("entry_window_passed", reason)

        signal = Signal(
            public_signal_id=_public_signal_id(),
            asset_id=request.asset.id,
            strategy_id=strategy.id,
            direction=evaluation.direction,
            timeframe=request.timeframe,
            expiry_seconds=request.expiry_seconds,
            generated_at=generated_at,
            entry_time=entry_time,
            entry_window_end=entry_window_end,
            entry_price=None,
            expiry_time=expiry_time,
            expiry_price=None,
            confidence=evaluation.confidence,
            confidence_type=confidence_type,
            strategy_score=evaluation.confidence,
            ml_probability=ml_probability,
            market_condition=market_condition,
            status=SignalStatus.PENDING_ENTRY,
            strategy_version=strategy.version,
            model_version=model_version_name,
            provider=provider.name,
            data_latency_ms=int(provider.health.latency_ms or 0),
            ai_auto_mode=request.ai_auto_mode,
            supporting_strategies_json=supporting_codes,
            created_at=now,
        )
        session.add(signal)
        await session.flush()

        for r in evaluation.reasons:
            session.add(SignalReason(signal_id=signal.id, reason_code=r.code, reason_text=r.text, score=r.score))
        for name, value in {
            "rsi_14": features.rsi_14,
            "atr_14": features.atr_14,
            "ema_9": features.ema_9,
            "ema_21": features.ema_21,
            "ema_50": features.ema_50,
            "ema_200": features.ema_200,
            "macd_hist": features.macd_hist,
            "bb_width": features.bb_width,
            "volatility_percentile": features.volatility_percentile,
        }.items():
            session.add(SignalFeature(signal_id=signal.id, feature_name=name, feature_value=float(value)))

        # Signal is committed to the database before any broadcast happens.
        await session.commit()
        await session.refresh(signal)

        logger.info(
            "signal_generated",
            public_signal_id=signal.public_signal_id,
            asset=request.asset.symbol,
            direction=signal.direction.value,
            confidence=signal.confidence,
            strategy=strategy.strategy_code,
        )

        redis = get_redis()
        payload = orjson.dumps(
            {
                "type": "new_signal",
                "public_signal_id": signal.public_signal_id,
                "asset": request.asset.symbol,
                "direction": signal.direction.value,
                "confidence": signal.confidence,
                "strategy_code": strategy.strategy_code,
                "expiry_seconds": signal.expiry_seconds,
                "generated_at": signal.generated_at.isoformat(),
                "entry_time": signal.entry_time.isoformat(),
                "expiry_time": signal.expiry_time.isoformat(),
            }
        ).decode()
        await redis.publish("signals:updates", payload)
        await redis.publish(f"signals:asset:{request.asset.symbol}", payload)

        return signal
