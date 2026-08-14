"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { AuthActionState } from "@/lib/actions/auth";
import { requireUser } from "@/lib/auth/session";
import { checkUsageLimit } from "@/lib/entitlements";
import { computeTradePnl } from "@/lib/trading/trade-pnl";
import { RiskRewardInputError } from "@/lib/trading/risk-reward";
import { createClient } from "@/lib/supabase/server";

const optionalPositiveNumber = z.coerce.number().positive().optional().or(z.literal(""));

const createEntrySchema = z.object({
  assetId: z.string().uuid().optional().or(z.literal("")),
  direction: z.enum(["long", "short"]),
  entryPrice: z.coerce.number().positive(),
  exitPrice: optionalPositiveNumber,
  positionSize: z.coerce.number().positive(),
  stopLoss: optionalPositiveNumber,
  takeProfit: optionalPositiveNumber,
  riskAmount: optionalPositiveNumber,
  strategy: z.string().trim().max(120).optional().or(z.literal("")),
  screenshotUrl: z.string().trim().url().max(2000).optional().or(z.literal("")),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
});

export async function createJournalEntryAction(
  _prevState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const profile = await requireUser("/dashboard/journal");
  const parsed = createEntrySchema.safeParse({
    assetId: formData.get("assetId"),
    direction: formData.get("direction"),
    entryPrice: formData.get("entryPrice"),
    exitPrice: formData.get("exitPrice"),
    positionSize: formData.get("positionSize"),
    stopLoss: formData.get("stopLoss"),
    takeProfit: formData.get("takeProfit"),
    riskAmount: formData.get("riskAmount"),
    strategy: formData.get("strategy"),
    screenshotUrl: formData.get("screenshotUrl"),
    notes: formData.get("notes"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const usage = await checkUsageLimit(profile.id, "journal_entries");
  if (!usage.allowed) {
    return {
      error: `You've reached your plan's limit of ${usage.limit} journal entries. Upgrade to log more.`,
      code: "limit_reached",
    };
  }

  const {
    assetId,
    direction,
    entryPrice,
    exitPrice,
    positionSize,
    stopLoss,
    takeProfit,
    riskAmount,
    strategy,
    screenshotUrl,
    notes,
  } = parsed.data;
  const hasExit = typeof exitPrice === "number";

  let pnlCents: number | null = null;
  let pnlPercent: number | null = null;
  if (hasExit) {
    try {
      const pnl = computeTradePnl({ direction, entryPrice, exitPrice, positionSize });
      pnlCents = pnl.pnlCents;
      pnlPercent = pnl.pnlPercent;
    } catch (err) {
      if (err instanceof RiskRewardInputError) {
        return { error: err.message };
      }
      throw err;
    }
  }

  const supabase = await createClient();
  const { error } = await supabase.from("trade_journal").insert({
    user_id: profile.id,
    asset_id: assetId || null,
    direction,
    entry_price: entryPrice,
    exit_price: hasExit ? exitPrice : null,
    position_size: positionSize,
    stop_loss: typeof stopLoss === "number" ? stopLoss : null,
    take_profit: typeof takeProfit === "number" ? takeProfit : null,
    risk_amount_cents: typeof riskAmount === "number" ? Math.round(riskAmount * 100) : null,
    pnl_cents: pnlCents,
    pnl_percent: pnlPercent,
    status: hasExit ? "closed" : "open",
    closed_at: hasExit ? new Date().toISOString() : null,
    strategy: strategy || null,
    screenshot_url: screenshotUrl || null,
    notes: notes || null,
  });

  if (error) {
    return { error: "Couldn't log the trade. Please try again." };
  }

  revalidatePath("/dashboard/journal");
  return { error: null };
}

const closeEntrySchema = z.object({
  entryId: z.string().uuid(),
  exitPrice: z.coerce.number().positive(),
});

/** Closes a still-open entry: sets the exit price and computes P/L from it. */
export async function closeJournalEntryAction(
  _prevState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const profile = await requireUser("/dashboard/journal");
  const parsed = closeEntrySchema.safeParse({
    entryId: formData.get("entryId"),
    exitPrice: formData.get("exitPrice"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid exit price." };
  }

  const supabase = await createClient();
  const { data: entry } = await supabase
    .from("trade_journal")
    .select("direction, entry_price, position_size")
    .eq("id", parsed.data.entryId)
    .eq("user_id", profile.id)
    .maybeSingle();

  if (!entry) {
    return { error: "Trade not found." };
  }

  let pnl;
  try {
    pnl = computeTradePnl({
      direction: entry.direction,
      entryPrice: entry.entry_price,
      exitPrice: parsed.data.exitPrice,
      positionSize: entry.position_size,
    });
  } catch (err) {
    if (err instanceof RiskRewardInputError) {
      return { error: err.message };
    }
    throw err;
  }

  const { error } = await supabase
    .from("trade_journal")
    .update({
      exit_price: parsed.data.exitPrice,
      pnl_cents: pnl.pnlCents,
      pnl_percent: pnl.pnlPercent,
      status: "closed",
      closed_at: new Date().toISOString(),
    })
    .eq("id", parsed.data.entryId)
    .eq("user_id", profile.id);

  if (error) {
    return { error: "Couldn't close the trade. Please try again." };
  }

  revalidatePath("/dashboard/journal");
  revalidatePath("/dashboard/performance");
  return { error: null };
}

export async function deleteJournalEntryAction(formData: FormData) {
  const profile = await requireUser("/dashboard/journal");
  const id = z.string().uuid().safeParse(formData.get("entryId"));
  if (!id.success) return;

  const supabase = await createClient();
  await supabase.from("trade_journal").delete().eq("id", id.data).eq("user_id", profile.id);

  revalidatePath("/dashboard/journal");
  revalidatePath("/dashboard/performance");
}
