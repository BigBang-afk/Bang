"""Strategy 10: Multi-Timeframe Confluence.

Uses a higher timeframe for major trend, a confirmation timeframe for
structure and the entry timeframe for timing. Rejects the signal outright
if the timeframes conflict. Requires `extra_timeframes` to be populated by
the signal engine with (dataframe, features) for the confirmation and
higher timeframes.
"""

from __future__ import annotations

import pandas as pd

from app.models.enums import SignalDirection
from app.services.features.engine import FeatureSnapshot
from app.services.strategies.base import (
    BaseStrategy,
    SignalReasonItem,
    StrategyEvaluation,
    compute_rule_based_confidence,
)


def _ema_direction(features: FeatureSnapshot) -> int:
    if features.ema_9 > features.ema_21 > features.ema_50:
        return 1
    if features.ema_9 < features.ema_21 < features.ema_50:
        return -1
    return 0


class MultiTimeframeConfluenceStrategy(BaseStrategy):
    code = "multi_timeframe_confluence"
    name = "Multi-Timeframe Confluence"

    def evaluate(
        self,
        df: pd.DataFrame,
        features: FeatureSnapshot,
        extra_timeframes: dict | None = None,
    ) -> StrategyEvaluation:
        cfg = self.config
        higher_tf = cfg.get("higher_timeframe", "15m")
        confirm_tf = cfg.get("confirmation_timeframe", "5m")

        if not extra_timeframes or higher_tf not in extra_timeframes or confirm_tf not in extra_timeframes:
            return StrategyEvaluation.no_trade("Higher/confirmation timeframe data not available", "missing_mtf_data")

        _, higher_features = extra_timeframes[higher_tf]
        _, confirm_features = extra_timeframes[confirm_tf]

        higher_dir = _ema_direction(higher_features)
        confirm_dir = _ema_direction(confirm_features)
        entry_dir = _ema_direction(features)

        if higher_dir == 0 or confirm_dir == 0 or entry_dir == 0:
            return StrategyEvaluation.no_trade("EMA alignment unclear on one or more timeframes", "unclear_alignment")

        if not (higher_dir == confirm_dir == entry_dir):
            return StrategyEvaluation.no_trade(
                f"Timeframe conflict: {higher_tf}={higher_dir}, {confirm_tf}={confirm_dir}, entry={entry_dir}",
                "timeframe_conflict",
            )

        sr_buffer = features.atr_14 * 0.5
        direction = SignalDirection.CALL if higher_dir == 1 else SignalDirection.PUT

        if (
            direction == SignalDirection.CALL
            and features.distance_from_resistance is not None
            and features.distance_from_resistance < sr_buffer
        ):
            return StrategyEvaluation.no_trade("Resistance too close on entry timeframe", "resistance_blocking")
        if (
            direction == SignalDirection.PUT
            and features.distance_from_support is not None
            and features.distance_from_support < sr_buffer
        ):
            return StrategyEvaluation.no_trade("Support too close on entry timeframe", "support_blocking")

        momentum_component = (
            min(1.0, max(0.0, (features.rsi_14 - 50) / 30))
            if direction == SignalDirection.CALL
            else min(1.0, max(0.0, (50 - features.rsi_14) / 30))
        )
        components = {
            "trend_alignment": 1.0,
            "momentum_alignment": momentum_component,
            "price_action": 0.7,
            "sr_location": 0.9,
            "volatility_suitability": 1.0 if not features.abnormal_volatility else 0.4,
            "multi_timeframe_agreement": 1.0,
            "data_quality": 0.0 if features.missing_candle else 1.0,
        }
        return StrategyEvaluation(
            direction=direction,
            confidence=compute_rule_based_confidence(components),
            reasons=[
                SignalReasonItem(
                    "mtf_alignment",
                    f"{higher_tf}, {confirm_tf} and entry timeframe EMA structure all agree",
                    1.0,
                ),
            ],
            feature_snapshot={"higher_dir": higher_dir, "confirm_dir": confirm_dir, "entry_dir": entry_dir},
        )
