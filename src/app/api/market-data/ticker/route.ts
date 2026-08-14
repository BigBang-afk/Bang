import { NextResponse, type NextRequest } from "next/server";

import { getDataSource, getTicker } from "@/lib/market-data";
import {
  authorizeMarketDataRequest,
  marketDataErrorResponse,
  resolveAsset,
} from "@/lib/market-data/route-helpers";

export async function GET(request: NextRequest) {
  const auth = await authorizeMarketDataRequest("ticker");
  if (auth instanceof NextResponse) return auth;

  const symbol = request.nextUrl.searchParams.get("symbol");
  if (!symbol) {
    return NextResponse.json({ error: "Missing symbol." }, { status: 400 });
  }

  const asset = await resolveAsset(symbol);
  if (!asset) {
    return NextResponse.json({ error: "Unknown symbol." }, { status: 400 });
  }

  try {
    const ticker = await getTicker(asset.symbol, asset.market_type);
    return NextResponse.json({ ticker, source: getDataSource(asset.market_type) });
  } catch (err) {
    return marketDataErrorResponse(err);
  }
}
