"""Strategy 4: Breakout & Retest.

Generates a continuation signal after a confirmed breakout candle closes
beyond support/resistance and price successfully retests the broken level
with rejection in the breakout direction. Never enters on the first
breakout spike without a confirmed retest.
"""

from __future__ import annotations

import pandas as pd

from app.models.enums import SignalDirection
from app.services.features.engine import FeatureSnapshot
from app.services.features.structure import find_swing_points, support_resistance_levels
from app.services.strategies.base import (
    BaseStrategy,
    SignalReasonItem,
    StrategyEvaluation,
    compute_rule_based_confidence,
)


class BreakoutRetestStrategy(BaseStrategy):
    code = "breakout_retest"
    name = "Breakout & Retest"

    def evaluate(
        self,
        df: pd.DataFrame,
        features: FeatureSnapshot,
        extra_timeframes: dict | None = None,
    ) -> StrategyEvaluation:
        cfg = self.config
        lookback = cfg.get("swing_lookback", 40)
        window = df.tail(lookback + cfg.get("max_bars_to_retest", 8)).reset_index(drop=True)
        if len(window) < lookback // 2:
            return StrategyEvaluation.no_trade("Insufficient history for breakout detection", "insufficient_data")

        swings = find_swing_points(window, 3)
        tolerance = features.atr_14 * cfg.get("retest_tolerance_atr_multiple", 0.35)
        support_levels, resistance_levels = support_resistance_levels(swings, tolerance)

        max_bars_to_retest = cfg.get("max_bars_to_retest", 8)
        breakout_body_atr_multiple = cfg.get("breakout_body_atr_multiple", 1.1)

        recent = window.tail(max_bars_to_retest + 1)
        last = recent.iloc[-1]

        for level in resistance_levels:
            breakout_idx = None
            for i in range(len(recent) - 1):
                candle = recent.iloc[i]
                body = abs(candle["close"] - candle["open"])
                if candle["close"] > level and body >= features.atr_14 * breakout_body_atr_multiple:
                    breakout_idx = i
                    break
            if breakout_idx is None:
                continue
            retested = any(
                abs(recent.iloc[j]["low"] - level) <= tolerance for j in range(breakout_idx + 1, len(recent))
            )
            rejection_up = last["close"] > level and last["close"] > last["open"]
            if retested and rejection_up:
                components = {
                    "trend_alignment": 0.8,
                    "momentum_alignment": min(1.0, max(0.0, (features.rsi_14 - 45) / 30)),
                    "price_action": 1.0,
                    "sr_location": 1.0,
                    "volatility_suitability": 1.0 if not features.abnormal_volatility else 0.4,
                    "data_quality": 0.0 if features.missing_candle else 1.0,
                }
                return StrategyEvaluation(
                    direction=SignalDirection.CALL,
                    confidence=compute_rule_based_confidence(components),
                    reasons=[
                        SignalReasonItem("resistance_breakout", f"Confirmed breakout above {level:.5f}", 1.0),
                        SignalReasonItem(
                            "retest_confirmed", "Retest of broken resistance held with bullish rejection", 1.0
                        ),
                    ],
                    feature_snapshot={"level": level},
                )

        for level in support_levels:
            breakout_idx = None
            for i in range(len(recent) - 1):
                candle = recent.iloc[i]
                body = abs(candle["close"] - candle["open"])
                if candle["close"] < level and body >= features.atr_14 * breakout_body_atr_multiple:
                    breakout_idx = i
                    break
            if breakout_idx is None:
                continue
            retested = any(
                abs(recent.iloc[j]["high"] - level) <= tolerance for j in range(breakout_idx + 1, len(recent))
            )
            rejection_down = last["close"] < level and last["close"] < last["open"]
            if retested and rejection_down:
                components = {
                    "trend_alignment": 0.8,
                    "momentum_alignment": min(1.0, max(0.0, (55 - features.rsi_14) / 30)),
                    "price_action": 1.0,
                    "sr_location": 1.0,
                    "volatility_suitability": 1.0 if not features.abnormal_volatility else 0.4,
                    "data_quality": 0.0 if features.missing_candle else 1.0,
                }
                return StrategyEvaluation(
                    direction=SignalDirection.PUT,
                    confidence=compute_rule_based_confidence(components),
                    reasons=[
                        SignalReasonItem("support_breakdown", f"Confirmed breakdown below {level:.5f}", 1.0),
                        SignalReasonItem(
                            "retest_confirmed", "Retest of broken support held with bearish rejection", 1.0
                        ),
                    ],
                    feature_snapshot={"level": level},
                )

        return StrategyEvaluation.no_trade("No confirmed breakout-and-retest setup")
