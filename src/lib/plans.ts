import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { PlanFeatureRow, PlanRow } from "@/types/database";

export interface PlanWithFeatures extends PlanRow {
  features: PlanFeatureRow[];
}

// Used only when Supabase env vars aren't configured yet (e.g. first local
// run before `supabase db push`). Mirrors the seed data in
// supabase/migrations/0001_init.sql exactly. Real traffic always reads the
// database — this is a local fallback, not a substitute data source.
const FALLBACK_PLANS: PlanWithFeatures[] = [
  {
    id: "fallback-free",
    code: "free",
    name: "Free",
    description: "Get started with the essentials.",
    price_monthly_cents: 0,
    price_yearly_cents: null,
    currency: "usd",
    is_active: true,
    is_public: true,
    sort_order: 0,
    trial_days: 0,
    limits: { watchlists: 1, watchlist_items: 10, alerts: 3, ai_analyses_per_day: 3, scanner_requests_per_day: 5, saved_setups: 5, journal_entries: 25, markets: ["crypto"] },
    stripe_product_id: null,
    stripe_price_id_monthly: null,
    stripe_price_id_yearly: null,
    created_at: "",
    updated_at: "",
    features: [],
  },
  {
    id: "fallback-starter",
    code: "starter",
    name: "Starter",
    description: "For traders building a routine.",
    price_monthly_cents: 1900,
    price_yearly_cents: null,
    currency: "usd",
    is_active: true,
    is_public: true,
    sort_order: 1,
    trial_days: 7,
    limits: { watchlists: 3, watchlist_items: 50, alerts: 15, ai_analyses_per_day: 15, scanner_requests_per_day: 25, saved_setups: 25, journal_entries: 250, markets: ["crypto", "forex"] },
    stripe_product_id: null,
    stripe_price_id_monthly: null,
    stripe_price_id_yearly: null,
    created_at: "",
    updated_at: "",
    features: [],
  },
  {
    id: "fallback-pro",
    code: "pro",
    name: "Pro",
    description: "Full analytics for active traders.",
    price_monthly_cents: 4900,
    price_yearly_cents: null,
    currency: "usd",
    is_active: true,
    is_public: true,
    sort_order: 2,
    trial_days: 7,
    limits: { watchlists: 10, watchlist_items: 200, alerts: 50, ai_analyses_per_day: 50, scanner_requests_per_day: 100, saved_setups: 100, journal_entries: null, markets: ["crypto", "forex", "gold", "indices"] },
    stripe_product_id: null,
    stripe_price_id_monthly: null,
    stripe_price_id_yearly: null,
    created_at: "",
    updated_at: "",
    features: [],
  },
  {
    id: "fallback-elite",
    code: "elite",
    name: "Elite",
    description: "Maximum coverage and priority AI.",
    price_monthly_cents: 9900,
    price_yearly_cents: null,
    currency: "usd",
    is_active: true,
    is_public: true,
    sort_order: 3,
    trial_days: 7,
    limits: { watchlists: null, watchlist_items: null, alerts: null, ai_analyses_per_day: 200, scanner_requests_per_day: null, saved_setups: null, journal_entries: null, markets: ["crypto", "forex", "gold", "indices"] },
    stripe_product_id: null,
    stripe_price_id_monthly: null,
    stripe_price_id_yearly: null,
    created_at: "",
    updated_at: "",
    features: [],
  },
];

/**
 * Fetches active, publicly-visible plans (with their feature bullets) from
 * the database, ordered for pricing-table display. Falls back to a local
 * static copy only when Supabase isn't reachable/configured, so the
 * pricing page never hard-crashes during initial setup.
 */
export async function getPublicPlans(): Promise<PlanWithFeatures[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("plans")
      .select("*, plan_features(*)")
      .eq("is_active", true)
      .eq("is_public", true)
      .order("sort_order", { ascending: true });

    if (error || !data) throw error ?? new Error("No plans returned");

    return data.map((plan) => {
      const { plan_features, ...rest } = plan as unknown as PlanRow & {
        plan_features: PlanFeatureRow[];
      };
      return {
        ...rest,
        features: [...plan_features].sort((a, b) => a.sort_order - b.sort_order),
      };
    });
  } catch (err) {
    console.warn(
      "[plans] Falling back to static plan data — Supabase not reachable yet.",
      err
    );
    return FALLBACK_PLANS;
  }
}

export function formatPlanPrice(cents: number, currency = "usd"): string {
  if (cents === 0) return "$0";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}
