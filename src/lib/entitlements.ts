import "server-only";

import { createClient } from "@/lib/supabase/server";
import type {
  PlanLimits,
  PlanRow,
  SubscriptionRow,
  SubscriptionStatus,
  UsageType,
} from "@/types/database";

/**
 * Server-side subscription & entitlement system.
 *
 * Every function here reads from the database (never trusts client input)
 * and is safe to call from Server Components and Server Actions only.
 * Nothing in this module should ever be imported into a Client Component.
 *
 * Design: `plans.limits` (numeric caps, e.g. "3 watchlists") and
 * `plan_features` (qualitative flags, e.g. "CSV export") are two
 * deliberately different mechanisms — limits are about *how much*, features
 * are about *whether at all*. Both are pure data, never hard-coded per
 * feature in application code.
 */

// Subscription states that entitle a user to their plan's benefits. A
// canceled/incomplete/expired subscription does not — callers of
// getUserPlan() fall back to the Free plan in that case, same as a user
// with no subscription row at all.
const ENTITLED_STATUSES: SubscriptionStatus[] = ["active", "trialing", "past_due"];

export interface UserPlan {
  subscription: SubscriptionRow | null;
  plan: PlanRow;
  /** True when the subscription itself is Free plan or the user reverted to it via fallback. */
  isFallback: boolean;
}

let cachedFreePlan: PlanRow | null = null;

async function getFreePlan(): Promise<PlanRow> {
  if (cachedFreePlan) return cachedFreePlan;
  const supabase = await createClient();
  const { data } = await supabase.from("plans").select("*").eq("code", "free").single();
  if (!data) {
    throw new Error("Free plan is missing from public.plans — check migrations.");
  }
  cachedFreePlan = data;
  return data;
}

/**
 * Resolves the plan currently entitling a user — their active/trialing/
 * past_due subscription's plan, or the Free plan if they have none. This
 * is the single source of truth every other function in this module
 * builds on; never infer a user's plan any other way.
 */
export async function getUserPlan(userId: string): Promise<UserPlan> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("subscriptions")
    .select("*, plans(*)")
    .eq("user_id", userId)
    .in("status", ENTITLED_STATUSES)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (data) {
    const { plans, ...subscription } = data as unknown as SubscriptionRow & {
      plans: PlanRow;
    };
    return { subscription, plan: plans, isFallback: false };
  }

  return { subscription: null, plan: await getFreePlan(), isFallback: true };
}

/**
 * Whether the user's current plan grants a qualitative feature (e.g.
 * "csv_export", "priority_ai_queue" — see plan_features.feature_key).
 * Absence of a plan_features row means "not included": there's no need to
 * store negative rows.
 */
export async function hasFeatureAccess(
  userId: string,
  featureKey: string
): Promise<boolean> {
  const { plan } = await getUserPlan(userId);
  const supabase = await createClient();
  const { count } = await supabase
    .from("plan_features")
    .select("id", { count: "exact", head: true })
    .eq("plan_id", plan.id)
    .eq("feature_key", featureKey)
    .eq("is_included", true);

  return (count ?? 0) > 0;
}

/** Numeric cap for a limit key on the user's current plan. `null` = unlimited. */
export async function getUsageLimit(
  userId: string,
  limitKey: keyof PlanLimits
): Promise<number | null> {
  const { plan } = await getUserPlan(userId);
  const value = plan.limits[limitKey];
  return typeof value === "number" ? value : null;
}

export type CountedLimitKey =
  | "watchlists"
  | "watchlist_items"
  | "alerts"
  | "saved_setups"
  | "journal_entries";

export type DailyLimitKey = "ai_analyses_per_day" | "scanner_requests_per_day";

const DAILY_LIMIT_USAGE_TYPE: Record<DailyLimitKey, UsageType> = {
  ai_analyses_per_day: "ai_analysis",
  scanner_requests_per_day: "scanner_run",
};

export interface UsageCheck {
  allowed: boolean;
  used: number;
  limit: number | null;
}

/**
 * Counts a user's *current standing total* against one of their plan's
 * capacity limits (watchlists, alerts, saved setups, journal entries, ...).
 * Reflects live row counts — there's no separate counter to keep in sync.
 */
