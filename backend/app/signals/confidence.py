"""Transparent, weighted confidence scoring.

The score is a sum of independently-evaluated factors, each contributing a
capped number of points toward a 0-100 total. Every contributing factor is
returned in the breakdown so the UI / AI assistant can explain *why* a score
is what it is -- we never claim certainty, only show the weighted evidence.
"""

from __future__ import annotations

FACTOR_WEIGHTS = {
    "trend_alignment": 15,
    "multi_timeframe_agreement": 15,
    "market_structure": 15,
    "momentum": 12,
    "volume_confirmation": 12,
    "order_flow": 10,
    "volatility_favorable": 8,
    "pattern_quality": 7,
    "liquidity": 6,
}


def score_direction(analysis: dict, htf_analysis: dict | None, direction: str) -> dict:
    breakdown: dict[str, float] = {}
    reasons: list[str] = []

    trend = analysis["trend"]
    is_bull = direction == "BUY"

    # 1. Trend alignment (EMA stack + supertrend)
    trend_dir_match = (trend["direction"] == "bullish") if is_bull else (trend["direction"] == "bearish")
    st_match = (analysis["supertrend"]["direction"] == "bullish") if is_bull else (analysis["supertrend"]["direction"] == "bearish")
    pts = 0
    if trend_dir_match:
        pts += FACTOR_WEIGHTS["trend_alignment"] * 0.6
        reasons.append(f"EMA stack aligned {trend['direction']}")
    if st_match:
        pts += FACTOR_WEIGHTS["trend_alignment"] * 0.4
        reasons.append(f"Supertrend confirms {analysis['supertrend']['direction']} bias")
    breakdown["trend_alignment"] = round(pts, 1)

    # 2. Multi-timeframe agreement
    pts = 0
    if htf_analysis is not None:
        htf_bull = htf_analysis["trend"]["direction"] == "bullish"
        htf_bear = htf_analysis["trend"]["direction"] == "bearish"
        if (is_bull and htf_bull) or (not is_bull and htf_bear):
            pts = FACTOR_WEIGHTS["multi_timeframe_agreement"]
            reasons.append("Higher timeframe trend agrees with signal direction")
    breakdown["multi_timeframe_agreement"] = round(pts, 1)

    # 3. Market structure (BOS/CHoCH, premium/discount, FVG)
    pts = 0
    bos = analysis["structure"]["bos_choch"]["event"]
    if bos and (("bullish" in bos) == is_bull):
        pts += FACTOR_WEIGHTS["market_structure"] * 0.5
        reasons.append(f"Recent {bos.replace('_', ' ')} supports {direction}")
    zone = analysis["structure"]["premium_discount"]["zone"]
    if (zone == "discount" and is_bull) or (zone == "premium" and not is_bull):
        pts += FACTOR_WEIGHTS["market_structure"] * 0.3
        reasons.append(f"Price trading at a {zone} relative to recent range")
    fvgs = analysis["structure"]["fair_value_gaps"]
    matching_fvg = [g for g in fvgs if (g["type"] == "bullish") == is_bull]
    if matching_fvg:
        pts += FACTOR_WEIGHTS["market_structure"] * 0.2
        reasons.append("Unfilled fair value gap in signal direction")
    breakdown["market_structure"] = round(pts, 1)

    # 4. Momentum (RSI + MACD)
    pts = 0
    mom = analysis["momentum"]
    if is_bull and mom["macd_histogram"] and mom["macd_rising"]:
        pts += FACTOR_WEIGHTS["momentum"] * 0.5
        reasons.append("MACD histogram rising")
    if not is_bull and mom["macd_histogram"] is not None and not mom["macd_rising"]:
        pts += FACTOR_WEIGHTS["momentum"] * 0.5
        reasons.append("MACD histogram falling")
    if is_bull and mom["rsi"] and 40 <= mom["rsi"] <= 65:
        pts += FACTOR_WEIGHTS["momentum"] * 0.5
        reasons.append(f"RSI at {mom['rsi']} shows healthy bullish momentum (not overbought)")
    if not is_bull and mom["rsi"] and 35 <= mom["rsi"] <= 60:
        pts += FACTOR_WEIGHTS["momentum"] * 0.5
        reasons.append(f"RSI at {mom['rsi']} shows healthy bearish momentum (not oversold)")
    breakdown["momentum"] = round(pts, 1)

    # 5. Volume confirmation
    pts = 0
    vol = analysis["volume"]
    if vol.get("current_volume_vs_avg") and vol["current_volume_vs_avg"] >= 1.3:
        pts += FACTOR_WEIGHTS["volume_confirmation"] * 0.5
        reasons.append(f"Volume {vol['current_volume_vs_avg']}x the 20-period average")
    if vol.get("price_above_vwap") == is_bull:
        pts += FACTOR_WEIGHTS["volume_confirmation"] * 0.5
        reasons.append(f"Price {'above' if is_bull else 'below'} VWAP")
    breakdown["volume_confirmation"] = round(pts, 1)

    # 6. Order flow (CVD direction)
    pts = 0
    if vol.get("cvd_rising") is not None:
        if vol["cvd_rising"] == is_bull:
            pts = FACTOR_WEIGHTS["order_flow"]
            reasons.append(f"Cumulative volume delta {'rising' if is_bull else 'falling'}, confirming order flow")
    breakdown["order_flow"] = round(pts, 1)

    # 7. Volatility favorable (not extremely low / choppy, not a blow-off)
    pts = 0
    vola = analysis["volatility"]
    if vola["regime"]["regime"] in ("normal", "high") and not vola.get("squeeze"):
        pts = FACTOR_WEIGHTS["volatility_favorable"]
        reasons.append(f"Volatility regime is {vola['regime']['regime']} with room to expand")
    breakdown["volatility_favorable"] = round(pts, 1)

    # 8. Pattern quality
    pts = 0
    bullish_patterns = {"hammer", "bullish_engulfing", "morning_star", "three_white_soldiers"}
    bearish_patterns = {"shooting_star", "bearish_engulfing", "evening_star", "three_black_crows"}
    detected = set(analysis["patterns"])
    if is_bull and detected & bullish_patterns:
        pts = FACTOR_WEIGHTS["pattern_quality"]
        reasons.append(f"Bullish candlestick pattern detected: {', '.join(detected & bullish_patterns)}")
    if not is_bull and detected & bearish_patterns:
        pts = FACTOR_WEIGHTS["pattern_quality"]
        reasons.append(f"Bearish candlestick pattern detected: {', '.join(detected & bearish_patterns)}")
    breakdown["pattern_quality"] = round(pts, 1)

    # 9. Liquidity (equal highs/lows as draw-on-liquidity targets)
    pts = 0
    eq = analysis["structure"]["equal_highs_lows"]
    if is_bull and eq["equal_highs"]:
        pts = FACTOR_WEIGHTS["liquidity"]
        reasons.append("Equal highs above provide a liquidity draw target")
    if not is_bull and eq["equal_lows"]:
        pts = FACTOR_WEIGHTS["liquidity"]
        reasons.append("Equal lows below provide a liquidity draw target")
    breakdown["liquidity"] = round(pts, 1)

    total = round(sum(breakdown.values()), 1)
    return {"score": min(total, 100.0), "breakdown": breakdown, "reasons": reasons}
