"""AI Strategy Selector ("AI Auto Mode").

Not an 11th strategy. It evaluates every enabled, market-compatible
strategy, measures confluence between the strategies that agree, and either
picks the strongest supported direction or returns NO TRADE. It never
invents a signal a strategy did not itself produce.
"""

from __future__ import annotations

from dataclasses import dataclass, field

import pandas as pd

from app.core.logging import get_logger
from app.models.enums import MarketCondition, SignalDirection
from app.services.features.engine import FeatureSnapshot
from app.services.market_condition.engine import is_strategy_compatible
from app.services.strategies.base import SignalReasonItem, StrategyEvaluation
from app.services.strategies.registry import build_strategy

logger = get_logger(__name__)


@dataclass
class AiSelectorResult:
    direction: SignalDirection
    confidence: float
    primary_strategy_code: str | None
    supporting_strategy_codes: list[str] = field(default_factory=list)
    conflicting_strategy_codes: list[str] = field(default_factory=list)
    reasons: list[SignalReasonItem] = field(default_factory=list)
    per_strategy_results: dict[str, StrategyEvaluation] = field(default_factory=dict)

    @classmethod
    def no_trade(
        cls, reason: str, per_strategy_results: dict[str, StrategyEvaluation] | None = None
    ) -> AiSelectorResult:
        return cls(
            direction=SignalDirection.NO_TRADE,
            confidence=0.0,
            primary_strategy_code=None,
            reasons=[SignalReasonItem("ai_no_trade", reason, 0.0)],
            per_strategy_results=per_strategy_results or {},
        )


MIN_CONFIDENCE_TO_CONSIDER = 55.0


def select(
    enabled_strategies: list[tuple[str, dict]],
    df: pd.DataFrame,
    features: FeatureSnapshot,
    market_condition: MarketCondition,
    extra_timeframes: dict | None = None,
) -> AiSelectorResult:
    """`enabled_strategies` is a list of (strategy_code, configuration_json)
    pairs for strategies flagged is_enabled=True in the database."""
    per_strategy: dict[str, StrategyEvaluation] = {}

    for strategy_code, configuration in enabled_strategies:
        compatible, _reason = is_strategy_compatible(strategy_code, market_condition)
        if not compatible:
            continue
        strategy = build_strategy(strategy_code, configuration)
        try:
            result = strategy.evaluate(df, features, extra_timeframes)
        except Exception:
            # One misbehaving strategy must not take down AI Auto mode for the rest.
            logger.exception("ai_selector_strategy_evaluation_failed", strategy_code=strategy_code)
            continue
        if result.direction != SignalDirection.NO_TRADE and result.confidence >= MIN_CONFIDENCE_TO_CONSIDER:
            per_strategy[strategy_code] = result

    if not per_strategy:
        return AiSelectorResult.no_trade(
            "No enabled strategy produced a qualifying signal for current conditions", per_strategy
        )

    calls = {k: v for k, v in per_strategy.items() if v.direction == SignalDirection.CALL}
    puts = {k: v for k, v in per_strategy.items() if v.direction == SignalDirection.PUT}

    if calls and puts:
        # Conflicting signals across strategies - reject rather than guess.
        return AiSelectorResult(
            direction=SignalDirection.NO_TRADE,
            confidence=0.0,
            primary_strategy_code=None,
            supporting_strategy_codes=[],
            conflicting_strategy_codes=list(calls.keys()) + list(puts.keys()),
            reasons=[
                SignalReasonItem(
                    "conflicting_strategies",
                    f"CALL strategies {list(calls.keys())} conflict with PUT strategies {list(puts.keys())}",
                    0.0,
                )
            ],
            per_strategy_results=per_strategy,
        )

    winners = calls or puts
    direction = SignalDirection.CALL if calls else SignalDirection.PUT
    primary_code = max(winners, key=lambda k: winners[k].confidence)
    primary = winners[primary_code]
    supporting = [k for k in winners if k != primary_code]

    # Confluence boost: more agreeing strategies -> higher combined confidence,
    # capped at 97 to never claim certainty.
    confluence_bonus = min(15.0, 5.0 * len(supporting))
    combined_confidence = min(97.0, primary.confidence + confluence_bonus)

    reasons = [
        SignalReasonItem(
            "ai_primary_strategy",
            f"Primary strategy '{primary_code}' generated the signal with {primary.confidence:.1f}% confidence",
            1.0,
        )
    ]
    if supporting:
        reasons.append(
            SignalReasonItem(
                "ai_supporting_strategies",
                f"Supporting agreement from: {', '.join(supporting)}",
                0.5,
            )
        )
    reasons.extend(primary.reasons)

    return AiSelectorResult(
        direction=direction,
        confidence=combined_confidence,
        primary_strategy_code=primary_code,
        supporting_strategy_codes=supporting,
        reasons=reasons,
        per_strategy_results=per_strategy,
    )
