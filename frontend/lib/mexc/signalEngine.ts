// Ported from backend/app/services/signal_engine.py. Same weighted-factor scoring model,
// same reasons-per-factor requirement — see that file for the authoritative version and
// rationale ("never claim 100% win rate, always show reasons").

import type { Candle, IndicatorSnapshot } from "./indicators";
import { computeAllIndicators } from "./indicators";
import {
  classifyStructure,
  detectFairValueGaps,
  detectLiquidityPools,
  detectOrderBlocks,
  findSwingPoints,
  premiumDiscountZone,
  type StructureResult,
} from "./marketStructure";
import { bidAskImbalance, detectAbsorption, type OrderBook, type TradePrint } from "./orderFlow";

const WEIGHTS = {
  trend: 15,
  marketStructure: 15,
  smc: 15,
  volume: 10,
  orderFlow: 10,
  momentum: 10,
  volatility: 5,
  liquidity: 5,
  higherTimeframe: 10,
  riskReward: 5,
};

export const MIN_CONFIDENCE_TO_NOTIFY = 70;

export type Direction = "long" | "short";

export interface SignalResult {
  symbol: string;
  direction: Direction;
  confidenceScore: number;
  scoreBreakdown: Record<string, number>;
  timeframe: string;
  tradingMode: string;
  reasons: string[];
  marketStructureSummary: string;
  entryPrice: number;
  stopLoss: number;
  takeProfit1: number;
  takeProfit2: number;
  takeProfit3: number;
  invalidationLevel: number;
  riskRewardRatio: number;
  expectedScenario: string;
  estimatedHoldingTime: string;
  higherTimeframeConfirmed: boolean;
}

function scoreTrend(ind: IndicatorSnapshot): [number, string] {
  if (ind.shortTermTrend === ind.longTermTrend && ind.shortTermTrend !== "ranging") {
    return [WEIGHTS.trend, `Short and long-term trend aligned (${ind.shortTermTrend})`];
  }
  if (ind.shortTermTrend !== "ranging") {
    return [WEIGHTS.trend * 0.5, `Short-term trend ${ind.shortTermTrend}, long-term diverging`];
  }
  return [0, "No clear trend alignment"];
}

const DIRECTION_TO_TREND: Record<Direction, "bullish" | "bearish"> = { long: "bullish", short: "bearish" };

function scoreStructure(structure: StructureResult, direction: Direction): [number, string] {
  if (structure.currentTrend === DIRECTION_TO_TREND[direction]) {
    const events = structure.events.slice(-3).map((e) => e.event);
    return [WEIGHTS.marketStructure, `Market structure confirms ${direction} bias (${events.join(", ") || "stable"})`];
  }
  return [WEIGHTS.marketStructure * 0.3, "Market structure not yet confirming direction"];
}

function scoreSmc(
  orderBlocks: ReturnType<typeof detectOrderBlocks>,
  fvgs: ReturnType<typeof detectFairValueGaps>,
  zone: string,
  direction: Direction
): [number, string] {
  let score = 0;
  const reasons: string[] = [];
  const relevantOb = orderBlocks.filter((b) => (direction === "long" ? b.type.includes("bullish") : b.type.includes("bearish")));
  const relevantFvg = fvgs.filter((g) => (direction === "long" ? g.type.includes("bullish") : g.type.includes("bearish")));

  if (relevantOb.length) {
    score += WEIGHTS.smc * 0.5;
    reasons.push(`Price reacting from ${relevantOb[relevantOb.length - 1].type}`);
  }
  if (relevantFvg.length) {
    score += WEIGHTS.smc * 0.3;
    reasons.push(`Unfilled ${relevantFvg[relevantFvg.length - 1].type} nearby`);
  }
  if ((direction === "long" && zone === "discount") || (direction === "short" && zone === "premium")) {
    score += WEIGHTS.smc * 0.2;
    reasons.push(`Price in ${zone} zone, favorable for ${direction}`);
  }

  return [Math.min(score, WEIGHTS.smc), reasons.join("; ") || "Limited SMC confluence"];
}

