import "server-only";

import { NextResponse } from "next/server";

import { getCurrentProfile } from "@/lib/auth/session";
import { rateLimit } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";
import { MarketDataError } from "@/lib/market-data/types";
import type { MarketAssetRow } from "@/types/database";

/**
 * Every market-data route handler shares this shape: require a signed-in
 * user, rate-limit per user, resolve the requested symbol against our own
 * market_assets table (never trust a client-supplied market_type), then
 * let the caller do the provider call. Centralized here so all three
 * routes fail the same way.
 */
export async function authorizeMarketDataRequest(
  routeName: string
): Promise<{ userId: string } | NextResponse> {
  const profile = await getCurrentProfile();
  if (!profile) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const limit = rateLimit(`market-data:${routeName}:${profile.id}`, 60, 60_000);
  if (!limit.success) {
    return NextResponse.json({ error: "Too many requests. Slow down." }, { status: 429 });
  }

  return { userId: profile.id };
}

export async function resolveAsset(symbol: string): Promise<MarketAssetRow | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("market_assets")
    .select("*")
    .eq("symbol", symbol)
    .eq("is_active", true)
    .maybeSingle();
  return data;
}

const STATUS_BY_CODE: Record<MarketDataError["code"], number> = {
  invalid_symbol: 400,
  unsupported_market: 404,
  rate_limited: 429,
  provider_unavailable: 502,
  network_error: 502,
};

export function marketDataErrorResponse(err: unknown): NextResponse {
  if (err instanceof MarketDataError) {
    return NextResponse.json(
      { error: err.message, code: err.code, provider: err.provider },
      { status: STATUS_BY_CODE[err.code] }
    );
  }
  console.error("[market-data] unexpected error", err);
  return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
}
