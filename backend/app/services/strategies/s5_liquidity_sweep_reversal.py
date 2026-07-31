"""Strategy 5: Liquidity Sweep Reversal.

Detects stop-hunt sweeps beyond recent swing highs/lows followed by a fast
reclaim, a significant wick and a confirmation candle in the reversal
direction. Rejects weak sweeps and low-volatility random wicks.
"""

from __future__ import annotations

import pandas as pd

from app.models.enums import SignalDirection
from app.services.features.engine import FeatureSnapshot
from app.services.features.structure import find_swing_points
from app.services.strategies.base import (
    BaseStrategy,
    SignalReasonItem,
    StrategyEvaluation,
    compute_rule_based_confidence,
)


class LiquiditySweepReversalStrategy(BaseStrategy):
    code = "liquidity_sweep_reversal"
    name = "Liquidity Sweep Reversal"

    def evaluate(
        self,
        df: pd.DataFrame,
        features: FeatureSnapshot,
        extra_timeframes: dict | None = None,
    ) -> StrategyEvaluation:
        cfg = self.config
        if features.atr_pct_of_price < cfg.get("min_atr_pct", 0.03):
            return StrategyEvaluation.no_trade("Volatility too low for a meaningful sweep", "low_volatility")

        lookback = cfg.get("swing_lookback", 30)
        window = df.tail(lookback + 5).reset_index(drop=True)
        swings = find_swing_points(window.iloc[:-3], 3)
        swing_lows = [p.price for p in swings if p.kind == "low"]
        swing_highs = [p.price for p in swings if p.kind == "high"]

        last = window.iloc[-1]
        reclaim_bars = cfg.get("reclaim_max_bars", 3)
        recent = window.tail(reclaim_bars + 1)
        wick_atr_mult = cfg.get("sweep_wick_atr_multiple", 0.8)

        if swing_lows:
            lowest_swing = min(swing_lows)
            swept = recent["low"].min() < lowest_swing
            lower_wick = min(last["close"], last["open"]) - recent["low"].min()
            reclaimed = last["close"] > lowest_swing
            bullish_confirm = last["close"] > last["open"]
            if swept and reclaimed and bullish_confirm and lower_wick >= features.atr_14 * wick_atr_mult:
                components = {
                    "trend_alignment": 0.6,
                    "momentum_alignment": min(1.0, max(0.0, (features.rsi_14 - 35) / 35)),
                    "price_action": 1.0,
                    "sr_location": 1.0,
                    "volatility_suitability": 1.0,
                    "data_quality": 0.0 if features.missing_candle else 1.0,
                }
                return StrategyEvaluation(
                    direction=SignalDirection.CALL,
                    confidence=compute_rule_based_confidence(components),
                    reasons=[
                        SignalReasonItem(
                            "liquidity_sweep_low", f"Swept below swing low {lowest_swing:.5f} and reclaimed", 1.0
                        ),
                        SignalReasonItem(
                            "bullish_recovery", "Momentum recovering with bullish confirmation candle", 0.8
                        ),
                    ],
                    feature_snapshot={"swept_level": lowest_swing},
                )

        if swing_highs:
            highest_swing = max(swing_highs)
            swept = recent["high"].max() > highest_swing
            upper_wick = recent["high"].max() - max(last["close"], last["open"])
            reclaimed = last["close"] < highest_swing
            bearish_confirm = last["close"] < last["open"]
            if swept and reclaimed and bearish_confirm and upper_wick >= features.atr_14 * wick_atr_mult:
                components = {
                    "trend_alignment": 0.6,
                    "momentum_alignment": min(1.0, max(0.0, (65 - features.rsi_14) / 35)),
                    "price_action": 1.0,
                    "sr_location": 1.0,
                    "volatility_suitability": 1.0,
                    "data_quality": 0.0 if features.missing_candle else 1.0,
                }
                return StrategyEvaluation(
                    direction=SignalDirection.PUT,
                    confidence=compute_rule_based_confidence(components),
                    reasons=[
                        SignalReasonItem(
                            "liquidity_sweep_high", f"Swept above swing high {highest_swing:.5f} and reclaimed", 1.0
                        ),
                        SignalReasonItem(
                            "bearish_recovery", "Momentum recovering with bearish confirmation candle", 0.8
                        ),
                    ],
                    feature_snapshot={"swept_level": highest_swing},
                )

        return StrategyEvaluation.no_trade("No qualifying liquidity sweep detected")