function scoreVolume(ind: IndicatorSnapshot): [number, string] {
  const rvol = ind.relativeVolume;
  if (rvol >= 1.5) return [WEIGHTS.volume, `Relative volume elevated (${rvol.toFixed(2)}x average)`];
  if (rvol >= 1.0) return [WEIGHTS.volume * 0.5, `Relative volume near average (${rvol.toFixed(2)}x)`];
  return [0, `Below-average volume (${rvol.toFixed(2)}x)`];
}

function scoreOrderFlow(
  imbalance: ReturnType<typeof bidAskImbalance>,
  absorption: ReturnType<typeof detectAbsorption>,
  direction: Direction
): [number, string] {
  let score = 0;
  const reasons: string[] = [];
  if ((direction === "long" && imbalance.bias === "buyers") || (direction === "short" && imbalance.bias === "sellers")) {
    score += WEIGHTS.orderFlow * 0.6;
    reasons.push(`Order book imbalance favors ${direction} (${imbalance.imbalancePct.toFixed(1)}%)`);
  }
  if (absorption.absorptionDetected && absorption.sideAbsorbed) {
    score += WEIGHTS.orderFlow * 0.4;
    reasons.push(`Absorption detected against ${absorption.sideAbsorbed}`);
  }
  return [Math.min(score, WEIGHTS.orderFlow), reasons.join("; ") || "No strong order flow confirmation"];
}

function scoreMomentum(ind: IndicatorSnapshot, direction: Direction): [number, string] {
  const rsiVal = ind.rsi;
  const macdHist = ind.macd.histogram;
  let score = 0;
  const reasons: string[] = [];

  if (direction === "long" && rsiVal >= 40 && rsiVal <= 65 && macdHist > 0) {
    score += WEIGHTS.momentum;
    reasons.push(`RSI ${rsiVal.toFixed(1)} with bullish MACD histogram`);
  } else if (direction === "short" && rsiVal >= 35 && rsiVal <= 60 && macdHist < 0) {
    score += WEIGHTS.momentum;
    reasons.push(`RSI ${rsiVal.toFixed(1)} with bearish MACD histogram`);
  } else if ((direction === "long" && rsiVal < 30) || (direction === "short" && rsiVal > 70)) {
    score += WEIGHTS.momentum * 0.6;
    reasons.push(`RSI ${rsiVal.toFixed(1)} showing potential exhaustion/reversal`);
  } else {
    reasons.push(`Momentum (RSI ${rsiVal.toFixed(1)}) not clearly aligned`);
  }

  return [Math.min(score, WEIGHTS.momentum), reasons.join("; ")];
}

function scoreVolatility(ind: IndicatorSnapshot): [number, string] {
  const adxVal = ind.adx.adx;
  if (adxVal >= 25) return [WEIGHTS.volatility, `ADX ${adxVal.toFixed(1)} indicates a trending, tradable market`];
  return [WEIGHTS.volatility * 0.4, `ADX ${adxVal.toFixed(1)} indicates compression/low trend strength`];
}

function scoreLiquidity(pools: ReturnType<typeof detectLiquidityPools>, currentPrice: number): [number, string] {
  if (!pools.length) return [0, "No notable liquidity pools identified nearby"];
  const nearby = pools.filter((p) => Math.abs(p.level - currentPrice) / currentPrice < 0.02);
  if (nearby.length) return [WEIGHTS.liquidity, `${nearby.length} liquidity pool(s) within reach, likely target/sweep zone`];
  return [WEIGHTS.liquidity * 0.3, "Liquidity pools present but distant"];
}

function scoreHigherTimeframe(htfInd: IndicatorSnapshot, direction: Direction): [number, string, boolean] {
  const aligned = htfInd.longTermTrend === DIRECTION_TO_TREND[direction];
  if (aligned) return [WEIGHTS.higherTimeframe, "Higher timeframe trend confirms direction", true];
  return [0, "Higher timeframe trend does NOT confirm — reduced confidence", false];
}

function scoreRiskReward(rr: number): [number, string] {
  if (rr >= 3) return [WEIGHTS.riskReward, `Excellent risk/reward ratio (${rr.toFixed(2)}R)`];
  if (rr >= 2) return [WEIGHTS.riskReward * 0.7, `Good risk/reward ratio (${rr.toFixed(2)}R)`];
  if (rr >= 1.5) return [WEIGHTS.riskReward * 0.4, `Acceptable risk/reward ratio (${rr.toFixed(2)}R)`];
  return [0, `Poor risk/reward ratio (${rr.toFixed(2)}R) — signal weakened`];
}

