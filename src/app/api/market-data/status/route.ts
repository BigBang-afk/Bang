import { NextResponse, type NextRequest } from "next/server";

import { getDataSource, getMarketStatus } from "@/lib/market-data";
import { authorizeMarketDataRequest, marketDataErrorResponse } from "@/lib/market-data/route-helpers";
import type { MarketType } from "@/types/database";

const VALID_MARKET_TYPES: MarketType[] = ["crypto", "forex", "metals", "indices", "stocks"];

export async function GET(request: NextRequest) {
  const auth = await authorizeMarketDataRequest("status");
  if (auth instanceof NextResponse) return auth;

  const market = request.nextUrl.searchParams.get("market") as MarketType | null;
  if (!market || !VALID_MARKET_TYPES.includes(market)) {
    return NextResponse.json({ error: "Invalid market." }, { status: 400 });
  }

  try {
    const status = await getMarketStatus(market);
    return NextResponse.json({ status, source: getDataSource(market) });
  } catch (err) {
    return marketDataErrorResponse(err);
  }
}
