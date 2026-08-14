import "server-only";

import type { MarketType } from "@/types/database";
import { getProviderForMarket, isMarketSupported } from "@/lib/market-data/registry";
import {
  MarketDataError,
  type MarketStatus,
  type OHLCVCandle,
  type OrderBook,
  type Ticker,
  type Timeframe,
} from "@/lib/market-data/types";

export { MarketDataError, isMarketSupported };
export type { MarketDataErrorCode } from "@/lib/market-data/types";
export { TIMEFRAMES, type Timeframe } from "@/lib/market-data/types";

function requireProvider(symbol: string, marketType: MarketType) {
  const provider = getProviderForMarket(marketType);
  if (!provider || !provider.supportsSymbol(symbol, marketType)) {
    throw new MarketDataError(
      "unsupported_market",
      provider?.id ?? "none",
      `No connected data source covers ${symbol} (${marketType}) yet.`
    );
  }
  return provider;
}

export interface DataSourceInfo {
  providerId: string;
  providerName: string;
  latency: "realtime" | "delayed";
}

export function getDataSource(marketType: MarketType): DataSourceInfo | null {
  const provider = getProviderForMarket(marketType);
  if (!provider) return null;
  return { providerId: provider.id, providerName: provider.name, latency: provider.capabilities.latency };
}

export async function getTicker(symbol: string, marketType: MarketType): Promise<Ticker> {
  const provider = requireProvider(symbol, marketType);
  return provider.getTicker(symbol);
}

export async function getOHLCV(
  symbol: string,
  marketType: MarketType,
  timeframe: Timeframe,
  limit?: number
): Promise<OHLCVCandle[]> {
  const provider = requireProvider(symbol, marketType);
  if (!provider.capabilities.timeframes.includes(timeframe)) {
    throw new MarketDataError(
      "unsupported_market",
      provider.id,
      `${provider.name} doesn't support the ${timeframe} timeframe.`
    );
  }
  return provider.getOHLCV(symbol, timeframe, limit);
}

export async function getOrderBook(symbol: string, marketType: MarketType): Promise<OrderBook> {
  const provider = requireProvider(symbol, marketType);
  if (!provider.getOrderBook) {
    throw new MarketDataError(
      "unsupported_market",
      provider.id,
      `${provider.name} doesn't expose order book depth.`
    );
  }
  return provider.getOrderBook(symbol);
}

export async function getMarketStatus(marketType: MarketType): Promise<MarketStatus> {
  const provider = getProviderForMarket(marketType);
  if (!provider) return { state: "unknown", note: "No data source connected." };
  return provider.getMarketStatus(marketType);
}