export function generateSignal(
  symbol: string,
  direction: Direction,
  candles: Candle[],
  htfCandles: Candle[],
  orderBook: OrderBook,
  trades: TradePrint[],
  tradingMode: string,
  timeframe: string
): SignalResult {
  const ind = computeAllIndicators(candles);
  const htfInd = computeAllIndicators(htfCandles);

  const swings = findSwingPoints(candles);
  const structure = classifyStructure(swings);
  const orderBlocks = detectOrderBlocks(candles, swings);
  const fvgs = detectFairValueGaps(candles);
  const pools = detectLiquidityPools(swings);

  const currentPrice = candles[candles.length - 1].close;
  const rangeHigh = Math.max(...candles.map((c) => c.high));
  const rangeLow = Math.min(...candles.map((c) => c.low));
  const zone = premiumDiscountZone(currentPrice, rangeHigh, rangeLow);

  const imbalance = bidAskImbalance(orderBook);
  const absorption = detectAbsorption(trades);

  const atrVal = ind.atr;
  let stopLoss: number, tp1: number, tp2: number, tp3: number;
  if (direction === "long") {
    stopLoss = currentPrice - atrVal * 1.5;
    tp1 = currentPrice + atrVal * 1.5;
    tp2 = currentPrice + atrVal * 3;
    tp3 = currentPrice + atrVal * 5;
  } else {
    stopLoss = currentPrice + atrVal * 1.5;
    tp1 = currentPrice - atrVal * 1.5;
    tp2 = currentPrice - atrVal * 3;
    tp3 = currentPrice - atrVal * 5;
  }

  const riskDistance = Math.abs(currentPrice - stopLoss) || 1e-9;
  const rr = Math.abs(tp2 - currentPrice) / riskDistance;

  const breakdown: Record<string, number> = {};
  const reasons: string[] = [];

  const entries: [string, [number, string] | [number, string, boolean]][] = [
    ["trend", scoreTrend(ind)],
    ["market_structure", scoreStructure(structure, direction)],
    ["smc", scoreSmc(orderBlocks, fvgs, zone, direction)],
    ["volume", scoreVolume(ind)],
    ["order_flow", scoreOrderFlow(imbalance, absorption, direction)],
    ["momentum", scoreMomentum(ind, direction)],
    ["volatility", scoreVolatility(ind)],
    ["liquidity", scoreLiquidity(pools, currentPrice)],
    ["higher_timeframe", scoreHigherTimeframe(htfInd, direction)],
    ["risk_reward", scoreRiskReward(rr)],
  ];

  let higherTimeframeConfirmed = false;
  for (const [key, result] of entries) {
    const [score, reason] = result;
    breakdown[key] = Math.round(score * 100) / 100;
    reasons.push(reason);
    if (key === "higher_timeframe") higherTimeframeConfirmed = result[2] as boolean;
  }

  const confidence = Math.round(Object.values(breakdown).reduce((a, b) => a + b, 0) * 100) / 100;
  const holdingTime = tradingMode === "scalping" ? "5-30 minutes" : "4-24 hours";
  const scenario = `Expecting price to move toward TP1 (${tp1.toFixed(4)}) then TP2 (${tp2.toFixed(4)}) if ${direction} thesis holds; invalidated on a close beyond ${stopLoss.toFixed(4)}.`;

  return {
    symbol,
    direction,
    confidenceScore: confidence,
    scoreBreakdown: breakdown,
    timeframe,
    tradingMode,
    reasons,
    marketStructureSummary: `Trend: ${structure.currentTrend}, zone: ${zone}, recent events: [${structure.events.slice(-3).map((e) => e.event).join(", ")}]`,
    entryPrice: currentPrice,
    stopLoss,
    takeProfit1: tp1,
    takeProfit2: tp2,
    takeProfit3: tp3,
    invalidationLevel: stopLoss,
    riskRewardRatio: rr,
    expectedScenario: scenario,
    estimatedHoldingTime: holdingTime,
    higherTimeframeConfirmed,
  };
}

export function shouldNotify(signal: SignalResult): boolean {
  return signal.confidenceScore >= MIN_CONFIDENCE_TO_NOTIFY;
}
