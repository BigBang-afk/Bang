"""Strategy 6: RSI Divergence Reversal.

Detects regular (and optionally hidden) RSI divergence at meaningful
support/resistance. Divergence alone is never enough - both level
confluence and a confirmation candle are required.
"""

from __future__ import annotations

import pandas as pd

from app.models.enums import SignalDirection
from app.services.features import indicators as ind
from app.services.features.engine import FeatureSnapshot
from app.services.features.structure import find_swing_points
from app.services.strategies.base import (
    BaseStrategy,
    SignalReasonItem,
    StrategyEvaluation,
    compute_rule_based_confidence,
)


class RsiDivergenceReversalStrategy(BaseStrategy):
    code = "rsi_divergence_reversal"
    name = "RSI Divergence Reversal"

    def evaluate(
        self,
        df: pd.DataFrame,
        features: FeatureSnapshot,
        extra_timeframes: dict | None = None,
    ) -> StrategyEvaluation:
        cfg = self.config
        lookback = cfg.get("swing_lookback", 30)
        window = df.tail(lookback).reset_index(drop=True)
        if len(window) < 15:
            return StrategyEvaluation.no_trade("Insufficient history for divergence detection", "insufficient_data")

        rsi_series = ind.rsi(window["close"].astype(float), cfg.get("rsi_period", 14))
        swings = find_swing_points(window, 3)
        lows = [p for p in swings if p.kind == "low"]
        highs = [p for p in swings if p.kind == "high"]

        tolerance = features.atr_14 * cfg.get("level_tolerance_atr_multiple", 0.4)
        last = window.iloc[-1]
        allow_hidden = cfg.get("allow_hidden_divergence", True)

        if len(lows) >= 2:
            p1, p2 = lows[-2], lows[-1]
            rsi1, rsi2 = rsi_series.iloc[p1.index], rsi_series.iloc[p2.index]
            regular_bullish = p2.price < p1.price and rsi2 > rsi1
            hidden_bullish = allow_hidden and p2.price > p1.price and rsi2 < rsi1
            near_support = features.distance_from_support is not None and features.distance_from_support <= tolerance
            bullish_confirm = last["close"] > last["open"]
            if (regular_bullish or hidden_bullish) and near_support and bullish_confirm:
                components = {
                    "trend_alignment": 0.6 if hidden_bullish else 0.7,
                    "momentum_alignment": min(1.0, max(0.0, (rsi2 - rsi1) / 20)),
                    "price_action": 1.0,
                    "sr_location": 1.0,
                    "volatility_suitability": 1.0 if not features.abnormal_volatility else 0.4,
                    "data_quality": 0.0 if features.missing_candle else 1.0,
                }
                kind = "Hidden" if hidden_bullish else "Regular"
                return StrategyEvaluation(
                    direction=SignalDirection.CALL,
                    confidence=compute_rule_based_confidence(components),
                    reasons=[
                        SignalReasonItem("rsi_bullish_divergence", f"{kind} bullish RSI divergence at support", 1.0),
                        SignalReasonItem("bullish_confirmation", "Bullish confirmation candle formed", 0.8),
                    ],
                    feature_snapshot={"rsi_prev": rsi1, "rsi_now": rsi2},
                )

        if len(highs) >= 2:
            p1, p2 = highs[-2], highs[-1]
            rsi1, rsi2 = rsi_series.iloc[p1.index], rsi_series.iloc[p2.index]
            regular_bearish = p2.price > p1.price and rsi2 < rsi1
            hidden_bearish = allow_hidden and p2.price < p1.price and rsi2 > rsi1
            near_resistance = (
                features.distance_from_resistance is not None and features.distance_from_resistance <= tolerance
            )
            bearish_confirm = last["close"] < last["open"]
            if (regular_bearish or hidden_bearish) and near_resistance and bearish_confirm:
                components = {
                    "trend_alignment": 0.6 if hidden_bearish else 0.7,
                    "momentum_alignment": min(1.0, max(0.0, (rsi1 - rsi2) / 20)),
                    "price_action": 1.0,
                    "sr_location": 1.0,
                    "volatility_suitability": 1.0 if not features.abnormal_volatility else 0.4,
                    "data_quality": 0.0 if features.missing_candle else 1.0,
                }
                kind = "Hidden" if hidden_bearish else "Regular"
                return StrategyEvaluation(
                    direction=SignalDirection.PUT,
                    confidence=compute_rule_based_confidence(components),
                    reasons=[
                        SignalReasonItem("rsi_bearish_divergence", f"{kind} bearish RSI divergence at resistance", 1.0),
                        SignalReasonItem("bearish_confirmation", "Bearish confirmation candle formed", 0.8),
                    ],
                    feature_snapshot={"rsi_prev": rsi1, "rsi_now": rsi2},
                )

        return StrategyEvaluation.no_trade("No confirmed RSI divergence at a qualifying level")