async function countResource(userId: string, limitKey: CountedLimitKey): Promise<number> {
  const supabase = await createClient();

  switch (limitKey) {
    case "watchlists": {
      const { count } = await supabase
        .from("watchlists")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId);
      return count ?? 0;
    }
    case "watchlist_items": {
      // Total items across all of the user's watchlists.
      const { data: lists } = await supabase
        .from("watchlists")
        .select("id")
        .eq("user_id", userId);
      const ids = (lists ?? []).map((l) => l.id);
      if (ids.length === 0) return 0;
      const { count } = await supabase
        .from("watchlist_items")
        .select("id", { count: "exact", head: true })
        .in("watchlist_id", ids);
      return count ?? 0;
    }
    case "alerts": {
      const { count } = await supabase
        .from("alerts")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId);
      return count ?? 0;
    }
    case "saved_setups": {
      const { count } = await supabase
        .from("trading_setups")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId);
      return count ?? 0;
    }
    case "journal_entries": {
      const { count } = await supabase
        .from("trade_journal")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId);
      return count ?? 0;
    }
  }
}

function startOfTodayUtc(): string {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString();
}

async function countUsageToday(userId: string, usageType: UsageType): Promise<number> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("usage_tracking")
    .select("quantity")
    .eq("user_id", userId)
    .eq("usage_type", usageType)
    .gte("created_at", startOfTodayUtc());

  return (data ?? []).reduce((sum, row) => sum + row.quantity, 0);
}

/**
 * Checks a "how much do you currently have" limit (watchlists, alerts,
 * saved setups, journal entries, total watchlist items) against the
 * user's plan. `allowed` tells the caller whether ONE MORE would fit —
 * always check this server-side before an insert, never rely on the UI
 * having hidden the button.
 */
export async function checkUsageLimit(
  userId: string,
  limitKey: CountedLimitKey
): Promise<UsageCheck> {
  const [limit, used] = await Promise.all([
    getUsageLimit(userId, limitKey),
    countResource(userId, limitKey),
  ]);

  return { allowed: limit === null || used < limit, used, limit };
}

/**
 * Checks a "how much have you done today" limit (AI analyses, scanner
 * requests). Backed by usage_tracking, which callers append to via
 * recordUsage() after a successful gated action.
 */
export async function checkDailyUsageLimit(
  userId: string,
  limitKey: DailyLimitKey
): Promise<UsageCheck> {
  const [limit, used] = await Promise.all([
    getUsageLimit(userId, limitKey),
    countUsageToday(userId, DAILY_LIMIT_USAGE_TYPE[limitKey]),
  ]);

  return { allowed: limit === null || used < limit, used, limit };
}

/**
 * Records one unit of a rate-limited action. Call this after the action
 * succeeds (not before — a failed AI call shouldn't burn the user's daily
 * quota). Insert is scoped to the caller's own user_id, matching the RLS
 * policy on usage_tracking.
 */
export async function recordUsage(
  userId: string,
  usageType: UsageType,
  quantity = 1,
  metadata: Record<string, unknown> = {}
): Promise<void> {
  const supabase = await createClient();
  await supabase.from("usage_tracking").insert({
    user_id: userId,
    usage_type: usageType,
    quantity,
    metadata,
  });
}

/** All current usage/limit pairs for a user's plan — powers the Subscription page. */
export async function getUsageSummary(userId: string) {
  const countedKeys: CountedLimitKey[] = [
    "watchlists",
    "watchlist_items",
    "alerts",
    "saved_setups",
    "journal_entries",
  ];
  const dailyKeys: DailyLimitKey[] = ["ai_analyses_per_day", "scanner_requests_per_day"];

  const [counted, daily] = await Promise.all([
    Promise.all(countedKeys.map((key) => checkUsageLimit(userId, key))),
    Promise.all(dailyKeys.map((key) => checkDailyUsageLimit(userId, key))),
  ]);

  return [
    ...countedKeys.map((key, i) => ({ key, ...counted[i] })),
    ...dailyKeys.map((key, i) => ({ key, ...daily[i] })),
  ];
}
