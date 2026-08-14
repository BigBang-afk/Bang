import { NextResponse, type NextRequest } from "next/server";

import { getDataSource, getOHLCV, TIMEFRAMES, type Timeframe } from "@/lib/market-data";
import {
  authorizeMarketDataRequest,
  marketDataErrorResponse,
  resolveAsset,
} from "@/lib/market-data/route-helpers";

export async function GET(request: NextRequest) {
  const auth = await authorizeMarketDataRequest("ohlcv");
  if (auth instanceof NextResponse) return auth;

  const symbol = request.nextUrl.searchParams.get("symbol");
  const timeframeParam = request.nextUrl.searchParams.get("timeframe") ?? "1h";
  const limitParam = request.nextUrl.searchParams.get("limit");

  if (!symbol) {
    return NextResponse.json({ error: "Missing symbol." }, { status: 400 });
  }
  if (!TIMEFRAMES.includes(timeframeParam as Timeframe)) {
    return NextResponse.json({ error: "Invalid timeframe." }, { status: 400 });
  }

  const asset = await resolveAsset(symbol);
  if (!asset) {
    return NextResponse.json({ error: "Unknown symbol." }, { status: 400 });
  }

  const limit = limitParam ? Number(limitParam) : undefined;

  try {
    const candles = await getOHLCV(
      asset.symbol,
      asset.market_type,
      timeframeParam as Timeframe,
      limit
    );
    return NextResponse.json({ candles, source: getDataSource(asset.market_type) });
  } catch (err) {
    return marketDataErrorResponse(err);
  }
}
