import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { SCAN_UNIVERSE, scanMarket } from "@/lib/mexc/scanner";
import type { SignalResult } from "@/lib/mexc/signalEngine";

// Scanning ~10 symbols with 4 MEXC calls each, in parallel, comfortably finishes well
// under Vercel's default function timeout, but this gives headroom on a cold start.
export const maxDuration = 60;

function toApiShape(s: SignalResult, now: string) {
  return {
    id: randomUUID(),
    symbol: s.symbol,
    direction: s.direction,
    status: "active" as const,
    trading_mode: s.tradingMode,
    timeframe: s.timeframe,
    entry_price: s.entryPrice,
    stop_loss: s.stopLoss,
    take_profit_1: s.takeProfit1,
    take_profit_2: s.takeProfit2,
    take_profit_3: s.takeProfit3,
    invalidation_level: s.invalidationLevel,
    risk_reward_ratio: s.riskRewardRatio,
    confidence_score: s.confidenceScore,
    score_breakdown: s.scoreBreakdown,
    reasons: s.reasons,
    market_structure_summary: s.marketStructureSummary,
    expected_scenario: s.expectedScenario,
    estimated_holding_time: s.estimatedHoldingTime,
    higher_timeframe_confirmed: s.higherTimeframeConfirmed,
    created_at: now,
    expires_at: null as string | null,
  };
}

export async function GET(req: NextRequest) {
  const mode = req.nextUrl.searchParams.get("mode") ?? "intraday";
  const symbolsParam = req.nextUrl.searchParams.get("symbols");
  const symbols = symbolsParam ? symbolsParam.split(",") : SCAN_UNIVERSE;

  const signals = await scanMarket(symbols, mode);
  const now = new Date().toISOString();
  const sorted = signals.sort((a, b) => b.confidenceScore - a.confidenceScore);

  return NextResponse.json(sorted.map((s) => toApiShape(s, now)));
}

export async function POST(req: NextRequest) {
  return GET(req);
}
