"""Builds a complete tradeable signal (entry/SL/TP/RR/leverage/risk) from the
indicator engine output plus the transparent confidence score."""

from __future__ import annotations

from app.signals.confidence import score_direction

TIMEFRAME_HOLD_MINUTES = {
    "1m": 15,
    "3m": 30,
    "5m": 60,
    "15m": 180,
    "30m": 360,
    "1h": 720,
    "4h": 2880,
    "1d": 10080,
    "1w": 43200,
}

MIN_CONFIDENCE_TO_EMIT = 55.0
MIN_RR_TO_EMIT = 1.5


def _candidate_direction(analysis: dict) -> str | None:
    trend_dir = analysis["trend"]["direction"]
    st_dir = analysis["supertrend"]["direction"]
    bos = analysis["structure"]["bos_choch"]["event"] or ""
    votes_bull = sum([trend_dir == "bullish", st_dir == "bullish", "bullish" in bos])
    votes_bear = sum([trend_dir == "bearish", st_dir == "bearish", "bearish" in bos])
    if votes_bull >= 2 and votes_bull > votes_bear:
        return "BUY"
    if votes_bear >= 2 and votes_bear > votes_bull:
        return "SELL"
    return None


def generate_signal(symbol: str, timeframe: str, analysis: dict, htf_analysis: dict | None = None) -> dict | None:
    direction = _candidate_direction(analysis)
    if direction is None:
        return None

    scored = score_direction(analysis, htf_analysis, direction)
    if scored["score"] < MIN_CONFIDENCE_TO_EMIT:
        return None

    price = analysis["price"]
    atr_val = analysis["volatility"]["atr"] or price * 0.01
    support = analysis["structure"]["support_resistance"]["support"]
    resistance = analysis["structure"]["support_resistance"]["resistance"]

    if direction == "BUY":
        entry_low, entry_high = price - atr_val * 0.15, price + atr_val * 0.1
        structural_sl = max([s for s in support if s < price], default=price - atr_val * 1.5)
        stop_loss = min(structural_sl - atr_val * 0.25, price - atr_val * 1.0)
        risk = price - stop_loss
        tp_targets_from_structure = sorted([r for r in resistance if r > price])
        tp1 = tp_targets_from_structure[0] if tp_targets_from_structure else price + risk * 1.5
        tp2 = tp_targets_from_structure[1] if len(tp_targets_from_structure) > 1 else price + risk * 2.5
        tp3 = tp_targets_from_structure[2] if len(tp_targets_from_structure) > 2 else price + risk * 4
    else:
        entry_low, entry_high = price - atr_val * 0.1, price + atr_val * 0.15
        structural_sl = min([r for r in resistance if r > price], default=price + atr_val * 1.5)
        stop_loss = max(structural_sl + atr_val * 0.25, price + atr_val * 1.0)
        risk = stop_loss - price
        tp_targets_from_structure = sorted([s for s in support if s < price], reverse=True)
        tp1 = tp_targets_from_structure[0] if tp_targets_from_structure else price - risk * 1.5
        tp2 = tp_targets_from_structure[1] if len(tp_targets_from_structure) > 1 else price - risk * 2.5
        tp3 = tp_targets_from_structure[2] if len(tp_targets_from_structure) > 2 else price - risk * 4

    reward = abs(tp1 - price)
    rr = round(reward / risk, 2) if risk > 0 else 0
    if rr < MIN_RR_TO_EMIT:
        return None

    confidence = scored["score"]
    volatility_regime = analysis["volatility"]["regime"]["regime"]
    leverage_min, leverage_max = _suggest_leverage(confidence, volatility_regime)
    risk_percent = _suggest_risk_percent(confidence)

    return {
        "symbol": symbol,
        "timeframe": timeframe,
        "direction": direction,
        "entry_low": round(min(entry_low, entry_high), 8),
        "entry_high": round(max(entry_low, entry_high), 8),
        "stop_loss": round(stop_loss, 8),
        "take_profit_1": round(tp1, 8),
        "take_profit_2": round(tp2, 8),
        "take_profit_3": round(tp3, 8),
        "risk_reward_ratio": rr,
        "confidence_score": confidence,
        "confidence_breakdown": scored["breakdown"],
        "reasons": scored["reasons"],
        "expected_holding_minutes": TIMEFRAME_HOLD_MINUTES.get(timeframe, 180),
        "suggested_leverage_min": leverage_min,
        "suggested_leverage_max": leverage_max,
        "suggested_risk_percent": risk_percent,
        "mtf_confluence": {
            "higher_timeframe_direction": htf_analysis["trend"]["direction"] if htf_analysis else None
        },
    }


def _suggest_leverage(confidence: float, volatility_regime: str) -> tuple[float, float]:
    base_min, base_max = 1.0, 3.0
    if confidence >= 80:
        base_max = 5.0
    if confidence >= 90:
        base_max = 7.0
    if volatility_regime == "high":
        base_max = max(base_min, base_max * 0.6)
    return round(base_min, 1), round(base_max, 1)


def _suggest_risk_percent(confidence: float) -> float:
    if confidence >= 85:
        return 2.0
    if confidence >= 70:
        return 1.5
    return 1.0
