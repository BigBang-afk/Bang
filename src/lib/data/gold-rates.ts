import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { GoldRate, GoldRateHistoryEntry } from "@/types/database";
import type { ActiveRateMap } from "@/lib/pricing/product-pricing";
import { GOLD_PURITIES } from "@/lib/constants";

export async function getActiveGoldRates(): Promise<GoldRate[]> {
  const db = createAdminClient();
  const { data, error } = await db
    .from("gold_rates")
    .select("*")
    .eq("is_active", true)
    .order("purity");
  if (error) throw error;
  return (data ?? []) as GoldRate[];
}

/** Builds the lightweight map the pricing engine consumes. */
export async function getActiveRateMap(): Promise<ActiveRateMap> {
  const rates = await getActiveGoldRates();
  const map: ActiveRateMap = {};
  for (const r of rates) {
    map[r.purity] = {
      ratePerGram: parseFloat(r.rate_per_gram),
      effectiveDate: r.effective_date,
      effectiveTime: r.effective_time,
    };
  }
  return map;
}

export async function getGoldRateHistory(options?: {
  purity?: string;
  from?: string;
  to?: string;
  limit?: number;
}): Promise<GoldRateHistoryEntry[]> {
  const db = createAdminClient();
  let query = db.from("gold_rate_history").select("*").order("created_at", { ascending: false });

  if (options?.purity) query = query.eq("purity", options.purity);
  if (options?.from) query = query.gte("effective_date", options.from);
  if (options?.to) query = query.lte("effective_date", options.to);
  query = query.limit(options?.limit ?? 200);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as GoldRateHistoryEntry[];
}

export function ensureAllPuritiesPresent(rates: GoldRate[]): boolean {
  const present = new Set(rates.map((r) => r.purity));
  return GOLD_PURITIES.every((p) => present.has(p));
}
