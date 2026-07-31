"""Shared strategy interface and rule-based confidence helper.

Every one of the 10 strategies implements BaseStrategy.evaluate(), which
must return NO_TRADE by default and only return CALL/PUT when its own
entry conditions are met and none of its rejection conditions fire. No
strategy may be forced to produce a signal.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field

import pandas as pd

from app.models.enums import SignalDirection
from app.services.features.engine import FeatureSnapshot


@dataclass
class SignalReasonItem:
    code: str
    text: str
    score: float = 0.0


@dataclass
class StrategyEvaluation:
    direction: SignalDirection
    confidence: float = 0.0
    reasons: list[SignalReasonItem] = field(default_factory=list)
    feature_snapshot: dict[str, float] = field(default_factory=dict)

    @classmethod
    def no_trade(cls, reason: str, code: str = "no_setup") -> StrategyEvaluation:
        return cls(direction=SignalDirection.NO_TRADE, confidence=0.0, reasons=[SignalReasonItem(code, reason, 0.0)])


def compute_rule_based_confidence(components: dict[str, float], weights: dict[str, float] | None = None) -> float:
    """Combine 0..1 component scores (trend, momentum, price action, S/R,
    volatility, MTF agreement, data quality, strategy-specific) into a
    0..100 rule-based confidence score."""
    if not components:
        return 0.0
    weights = weights or {k: 1.0 for k in components}
    total_weight = sum(weights.get(k, 1.0) for k in components)
    if total_weight == 0:
        return 0.0
    weighted_sum = sum(components[k] * weights.get(k, 1.0) for k in components)
    return max(0.0, min(100.0, round((weighted_sum / total_weight) * 100, 2)))


class BaseStrategy(ABC):
    code: str
    name: str

    def __init__(self, config: dict) -> None:
        self.config = config

    @abstractmethod
    def evaluate(
        self,
        df: pd.DataFrame,
        features: FeatureSnapshot,
        extra_timeframes: dict[str, tuple[pd.DataFrame, FeatureSnapshot]] | None = None,
    ) -> StrategyEvaluation:
        """Evaluate the strategy's entry/rejection conditions for the latest
        candle. `extra_timeframes` maps a timeframe label (e.g. "5m", "15m")
        to its own (dataframe, feature snapshot) pair, only populated for
        strategies that require multi-timeframe confluence."""
        ...
