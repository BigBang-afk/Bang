import "server-only";

import type { MarketType } from "@/types/database";
import { binanceProvider } from "@/lib/market-data/providers/binance";
import { SUPPORTED_MARKET_TYPES } from "@/lib/market-data/supported-markets";
import type { MarketDataProvider } from "@/lib/market-data/types";

/**
 * Maps each market type to the provider currently serving it. This is the
 * ONLY place that wires a concrete provider implementation into the app —
 * pages/routes call the functions in lib/market-data/index.ts, never a
 * provider module directly, so swapping Binance for another crypto
 * provider (or adding one for forex/metals/indices) is a one-line change
 * here.
 *
 * Markets not present as a key are honestly unsupported right now, not
 * silently wrong — see lib/market-data/index.ts, which turns a missing
 * entry into an `unsupported_market` MarketDataError rather than
 * fabricating data.
 */
export const PROVIDER_REGISTRY: Partial<Record<MarketType, MarketDataProvider>> = {
  crypto: binanceProvider,

  // Not connected yet — no free, key-less provider offers real intraday
  // OHLCV for these. Wiring one in only requires:
  //   1. an implementation of MarketDataProvider in providers/<name>.ts
  //   2. its API key added server-side (see .env.example)
  //   3. the market_type -> provider mapping added below
  // forex: undefined,
  // metals: undefined,
  // indices: undefined,
  // stocks: undefined,
};

export function getProviderForMarket(marketType: MarketType): MarketDataProvider | null {
  return PROVIDER_REGISTRY[marketType] ?? null;
}

export function isMarketSupported(marketType: MarketType): boolean {
  return marketType in PROVIDER_REGISTRY;
}

// Sanity check, at module-load time, that the registry and the client-safe
// SUPPORTED_MARKET_TYPES list (lib/market-data/supported-markets.ts) never
// drift apart — update both together when adding a provider.
if (
  SUPPORTED_MARKET_TYPES.length !== Object.keys(PROVIDER_REGISTRY).length ||
  !SUPPORTED_MARKET_TYPES.every((m) => m in PROVIDER_REGISTRY)
) {
  throw new Error(
    "PROVIDER_REGISTRY and SUPPORTED_MARKET_TYPES are out of sync — update both in lib/market-data/."
  );
}
