"""Strategy 7: Bollinger Squeeze Breakout.

Detects volatility compression (low Bollinger Band-width percentile)
followed by expansion and a strong directional close beyond the bands,
confirmed by trend/momentum, while rejecting false-breakout candles with
a large opposing wick.
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


class BollingerSqueezeBreakoutStrategy(BaseStrategy):
    code = "bollinger_squeeze_breakout"
    name = "Bollinger Squeeze Breakout"

    def evaluate(
        self,
        df: pd.DataFrame,
        features: FeatureSnapshot,
        extra_timeframes: dict | None = None,
    ) -> StrategyEvaluation:
        cfg = self.config
        close = df["close"].astype(float)
        upper, _mid, lower, width = ind.bollinger_bands(close, cfg.get("bb_period", 20), cfg.get("bb_std", 2.0))
        width_clean = width.dropna()
        if len(width_clean) < 30:
            return StrategyEvaluation.no_trade("Insufficient history for squeeze detection", "insufficient_data")

        percentile_rank = float((width_clean <= width_clean.iloc[-1]).sum() / len(width_clean) * 100)
        was_squeezed = (
            float((width_clean.iloc[-6:-1] <= width_clean.quantile(cfg.get("squeeze_percentile", 20) / 100)).mean())
            >= 0.6
        )
        expanding_now = width_clean.iloc[-1] > width_clean.iloc[-2]

        if not (was_squeezed and expanding_now):
            return StrategyEvaluation.no_trade("No squeeze-to-expansion transition detected", "no_squeeze_expansion")

        last = df.iloc[-1]
        rng = max(last["high"] - last["low"], 1e-9)
        body = abs(last["close"] - last["open"])
        opposite_wick_ratio_max = cfg.get("opposite_wick_max_ratio", 0.4)

        broke_upper = last["close"] > upper.iloc[-1]
        broke_lower = last["close"] < lower.iloc[-1]
        trend_up = features.close > features.ema_50
        trend_down = features.close < features.ema_50

        if broke_upper and trend_up:
            opposite_wick = (min(last["close"], last["open"]) - last["low"]) / rng
            if opposite_wick > opposite_wick_ratio_max:
                return StrategyEvaluation.no_trade("Large opposing wick suggests false breakout", "false_breakout_wick")
            components = {
                "trend_alignment": 1.0,
                "momentum_alignment": min(1.0, max(0.0, (features.rsi_14 - 50) / 30)),
                "price_action": body / rng,
                "sr_location": 0.8,
                "volatility_suitability": 1.0,
                "data_quality": 0.0 if features.missing_candle else 1.0,
            }
            return StrategyEvaluation(
                direction=SignalDirection.CALL,
                confidence=compute_rule_based_confidence(components),
                reasons=[
                    SignalReasonItem(
                        "volatility_squeeze_release",
                        f"Bollinger width expanded from {percentile_rank:.0f}th percentile squeeze",
                        1.0,
                    ),
                    SignalReasonItem("bullish_band_break", "Strong candle closed above the upper band", 0.9),
                ],
                feature_snapshot={"bb_width_percentile": percentile_rank},
            )

        if broke_lower and trend_down:
            opposite_wick = (last["high"] - max(last["close"], last["open"])) / rng
            if opposite_wick > opposite_wick_ratio_max:
                return StrategyEvaluation.no_trade("Large opposing wick suggests false breakout", "false_breakout_wick")
            components = {
                "trend_alignment": 1.0,
                "momentum_alignment": min(1.0, max(0.0, (50 - features.rsi_14) / 30)),
                "price_action": body / rng,
                "sr_location": 0.8,
                "volatility_suitability": 1.0,
                "data_quality": 0.0 if features.missing_candle else 1.0,
            }
            return StrategyEvaluation(
                direction=SignalDirection.PUT,
                confidence=compute_rule_based_confidence(components),
                reasons=[
                    SignalReasonItem(
                        "volatility_squeeze_release",
                        f"Bollinger width expanded from {percentile_rank:.0f}th percentile squeeze",
                        1.0,
                    ),
                    SignalReasonItem("bearish_band_break", "Strong candle closed below the lower band", 0.9),
                ],
                feature_snapshot={"bb_width_percentile": percentile_rank},
            )

        return StrategyEvaluation.no_trade("No confirmed directional breakout from squeeze")
