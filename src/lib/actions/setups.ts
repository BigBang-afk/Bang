"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { AuthActionState } from "@/lib/actions/auth";
import { requireUser } from "@/lib/auth/session";
import { checkUsageLimit } from "@/lib/entitlements";
import { computeRiskReward, RiskRewardInputError } from "@/lib/trading/risk-reward";
import { createClient } from "@/lib/supabase/server";
import type { SetupStatus } from "@/types/database";

const optionalPositiveNumber = z.coerce.number().positive().optional().or(z.literal(""));

const createSetupSchema = z.object({
  assetId: z.string().uuid("Select an asset."),
  direction: z.enum(["long", "short"]),
  timeframe: z.string().trim().min(1).max(10),
  entryPrice: z.coerce.number().positive(),
  stopLoss: z.coerce.number().positive(),
  takeProfit1: optionalPositiveNumber,
  takeProfit2: optionalPositiveNumber,
  setupQuality: z.enum(["poor", "fair", "good", "excellent"]),
  rationale: z.string().trim().max(2000).optional().or(z.literal("")),
  invalidation: z.string().trim().max(1000).optional().or(z.literal("")),
  expiresAt: z.string().trim().optional().or(z.literal("")),
});

export async function createSetupAction(
  _prevState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const profile = await requireUser("/dashboard/setups");
  const parsed = createSetupSchema.safeParse({
    assetId: formData.get("assetId"),
    direction: formData.get("direction"),
    timeframe: formData.get("timeframe"),
    entryPrice: formData.get("entryPrice"),
    stopLoss: formData.get("stopLoss"),
    takeProfit1: formData.get("takeProfit1"),
    takeProfit2: formData.get("takeProfit2"),
    setupQuality: formData.get("setupQuality"),
    rationale: formData.get("rationale"),
    invalidation: formData.get("invalidation"),
    expiresAt: formData.get("expiresAt"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const usage = await checkUsageLimit(profile.id, "saved_setups");
  if (!usage.allowed) {
    return {
      error: `You've reached your plan's limit of ${usage.limit} saved setups. Upgrade to save more.`,
      code: "limit_reached",
    };
  }

  const {
    assetId,
    direction,
    timeframe,
    entryPrice,
    stopLoss,
    takeProfit1,
    takeProfit2,
    setupQuality,
    rationale,
    invalidation,
    expiresAt,
  } = parsed.data;

  const takeProfits = [takeProfit1, takeProfit2].filter(
    (v): v is number => typeof v === "number"
  );

  let riskRewardRatio: number | null = null;
  try {
    riskRewardRatio = computeRiskReward({ direction, entry: entryPrice, stopLoss, takeProfits })
      .primaryRiskRewardRatio;
  } catch (err) {
    if (err instanceof RiskRewardInputError) {
      return { error: err.message };
    }
    throw err;
  }

  const supabase = await createClient();
  const { error } = await supabase.from("trading_setups").insert({
    user_id: profile.id,
    asset_id: assetId,
    source: "user",
    direction,
    timeframe,
    entry_price: entryPrice,
    stop_loss: stopLoss,
    take_profit_targets: takeProfits,
    risk_reward_ratio: riskRewardRatio,
    setup_quality: setupQuality,
    rationale: rationale || null,
    invalidation: invalidation || null,
    expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
  });

  if (error) {
    return { error: "Couldn't save the setup. Please try again." };
  }

  revalidatePath("/dashboard/setups");
  return { error: null };
}

const ALLOWED_STATUSES: SetupStatus[] = [
  "active",
  "triggered",
  "completed",
  "invalidated",
  "expired",
];

export async function updateSetupStatusAction(formData: FormData): Promise<void> {
  const profile = await requireUser("/dashboard/setups");
  const setupId = z.string().uuid().safeParse(formData.get("setupId"));
  const status = z.enum(ALLOWED_STATUSES as [SetupStatus, ...SetupStatus[]]).safeParse(
    formData.get("status")
  );
  if (!setupId.success || !status.success) return;

  const supabase = await createClient();
  await supabase
    .from("trading_setups")
    .update({ status: status.data })
    .eq("id", setupId.data)
    .eq("user_id", profile.id);

  revalidatePath("/dashboard/setups");
}

export async function deleteSetupAction(formData: FormData): Promise<void> {
  const profile = await requireUser("/dashboard/setups");
  const id = z.string().uuid().safeParse(formData.get("setupId"));
  if (!id.success) return;

  const supabase = await createClient();
  await supabase.from("trading_setups").delete().eq("id", id.data).eq("user_id", profile.id);

  revalidatePath("/dashboard/setups");
}
