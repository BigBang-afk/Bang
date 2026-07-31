"""Strategy 2: EMA Crossover Momentum.

Detects a fresh EMA9/EMA21 crossover confirmed by MACD histogram expansion
and RSI momentum. Rejects late entries after an extended move and requires
room before the next support/resistance level.
"""

from __future__ import annotations

import pandas as pd

from app.models.enums import SignalDirection
from app.services.features import indicators as ind
from app.services.features.engine import FeatureSnapshot
from app.services.strategies.base import (
    BaseStrategy,
    SignalReasonItem,
    StrategyEvaluation,
    compute_rule_based_confidence,
)


class EmaCrossoverMomentumStrategy(BaseStrategy):
    code = "ema_crossover_momentum"
    name = "EMA Crossover Momentum"

    def evaluate(
        self,
        df: pd.DataFrame,
        features: FeatureSnapshot,
        extra_timeframes: dict | None = None,
    ) -> StrategyEvaluation:
        cfg = self.config
        close = df["close"].astype(float)
        ema_fast = ind.ema(close, cfg.get("ema_fast", 9))
        ema_mid = ind.ema(close, cfg.get("ema_mid", 21))

        max_bars = cfg.get("max_bars_since_cross", 3)
        bars_since_cross = None
        for lag in range(1, max_bars + 2):
            if lag >= len(ema_fast):
                break
            prev_above = ema_fast.iloc[-lag - 1] > ema_mid.iloc[-lag - 1]
            now_above = ema_fast.iloc[-1] > ema_mid.iloc[-1]
            prev_below = ema_fast.iloc[-lag - 1] < ema_mid.iloc[-lag - 1]
            now_below = ema_fast.iloc[-1] < ema_mid.iloc[-1]
            if (now_above and prev_below) or (now_below and prev_above):
                bars_since_cross = lag
                break

        if bars_since_cross is None or bars_since_cross > max_bars:
            return StrategyEvaluation.no_trade("No fresh EMA crossover within lookback", "no_fresh_crossover")

        bullish_cross = ema_fast.iloc[-1] > ema_mid.iloc[-1]
        macd_expanding = abs(features.macd_hist) > abs(features.macd_hist) * 0 and (
            (bullish_cross and features.macd_hist > 0) or (not bullish_cross and features.macd_hist < 0)
        )
        if not macd_expanding:
            return StrategyEvaluation.no_trade(
                "MACD histogram does not confirm crossover direction", "macd_not_confirming"
            )

        # Reject late/extended entries: price already far from EMA21 relative to ATR
        extension = abs(features.close - features.ema_21) / max(features.atr_14, 1e-9)
        if extension > 2.5:
            return StrategyEvaluation.no_trade("Move already extended past EMA21", "extended_move")

        sr_buffer = features.atr_14 * cfg.get("sr_buffer_atr_multiple", 0.6)

        if bullish_cross:
            if features.rsi_14 < 50:
                return StrategyEvaluation.no_trade("RSI does not confirm bullish momentum", "rsi_not_confirming")
            if features.distance_from_resistance is not None and features.distance_from_resistance < sr_buffer:
                return StrategyEvaluation.no_trade("Resistance too close for CALL", "resistance_blocking")
            components = {
                "trend_alignment": 1.0,
                "momentum_alignment": min(1.0, (features.rsi_14 - 50) / 25),
                "price_action": 0.7,
                "sr_location": 1.0 if (features.distance_from_resistance or 999) > sr_buffer * 2 else 0.6,
                "volatility_suitability": 1.0 if not features.abnormal_volatility else 0.3,
                "data_quality": 0.0 if features.missing_candle else 1.0,
            }
            return StrategyEvaluation(
                direction=SignalDirection.CALL,
                confidence=compute_rule_based_confidence(components),
                reasons=[
                    SignalReasonItem(
                        "ema_crossover_bullish", f"EMA9 crossed above EMA21 {bars_since_cross} bar(s) ago", 1.0
                    ),
                    SignalReasonItem("macd_confirms", "MACD histogram confirms bullish momentum", 0.8),
                ],
                feature_snapshot={"rsi": features.rsi_14, "macd_hist": features.macd_hist},
            )

        if features.rsi_14 > 50:
            return StrategyEvaluation.no_trade("RSI does not confirm bearish momentum", "rsi_not_confirming")
        if features.distance_from_support is not None and features.distance_from_support < sr_buffer:
            return StrategyEvaluation.no_trade("Support too close for PUT", "support_blocking")
        components = {
            "trend_alignment": 1.0,
            "momentum_alignment": min(1.0, (50 - features.rsi_14) / 25),
            "price_action": 0.7,
            "sr_location": 1.0 if (features.distance_from_support or 999) > sr_buffer * 2 else 0.6,
            "volatility_suitability": 1.0 if not features.abnormal_volatility else 0.3,
            "data_quality": 0.0 if features.missing_candle else 1.0,
        }
        return StrategyEvaluation(
            direction=SignalDirection.PUT,
            confidence=compute_rule_based_confidence(components),
            reasons=[
                SignalReasonItem(
                    "ema_crossover_bearish", f"EMA9 crossed below EMA21 {bars_since_cross} bar(s) ago", 1.0
                ),
                SignalReasonItem("macd_confirms", "MACD histogram confirms bearish momentum", 0.8),
            ],
            feature_snapshot={"rsi": features.rsi_14, "macd_hist": features.macd_hist},
        )
