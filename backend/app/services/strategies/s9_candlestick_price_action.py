"""Strategy 9: Candlestick Price Action.

Generates signals from professional candlestick patterns, but never from
the pattern alone - requires trend/S-R context, acceptable volatility,
valid candle size/wick ratios and room before opposing levels.
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

_BULLISH_PATTERNS = {
    "bullish_engulfing",
    "hammer",
    "pin_bar_bullish",
    "morning_star",
    "inside_bar_breakout_bullish",
    "three_candle_continuation_bullish",
}
_BEARISH_PATTERNS = {
    "bearish_engulfing",
    "shooting_star",
    "pin_bar_bearish",
    "evening_star",
    "inside_bar_breakout_bearish",
    "three_candle_continuation_bearish",
}


class CandlestickPriceActionStrategy(BaseStrategy):
    code = "candlestick_price_action"
    name = "Candlestick Price Action"

    def evaluate(
        self,
        df: pd.DataFrame,
        features: FeatureSnapshot,
        extra_timeframes: dict | None = None,
    ) -> StrategyEvaluation:
        cfg = self.config
        last = df.iloc[-1]
        rng = max(last["high"] - last["low"], 1e-9)
        body_ratio = abs(last["close"] - last["open"]) / rng
        if features.abnormal_volatility:
            return StrategyEvaluation.no_trade(
                "Volatility outside acceptable range for price-action entry", "abnormal_volatility"
            )
        if body_ratio < cfg.get("min_body_ratio", 0.3) and not any(
            features.patterns.get(p) for p in ("hammer", "shooting_star", "pin_bar_bullish", "pin_bar_bearish")
        ):
            return StrategyEvaluation.no_trade("Candle body too small to validate pattern", "invalid_candle_size")

        active_bullish = [p for p in _BULLISH_PATTERNS if features.patterns.get(p)]
        active_bearish = [p for p in _BEARISH_PATTERNS if features.patterns.get(p)]
        sr_buffer = features.atr_14 * cfg.get("sr_buffer_atr_multiple", 0.5)

        trend_context_bullish = features.close > features.ema_50 or features.structure == "HH_HL"
        trend_context_bearish = features.close < features.ema_50 or features.structure == "LH_LL"

        if active_bullish and trend_context_bullish:
            if features.distance_from_resistance is not None and features.distance_from_resistance < sr_buffer:
                return StrategyEvaluation.no_trade("Resistance too close for pattern CALL", "resistance_blocking")
            components = {
                "trend_alignment": 1.0 if features.close > features.ema_50 else 0.6,
                "momentum_alignment": min(1.0, max(0.0, (features.rsi_14 - 40) / 30)),
                "price_action": min(1.0, body_ratio + 0.3),
                "sr_location": 1.0,
                "volatility_suitability": 1.0,
                "data_quality": 0.0 if features.missing_candle else 1.0,
            }
            return StrategyEvaluation(
                direction=SignalDirection.CALL,
                confidence=compute_rule_based_confidence(components),
                reasons=[
                    SignalReasonItem(p, f"Bullish {p.replace('_', ' ')} pattern with supporting context", 0.9)
                    for p in active_bullish
                ],
                feature_snapshot={"body_ratio": body_ratio},
            )

        if active_bearish and trend_context_bearish:
            if features.distance_from_support is not None and features.distance_from_support < sr_buffer:
                return StrategyEvaluation.no_trade("Support too close for pattern PUT", "support_blocking")
            components = {
                "trend_alignment": 1.0 if features.close < features.ema_50 else 0.6,
                "momentum_alignment": min(1.0, max(0.0, (60 - features.rsi_14) / 30)),
                "price_action": min(1.0, body_ratio + 0.3),
                "sr_location": 1.0,
                "volatility_suitability": 1.0,
                "data_quality": 0.0 if features.missing_candle else 1.0,
            }
            return StrategyEvaluation(
                direction=SignalDirection.PUT,
                confidence=compute_rule_based_confidence(components),
                reasons=[
                    SignalReasonItem(p, f"Bearish {p.replace('_', ' ')} pattern with supporting context", 0.9)
                    for p in active_bearish
                ],
                feature_snapshot={"body_ratio": body_ratio},
            )

        return StrategyEvaluation.no_trade("No candlestick pattern with sufficient context")
