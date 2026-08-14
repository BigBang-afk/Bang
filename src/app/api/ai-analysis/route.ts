import { NextResponse, type NextRequest } from "next/server";

import { runAnalysis } from "@/lib/ai/analyze";
import { AI_ANALYSIS_ERROR_STATUS, AIAnalysisError } from "@/lib/ai/schema";
import { checkDailyUsageLimit, recordUsage } from "@/lib/entitlements";
import { authorizeMarketDataRequest, resolveAsset } from "@/lib/market-data/route-helpers";
import { TIMEFRAMES, type Timeframe } from "@/lib/market-data/types";

/**
 * Every AI analysis request goes through this route: auth + per-user rate
 * limit (authorizeMarketDataRequest, shared with the market-data routes),
 * then the daily ai_analyses_per_day entitlement gate — the same
 * cost-control pattern the Phase 5 scanner route uses for
 * scanner_requests_per_day — before ever reaching runAnalysis(), which is
 * where the actual (cached-when-possible) Claude call happens.
 */
export async function POST(request: NextRequest) {
  const auth = await authorizeMarketDataRequest("ai-analysis");
  if (auth instanceof NextResponse) return auth;

  const usage = await checkDailyUsageLimit(auth.userId, "ai_analyses_per_day");
  if (!usage.allowed) {
    return NextResponse.json(
      {
        error: `Daily AI analysis limit reached (${usage.limit}). Upgrade your plan for more.`,
        code: "limit_reached",
      },
      { status: 429 }
    );
  }

  let body: { symbol?: unknown; timeframe?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const symbol = typeof body.symbol === "string" ? body.symbol.trim() : "";
  const timeframe = body.timeframe;
  if (!symbol || typeof timeframe !== "string" || !TIMEFRAMES.includes(timeframe as Timeframe)) {
    return NextResponse.json(
      { error: "A symbol and a valid timeframe are required." },
      { status: 400 }
    );
  }

  const asset = await resolveAsset(symbol);
  if (!asset) {
    return NextResponse.json(
      { error: `Unknown symbol: ${symbol}.`, code: "unsupported_market" },
      { status: 404 }
    );
  }

  try {
    const result = await runAnalysis({
      userId: auth.userId,
      asset,
      timeframe: timeframe as Timeframe,
    });
    await recordUsage(auth.userId, "ai_analysis", 1, {
      symbol: asset.symbol,
      timeframe,
      cached: result.cached,
    });

    return NextResponse.json({
      analysisId: result.analysisId,
      symbol: asset.symbol,
      displayName: asset.display_name,
      timeframe,
      snapshot: result.snapshot,
      analysis: result.output,
      model: result.model,
      tokensUsed: result.tokensUsed,
      latencyMs: result.latencyMs,
      cached: result.cached,
      createdAt: result.createdAt,
      usage: { used: usage.used + 1, limit: usage.limit },
    });
  } catch (err) {
    if (err instanceof AIAnalysisError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: AI_ANALYSIS_ERROR_STATUS[err.code] }
      );
    }
    console.error("[api/ai-analysis] unexpected error", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
