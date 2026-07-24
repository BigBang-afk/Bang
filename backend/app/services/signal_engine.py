"""AI Signal Engine: combines trend, market structure, SMC, volume, order flow, momentum,
volatility, liquidity, higher-timeframe confirmation, and risk/reward into one weighted
confidence score (0-100). This is a deterministic, explainable scoring model, not a black box —
every point awarded is traceable to a concrete reason string, which is required by the product
spec ("never claim 100% win rate, always show reasons").
"""
from __future__ import annotations

from dataclasses import dataclass, field

import pandas as pd

from app.services import indicators, market_structure, order_flow

# Factor weights sum to 100. Tune here as the strategy is backtested.
WEIGHTS = {
    "trend": 15,
    "market_structure": 15,
    "smc": 15,
    "volume": 10,
    "order_flow": 10,
    "momentum": 10,
    "volatility": 5,
    "liquidity": 5,
    "higher_timeframe": 10,
    "risk_reward": 5,
}

MIN_CONFIDENCE_TO_NOTIFY = 70.0


@dataclass
class SignalResult:
    symbol: str
    direction: str  # long | short
    confidence_score: float
    score_breakdown: dict[str, float]
    timeframe: str = ""
    trading_mode: str = ""
    reasons: list[str] = field(default_factory=list)
    market_structure_summary: str = ""
    entry_price: float = 0.0
    stop_loss: float = 0.0
    take_profit_1: float = 0.0
    take_profit_2: float = 0.0
    take_profit_3: float = 0.0
    invalidation_level: float = 0.0
    risk_reward_ratio: float = 0.0
    expected_scenario: str = ""
    estimated_holding_time: str = ""
    higher_timeframe_confirmed: bool = False


def _score_trend(ind: dict) -> tuple[float, str]:
    if ind["short_term_trend"] == ind["long_term_trend"] and ind["short_term_trend"] != "ranging":
        return WEIGHTS["trend"], f"Short and long-term trend aligned ({ind['short_term_trend']})"
    if ind["short_term_trend"] != "ranging":
        return WEIGHTS["trend"] * 0.5, f"Short-term trend {ind['short_term_trend']}, long-term diverging"
    return 0.0, "No clear trend alignment"


def _score_structure(structure: dict, direction: str) -> tuple[float, str]:
    if structure["current_trend"] == direction:
        events = [e["event"] for e in structure["events"][-3:]]
        return WEIGHTS["market_structure"], f"Market structure confirms {direction} bias ({', '.join(events) or 'stable'})"
    return WEIGHTS["market_structure"] * 0.3, "Market structure not yet confirming direction"


def _score_smc(order_blocks: list[dict], fvgs: list[dict], zone: str, direction: str) -> tuple[float, str]:
    score = 0.0
    reasons = []
    relevant_ob = [b for b in order_blocks if (direction == "long" and "bullish" in b["type"]) or (direction == "short" and "bearish" in b["type"])]
    relevant_fvg = [g for g in fvgs if (direction == "long" and "bullish" in g["type"]) or (direction == "short" and "bearish" in g["type"])]

    if relevant_ob:
        score += WEIGHTS["smc"] * 0.5
        reasons.append(f"Price reacting from {relevant_ob[-1]['type']}")
    if relevant_fvg:
        score += WEIGHTS["smc"] * 0.3
        reasons.append(f"Unfilled {relevant_fvg[-1]['type']} nearby")
    if (direction == "long" and zone == "discount") or (direction == "short" and zone == "premium"):
        score += WEIGHTS["smc"] * 0.2
        reasons.append(f"Price in {zone} zone, favorable for {direction}")

    return min(score, WEIGHTS["smc"]), "; ".join(reasons) if reasons else "Limited SMC confluence"


def _score_volume(ind: dict) -> tuple[float, str]:
    rvol = ind["relative_volume"]
    if rvol >= 1.5:
        return WEIGHTS["volume"], f"Relative volume elevated ({rvol:.2f}x average)"
    if rvol >= 1.0:
        return WEIGHTS["volume"] * 0.5, f"Relative volume near average ({rvol:.2f}x)"
    return 0.0, f"Below-average volume ({rvol:.2f}x)"


