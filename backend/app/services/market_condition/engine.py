"""Market-condition classifier.

Classifies the current market into one of the ten states from the spec and
exposes which strategy families are suitable, so the signal engine can
reject an incompatible strategy/market pairing (e.g. a trend strategy in an
extremely narrow range, or a reversal strategy during an explosive breakout).
"""

from __future__ import annotations

from app.models.enums import MarketCondition
from app.services.features.engine import FeatureSnapshot

# Strategy families, used to gate compatibility with market conditions.
TREND_STRATEGIES = {
    "ema_trend_pullback",
    "ema_crossover_momentum",
    "macd_momentum_continuation",
    "multi_timeframe_confluence",
}
REVERSAL_STRATEGIES = {"support_resistance_rejection", "liquidity_sweep_reversal", "rsi_divergence_reversal"}
BREAKOUT_STRATEGIES = {"breakout_retest", "bollinger_squeeze_breakout"}
CONTEXTUAL_STRATEGIES = {"candlestick_price_action"}

INCOMPATIBLE: dict[MarketCondition, set[str]] = {
    MarketCondition.LOW_VOLATILITY: TREND_STRATEGIES | BREAKOUT_STRATEGIES,
    MarketCondition.RANGE: TREND_STRATEGIES,
    MarketCondition.BREAKOUT: REVERSAL_STRATEGIES,
    MarketCondition.HIGH_VOLATILITY: REVERSAL_STRATEGIES,
    MarketCondition.VOLATILITY_SQUEEZE: TREND_STRATEGIES | REVERSAL_STRATEGIES,
}


def classify(features: FeatureSnapshot) -> MarketCondition:
    if features.abnormal_volatility and features.volatility_percentile >= 97:
        return MarketCondition.HIGH_VOLATILITY
    if features.volatility_percentile <= 3:
        return MarketCondition.LOW_VOLATILITY
    if (
        features.bb_width > 0
        and features.volatility_percentile <= 15
        and abs(features.ema_9_slope) < features.atr_14 * 0.1
    ):
        return MarketCondition.VOLATILITY_SQUEEZE
    if features.bos is not None and features.volatility_percentile >= 60:
        return MarketCondition.BREAKOUT

    trend_up = features.ema_9 > features.ema_21 > features.ema_50 and features.close > features.ema_200
    trend_down = features.ema_9 < features.ema_21 < features.ema_50 and features.close < features.ema_200
    slope_strength = abs(features.ema_21_slope) / max(features.atr_14, 1e-9)

    if trend_up:
        return MarketCondition.STRONG_BULLISH_TREND if slope_strength > 0.3 else MarketCondition.WEAK_BULLISH_TREND
    if trend_down:
        return MarketCondition.STRONG_BEARISH_TREND if slope_strength > 0.3 else MarketCondition.WEAK_BEARISH_TREND

    if features.structure == "RANGE_STRUCTURE" or (
        features.distance_from_support is not None
        and features.distance_from_resistance is not None
        and features.distance_from_support < features.atr_14 * 3
        and features.distance_from_resistance < features.atr_14 * 3
    ):
        return MarketCondition.RANGE

    return MarketCondition.UNCLEAR


def is_strategy_compatible(strategy_code: str, condition: MarketCondition) -> tuple[bool, str | None]:
    blocked = INCOMPATIBLE.get(condition, set())
    if strategy_code in blocked:
        return False, f"Strategy '{strategy_code}' is unsuitable for market condition '{condition.value}'."
    return True, None
