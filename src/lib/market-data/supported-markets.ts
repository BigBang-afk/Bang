import type { MarketType } from "@/types/database";

/**
 * Which market types have a connected data provider right now. No
 * "server-only" guard on this file (unlike registry.ts) — it's the small
 * subset that's safe and useful to know client-side too (e.g. graying out
 * unsupported symbols in a search box), without pulling any provider
 * implementation into the browser bundle.
 */
export const SUPPORTED_MARKET_TYPES: MarketType[] = ["crypto"];

export function isMarketSupportedClient(marketType: MarketType): boolean {
  return SUPPORTED_MARKET_TYPES.includes(marketType);
}