def _score_order_flow(imbalance: dict, absorption: dict, direction: str) -> tuple[float, str]:
    score = 0.0
    reasons = []
    if (direction == "long" and imbalance["bias"] == "buyers") or (direction == "short" and imbalance["bias"] == "sellers"):
        score += WEIGHTS["order_flow"] * 0.6
        reasons.append(f"Order book imbalance favors {direction} ({imbalance['imbalance_pct']:.1f}%)")
    if absorption.get("absorption_detected") and absorption.get("side_absorbed"):
        score += WEIGHTS["order_flow"] * 0.4
        reasons.append(f"Absorption detected against {absorption['side_absorbed']}")
    return min(score, WEIGHTS["order_flow"]), "; ".join(reasons) if reasons else "No strong order flow confirmation"


def _score_momentum(ind: dict, direction: str) -> tuple[float, str]:
    rsi_val = ind["rsi"]
    macd_hist = ind["macd"]["histogram"]
    score = 0.0
    reasons = []

    if direction == "long" and 40 <= rsi_val <= 65 and macd_hist > 0:
        score += WEIGHTS["momentum"]
        reasons.append(f"RSI {rsi_val:.1f} with bullish MACD histogram")
    elif direction == "short" and 35 <= rsi_val <= 60 and macd_hist < 0:
        score += WEIGHTS["momentum"]
        reasons.append(f"RSI {rsi_val:.1f} with bearish MACD histogram")
    elif (direction == "long" and rsi_val < 30) or (direction == "short" and rsi_val > 70):
        score += WEIGHTS["momentum"] * 0.6
        reasons.append(f"RSI {rsi_val:.1f} showing potential exhaustion/reversal")
    else:
        reasons.append(f"Momentum (RSI {rsi_val:.1f}) not clearly aligned")

    return min(score, WEIGHTS["momentum"]), "; ".join(reasons)


def _score_volatility(ind: dict) -> tuple[float, str]:
    adx_val = ind["adx"]["adx"]
    if adx_val >= 25:
        return WEIGHTS["volatility"], f"ADX {adx_val:.1f} indicates a trending, tradable market"
    return WEIGHTS["volatility"] * 0.4, f"ADX {adx_val:.1f} indicates compression/low trend strength"


def _score_liquidity(pools: list[dict], direction: str, current_price: float) -> tuple[float, str]:
    if not pools:
        return 0.0, "No notable liquidity pools identified nearby"
    nearby = [p for p in pools if abs(p["level"] - current_price) / current_price < 0.02]
    if nearby:
        return WEIGHTS["liquidity"], f"{len(nearby)} liquidity pool(s) within reach, likely target/sweep zone"
    return WEIGHTS["liquidity"] * 0.3, "Liquidity pools present but distant"


def _score_higher_timeframe(htf_ind: dict, direction: str) -> tuple[float, str, bool]:
    aligned = htf_ind["long_term_trend"] == direction
    if aligned:
        return WEIGHTS["higher_timeframe"], "Higher timeframe trend confirms direction", True
    return 0.0, "Higher timeframe trend does NOT confirm — reduced confidence", False


def _score_risk_reward(rr: float) -> tuple[float, str]:
    if rr >= 3:
        return WEIGHTS["risk_reward"], f"Excellent risk/reward ratio ({rr:.2f}R)"
    if rr >= 2:
        return WEIGHTS["risk_reward"] * 0.7, f"Good risk/reward ratio ({rr:.2f}R)"
    if rr >= 1.5:
        return WEIGHTS["risk_reward"] * 0.4, f"Acceptable risk/reward ratio ({rr:.2f}R)"
    return 0.0, f"Poor risk/reward ratio ({rr:.2f}R) — signal weakened"


