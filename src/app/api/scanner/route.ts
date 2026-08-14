import { NextResponse, type NextRequest } from "next/server";

import { checkDailyUsageLimit, recordUsage } from "@/lib/entitlements";
import { authorizeMarketDataRequest, marketDataErrorResponse } from "@/lib/market-data/route-helpers";
import { TIMEFRAMES, type Timeframe } from "@/lib/market-data/types";
import { runScan, type EmaCondition, type ScannerFilters } from "@/lib/technical-analysis/scanner";
import type { Trend, Volatility, VolumeState } from "@/lib/technical-analysis/scoring";
import type { MarketType } from "@/types/database";

const MARKET_TYPES: MarketType[] = ["crypto", "forex", "metals", "indices", "stocks"];
const TRENDS: Trend[] = ["bullish", "bearish", "neutral"];
const VOLATILITIES: Volatility[] = ["low", "normal", "high"];
const VOLUME_STATES: VolumeState[] = ["above_average", "average", "below_average", "unknown"];
const EMA_CONDITIONS: EmaCondition[] = [
  "price_above_fast",
  "price_below_fast",
  "price_above_slow",
  "price_below_slow",
  "fast_above_slow",
  "fast_below_slow",
];

function enumParam<T extends string>(
  searchParams: URLSearchParams,
  key: string,
  allowed: T[]
): T | undefined {
  const value = searchParams.get(key);
  if (!value) return undefined;
  return allowed.includes(value as T) ? (value as T) : undefined;
}

export async function GET(request: NextRequest) {
  const auth = await authorizeMarketDataRequest("scanner");
  if (auth instanceof NextResponse) return auth;

  const usage = await checkDailyUsageLimit(auth.userId, "scanner_requests_per_day");
  if (!usage.allowed) {
    return NextResponse.json(
      {
        error: `Daily scanner limit reached (${usage.limit}). Upgrade your plan for more scans.`,
        code: "limit_reached",
      },
      { status: 429 }
    );
  }

  const params = request.nextUrl.searchParams;
  const marketType = enumParam(params, "market", MARKET_TYPES);
  const timeframe = enumParam(params, "timeframe", TIMEFRAMES as unknown as Timeframe[]);
  if (!marketType || !timeframe) {
    return NextResponse.json({ error: "market and timeframe are required." }, { status: 400 });
  }

  const filters: ScannerFilters = {
    marketType,
    timeframe,
    symbolQuery: params.get("symbol")?.trim() || undefined,
    trend: enumParam(params, "trend", TRENDS),
    volatility: enumParam(params, "volatility", VOLATILITIES),
    momentum: enumParam(params, "momentum", TRENDS),
    volumeState: enumParam(params, "volumeState", VOLUME_STATES),
    emaCondition: enumParam(params, "emaCondition", EMA_CONDITIONS),
  };

  const rsiMin = params.get("rsiMin");
  const rsiMax = params.get("rsiMax");
  if (rsiMin !== null && rsiMin !== "") filters.rsiMin = Number(rsiMin);
  if (rsiMax !== null && rsiMax !== "") filters.rsiMax = Number(rsiMax);

  try {
    const result = await runScan(filters);
    await recordUsage(auth.userId, "scanner_run", 1, {
      market: marketType,
      timeframe,
      resultCount: result.items.length,
    });
    return NextResponse.json({
      ...result,
      usage: { used: usage.used + 1, limit: usage.limit },
    });
  } catch (err) {
    return marketDataErrorResponse(err);
  }
}
