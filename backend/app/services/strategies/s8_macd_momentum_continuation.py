"""Strategy 8: MACD Momentum Continuation.

Trades short-term continuation when EMA trend, MACD histogram expansion and
RSI are aligned and no opposing level sits nearby. Rejects signals when
histogram momentum is weakening.
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


class MacdMomentumContinuationStrategy(BaseStrategy):
    code = "macd_momentum_continuation"
    name = "MACD Momentum Continuation"

    def evaluate(
        self,
        df: pd.DataFrame,
        features: FeatureSnapshot,
        extra_timeframes: dict | None = None,
    ) -> StrategyEvaluation:
        cfg = self.config
        close = df["close"].astype(float)
        _, _, hist = ind.macd(close, cfg.get("macd_fast", 12), cfg.get("macd_slow", 26), cfg.get("macd_signal", 9))
        if len(hist.dropna()) < 3:
            return StrategyEvaluation.no_trade("Insufficient MACD history", "insufficient_data")

        strengthening = abs(hist.iloc[-1]) > abs(hist.iloc[-2]) > abs(hist.iloc[-3])
        if not strengthening:
            return StrategyEvaluation.no_trade("MACD histogram momentum is weakening", "weakening_momentum")

        rsi_high = cfg.get("rsi_extreme_high", 75)
        rsi_low = cfg.get("rsi_extreme_low", 25)
        last = df.iloc[-1]
        strong_close = last["close"] > last["open"] if hist.iloc[-1] > 0 else last["close"] < last["open"]
        if not strong_close:
            return StrategyEvaluation.no_trade("Candle close does not confirm momentum direction", "no_strong_close")

        trend_up = features.ema_21 > features.ema_50 and features.close > features.ema_21
        trend_down = features.ema_21 < features.ema_50 and features.close < features.ema_21
        sr_buffer = features.atr_14 * 0.5

        if hist.iloc[-1] > 0 and trend_up:
            if features.rsi_14 >= rsi_high:
                return StrategyEvaluation.no_trade("RSI overextended for continuation CALL", "rsi_extended")
            if features.distance_from_resistance is not None and features.distance_from_resistance < sr_buffer:
                return StrategyEvaluation.no_trade("Resistance too close for CALL", "resistance_blocking")
            components = {
                "trend_alignment": 1.0,
                "momentum_alignment": 1.0,
                "price_action": 0.8,
                "sr_location": 1.0 if (features.distance_from_resistance or 999) > sr_buffer * 2 else 0.6,
                "volatility_suitability": 1.0 if not features.abnormal_volatility else 0.4,
                "data_quality": 0.0 if features.missing_candle else 1.0,
            }
            return StrategyEvaluation(
                direction=SignalDirection.CALL,
                confidence=compute_rule_based_confidence(components),
                reasons=[
                    SignalReasonItem("macd_momentum_expanding", "MACD histogram expanding bullish for 3 bars", 1.0),
                    SignalReasonItem("trend_confirms", "EMA21 > EMA50 with price above EMA21", 0.9),
                ],
                feature_snapshot={"macd_hist": hist.iloc[-1]},
            )

        if hist.iloc[-1] < 0 and trend_down:
            if features.rsi_14 <= rsi_low:
                return StrategyEvaluation.no_trade("RSI overextended for continuation PUT", "rsi_extended")
            if features.distance_from_support is not None and features.distance_from_support < sr_buffer:
                return StrategyEvaluation.no_trade("Support too close for PUT", "support_blocking")
            components = {
                "trend_alignment": 1.0,
                "momentum_alignment": 1.0,
                "price_action": 0.8,
                "sr_location": 1.0 if (features.distance_from_support or 999) > sr_buffer * 2 else 0.6,
                "volatility_suitability": 1.0 if not features.abnormal_volatility else 0.4,
                "data_quality": 0.0 if features.missing_candle else 1.0,
            }
            return StrategyEvaluation(
                direction=SignalDirection.PUT,
                confidence=compute_rule_based_confidence(components),
                reasons=[
                    SignalReasonItem("macd_momentum_expanding", "MACD histogram expanding bearish for 3 bars", 1.0),
                    SignalReasonItem("trend_confirms", "EMA21 < EMA50 with price below EMA21", 0.9),
                ],
                feature_snapshot={"macd_hist": hist.iloc[-1]},
            )

        return StrategyEvaluation.no_trade("Trend and MACD momentum are not aligned")