def generate_signal(
    symbol: str,
    direction: str,
    df: pd.DataFrame,
    htf_df: pd.DataFrame,
    order_book: dict,
    trades: list[dict],
    trading_mode: str,
    timeframe: str,
) -> SignalResult:
    """Run full multi-layer analysis on one symbol/timeframe and produce a scored signal.

    df: primary timeframe OHLCV candles (ascending time index)
    htf_df: higher timeframe OHLCV candles used for confirmation
    """
    ind = indicators.compute_all_indicators(df)
    htf_ind = indicators.compute_all_indicators(htf_df)

    swings = market_structure.find_swing_points(df)
    structure = market_structure.classify_structure(swings)
    order_blocks = market_structure.detect_order_blocks(df, swings)
    fvgs = market_structure.detect_fair_value_gaps(df)
    pools = market_structure.detect_liquidity_pools(swings)

    current_price = float(df["close"].iloc[-1])
    range_high, range_low = float(df["high"].max()), float(df["low"].min())
    zone = market_structure.premium_discount_zone(current_price, range_high, range_low)

    imbalance = order_flow.bid_ask_imbalance(order_book)
    absorption = order_flow.detect_absorption(trades)

    atr_val = float(ind["atr"])
    if direction == "long":
        stop_loss = current_price - atr_val * 1.5
        tp1, tp2, tp3 = current_price + atr_val * 1.5, current_price + atr_val * 3, current_price + atr_val * 5
    else:
        stop_loss = current_price + atr_val * 1.5
        tp1, tp2, tp3 = current_price - atr_val * 1.5, current_price - atr_val * 3, current_price - atr_val * 5

    risk_distance = abs(current_price - stop_loss) or 1e-9
    rr = abs(tp2 - current_price) / risk_distance

    breakdown: dict[str, float] = {}
    reasons: list[str] = []

    trend_score, trend_reason = _score_trend(ind)
    structure_score, structure_reason = _score_structure(structure, direction)
    smc_score, smc_reason = _score_smc(order_blocks, fvgs, zone, direction)
    volume_score, volume_reason = _score_volume(ind)
    flow_score, flow_reason = _score_order_flow(imbalance, absorption, direction)
    momentum_score, momentum_reason = _score_momentum(ind, direction)
    volatility_score, volatility_reason = _score_volatility(ind)
    liquidity_score, liquidity_reason = _score_liquidity(pools, direction, current_price)
    htf_score, htf_reason, htf_confirmed = _score_higher_timeframe(htf_ind, direction)
    rr_score, rr_reason = _score_risk_reward(rr)

    for key, score, reason in [
        ("trend", trend_score, trend_reason),
        ("market_structure", structure_score, structure_reason),
        ("smc", smc_score, smc_reason),
        ("volume", volume_score, volume_reason),
        ("order_flow", flow_score, flow_reason),
        ("momentum", momentum_score, momentum_reason),
        ("volatility", volatility_score, volatility_reason),
        ("liquidity", liquidity_score, liquidity_reason),
        ("higher_timeframe", htf_score, htf_reason),
        ("risk_reward", rr_score, rr_reason),
    ]:
        breakdown[key] = round(score, 2)
        reasons.append(reason)

    confidence = round(sum(breakdown.values()), 2)

    holding_time = {"scalping": "5-30 minutes", "intraday": "4-24 hours"}.get(trading_mode, "Variable")
    scenario = (
        f"Expecting price to move toward TP1 ({tp1:.4f}) then TP2 ({tp2:.4f}) if {direction} thesis holds; "
        f"invalidated on a close beyond {stop_loss:.4f}."
    )

    return SignalResult(
        symbol=symbol,
        direction=direction,
        confidence_score=confidence,
        score_breakdown=breakdown,
        timeframe=timeframe,
        trading_mode=trading_mode,
        reasons=reasons,
        market_structure_summary=f"Trend: {structure['current_trend']}, zone: {zone}, recent events: {[e['event'] for e in structure['events'][-3:]]}",
        entry_price=round(current_price, 8),
        stop_loss=round(stop_loss, 8),
        take_profit_1=round(tp1, 8),
        take_profit_2=round(tp2, 8),
        take_profit_3=round(tp3, 8),
        invalidation_level=round(stop_loss, 8),
        risk_reward_ratio=round(rr, 4),
        expected_scenario=scenario,
        estimated_holding_time=holding_time,
        higher_timeframe_confirmed=htf_confirmed,
    )


def should_notify(signal: SignalResult) -> bool:
    return signal.confidence_score >= MIN_CONFIDENCE_TO_NOTIFY
