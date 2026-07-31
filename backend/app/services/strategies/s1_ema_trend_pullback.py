"""Strategy 1: EMA Trend Pullback.

Enters in the direction of a confirmed trend (EMA9/21/50/200 stack) after a
controlled pullback toward EMA9/21 that forms a rejection candle, provided
market structure remains valid, ATR is in range and no resistance/support
blocks the trade.
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


class EmaTrendPullbackStrategy(BaseStrategy):
    code = "ema_trend_pullback"
    name = "EMA Trend Pullback"

    def evaluate(
        self,
        df: pd.DataFrame,
        features: FeatureSnapshot,
        extra_timeframes: dict | None = None,
    ) -> StrategyEvaluation:
        cfg = self.config
        atr_pct = features.atr_pct_of_price
        if not (cfg.get("atr_min_pct", 0.02) <= atr_pct <= cfg.get("atr_max_pct", 3.0)):
            return StrategyEvaluation.no_trade(f"ATR% {atr_pct:.3f} outside accepted range", "atr_out_of_range")

        last = df.iloc[-1]
        pullback_distance = abs(features.close - features.ema_9)
        pullback_ok = pullback_distance <= features.atr_14 * cfg.get("pullback_atr_multiple", 1.2)

        bullish_stack = features.ema_9 > features.ema_21 > features.ema_50 and features.close > features.ema_200
        bearish_stack = features.ema_9 < features.ema_21 < features.ema_50 and features.close < features.ema_200

        body_ratio = features.body_to_range_ratio
        bullish_rejection = last["close"] > last["open"] and body_ratio >= cfg.get("min_body_ratio", 0.35)
        bearish_rejection = last["close"] < last["open"] and body_ratio >= cfg.get("min_body_ratio", 0.35)

        sr_buffer = features.atr_14 * cfg.get("sr_buffer_atr_multiple", 0.5)

        if bullish_stack and pullback_ok and bullish_rejection and features.structure in ("HH_HL", "UNCLEAR"):
            if features.distance_from_resistance is not None and features.distance_from_resistance < sr_buffer:
                return StrategyEvaluation.no_trade("Resistance too close for CALL", "resistance_blocking")
            components = {
                "trend_alignment": 1.0,
                "momentum_alignment": min(1.0, max(0.0, (features.rsi_14 - 45) / 25)),
                "price_action": 1.0 if bullish_rejection else 0.0,
                "sr_location": 1.0 if (features.distance_from_resistance or 999) > sr_buffer * 2 else 0.6,
                "volatility_suitability": 1.0,
                "data_quality": 0.0 if features.missing_candle else 1.0,
            }
            confidence = compute_rule_based_confidence(components)
            return StrategyEvaluation(
                direction=SignalDirection.CALL,
                confidence=confidence,
                reasons=[
                    SignalReasonItem("ema_stack_bullish", "EMA9 > EMA21 > EMA50 with price above EMA200", 1.0),
                    SignalReasonItem("pullback_rejection", "Bullish rejection candle at EMA9/21 pullback", 1.0),
                ],
                feature_snapshot={"atr": features.atr_14, "rsi": features.rsi_14},
            )

        if bearish_stack and pullback_ok and bearish_rejection and features.structure in ("LH_LL", "UNCLEAR"):
            if features.distance_from_support is not None and features.distance_from_support < sr_buffer:
                return StrategyEvaluation.no_trade("Support too close for PUT", "support_blocking")
            components = {
                "trend_alignment": 1.0,
                "momentum_alignment": min(1.0, max(0.0, (55 - features.rsi_14) / 25)),
                "price_action": 1.0 if bearish_rejection else 0.0,
                "sr_location": 1.0 if (features.distance_from_support or 999) > sr_buffer * 2 else 0.6,
                "volatility_suitability": 1.0,
                "data_quality": 0.0 if features.missing_candle else 1.0,
            }
            confidence = compute_rule_based_confidence(components)
            return StrategyEvaluation(
                direction=SignalDirection.PUT,
                confidence=confidence,
                reasons=[
                    SignalReasonItem("ema_stack_bearish", "EMA9 < EMA21 < EMA50 with price below EMA200", 1.0),
                    SignalReasonItem("pullback_rejection", "Bearish rejection candle at EMA9/21 pullback", 1.0),
                ],
                feature_snapshot={"atr": features.atr_14, "rsi": features.rsi_14},
            )

        return StrategyEvaluation.no_trade("No qualifying EMA trend pullback setup")
