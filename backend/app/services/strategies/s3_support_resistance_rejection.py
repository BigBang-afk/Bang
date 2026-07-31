"""Strategy 3: Support & Resistance Rejection.

Generates a reversal signal when price tests a strong multiple-touch level
and closes back through it with a clear rejection wick and confirmation.
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


class SupportResistanceRejectionStrategy(BaseStrategy):
    code = "support_resistance_rejection"
    name = "Support & Resistance Rejection"

    def evaluate(
        self,
        df: pd.DataFrame,
        features: FeatureSnapshot,
        extra_timeframes: dict | None = None,
    ) -> StrategyEvaluation:
        cfg = self.config
        last = df.iloc[-1]
        tolerance = features.atr_14 * cfg.get("level_tolerance_atr_multiple", 0.3)
        rng = max(last["high"] - last["low"], 1e-9)
        lower_wick = min(last["close"], last["open"]) - last["low"]
        upper_wick = last["high"] - max(last["close"], last["open"])

        near_support = features.distance_from_support is not None and features.distance_from_support <= tolerance
        near_resistance = (
            features.distance_from_resistance is not None and features.distance_from_resistance <= tolerance
        )

        if near_support:
            wick_ratio = lower_wick / rng
            bullish_confirm = last["close"] > last["open"]
            if wick_ratio >= cfg.get("wick_body_ratio_min", 1.5) / (1.5 + 1) and bullish_confirm:
                if features.distance_from_resistance is not None and features.distance_from_resistance < tolerance:
                    return StrategyEvaluation.no_trade(
                        "Resistance immediately overhead blocks CALL", "resistance_blocking"
                    )
                components = {
                    "trend_alignment": 0.6,
                    "momentum_alignment": min(1.0, max(0.0, (features.rsi_14 - 40) / 30)),
                    "price_action": min(1.0, wick_ratio),
                    "sr_location": 1.0,
                    "volatility_suitability": 1.0 if not features.abnormal_volatility else 0.4,
                    "data_quality": 0.0 if features.missing_candle else 1.0,
                }
                return StrategyEvaluation(
                    direction=SignalDirection.CALL,
                    confidence=compute_rule_based_confidence(components),
                    reasons=[
                        SignalReasonItem(
                            "support_rejection", "Price rejected strong support with a long lower wick", 1.0
                        ),
                        SignalReasonItem("bullish_confirmation", "Candle closed bullish back above support", 0.8),
                    ],
                    feature_snapshot={"wick_ratio": wick_ratio},
                )

        if near_resistance:
            wick_ratio = upper_wick / rng
            bearish_confirm = last["close"] < last["open"]
            if wick_ratio >= cfg.get("wick_body_ratio_min", 1.5) / (1.5 + 1) and bearish_confirm:
                if features.distance_from_support is not None and features.distance_from_support < tolerance:
                    return StrategyEvaluation.no_trade("Support immediately below blocks PUT", "support_blocking")
                components = {
                    "trend_alignment": 0.6,
                    "momentum_alignment": min(1.0, max(0.0, (60 - features.rsi_14) / 30)),
                    "price_action": min(1.0, wick_ratio),
                    "sr_location": 1.0,
                    "volatility_suitability": 1.0 if not features.abnormal_volatility else 0.4,
                    "data_quality": 0.0 if features.missing_candle else 1.0,
                }
                return StrategyEvaluation(
                    direction=SignalDirection.PUT,
                    confidence=compute_rule_based_confidence(components),
                    reasons=[
                        SignalReasonItem(
                            "resistance_rejection", "Price rejected strong resistance with a long upper wick", 1.0
                        ),
                        SignalReasonItem("bearish_confirmation", "Candle closed bearish back below resistance", 0.8),
                    ],
                    feature_snapshot={"wick_ratio": wick_ratio},
                )

        return StrategyEvaluation.no_trade("Price not at a qualifying support/resistance rejection level")
