"use server";

import { revalidatePath } from "next/cache";
import { requirePermission, recordAdminAction } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { goldRateUpdateSchema, baseGoldRateSchema } from "@/lib/validations/gold-rate";
import { deriveFromPerTola, deriveFromPerGram, derivePurityRatesFromBase24k, rateChange } from "@/lib/pricing/gold-rate";
import { GOLD_PURITIES } from "@/lib/constants";
import type { GoldRate } from "@/types/database";

export interface ActionState {
  error?: string;
  success?: string;
}

/** Update a single purity's rate manually (per-tola or per-gram entry). */
export async function updateGoldRateAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requirePermission("gold_rates.update");

  const parsed = goldRateUpdateSchema.safeParse({
    purity: formData.get("purity"),
    input_mode: formData.get("input_mode"),
    rate_per_tola: formData.get("rate_per_tola") || undefined,
    rate_per_gram: formData.get("rate_per_gram") || undefined,
    rate_source: formData.get("rate_source") || "Manual",
    is_manual_override: formData.get("is_manual_override") === "on",
    notes: formData.get("notes") || "",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid gold rate input." };
  }

  const db = createAdminClient();
  const { data: existing } = await db.from("gold_rates").select("*").eq("purity", parsed.data.purity).maybeSingle<GoldRate>();

  const derived =
    parsed.data.input_mode === "per_tola"
      ? deriveFromPerTola(parsed.data.rate_per_tola!)
      : deriveFromPerGram(parsed.data.rate_per_gram!);

  const previousRatePerTola = existing ? parseFloat(existing.rate_per_tola) : null;
  const { change, percentage } = rateChange(derived.ratePerTola, previousRatePerTola);

  const { error } = await db
    .from("gold_rates")
    .update({
      rate_per_tola: derived.ratePerTola,
      rate_per_10_grams: derived.ratePer10Grams,
      rate_per_gram: derived.ratePerGram,
      previous_rate_per_tola: previousRatePerTola,
      rate_change: change,
      percentage_change: percentage,
      rate_source: parsed.data.rate_source,
      is_manual: true,
      is_manual_override: parsed.data.is_manual_override,
      is_active: true,
      notes: parsed.data.notes || null,
      effective_date: new Date().toISOString().slice(0, 10),
      effective_time: new Date().toISOString().slice(11, 19),
      updated_by: admin.id,
    })
    .eq("purity", parsed.data.purity);

  if (error) return { error: `Failed to update rate: ${error.message}` };

  await recordAdminAction(admin, "gold_rate_updated", "gold_rates", parsed.data.purity, `${parsed.data.purity} rate set to PKR ${derived.ratePerGram}/gram`);

  revalidatePath("/admin/gold-rates");
  revalidatePath("/gold-rates");
  revalidatePath("/gold-calculator");
  revalidatePath("/");
  revalidatePath("/products", "layout");

  return { success: `${parsed.data.purity} rate updated to ${derived.ratePerGram.toLocaleString()} PKR/gram.` };
}

/** Enter a base 24K rate per tola and auto-derive 22K/21K/18K (each remains individually overridable afterwards). */
export async function applyBaseRateAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requirePermission("gold_rates.update");

  const parsed = baseGoldRateSchema.safeParse({
    rate_24k_per_tola: formData.get("rate_24k_per_tola"),
    rate_source: formData.get("rate_source") || "Manual",
    notes: formData.get("notes") || "",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid rate." };
  }

  const db = createAdminClient();
  const purityRates = derivePurityRatesFromBase24k(parsed.data.rate_24k_per_tola);

  const { data: existingRows } = await db.from("gold_rates").select("*").in("purity", GOLD_PURITIES);
  const existingByPurity = new Map((existingRows as GoldRate[] | null ?? []).map((r) => [r.purity, r]));

  for (const purity of GOLD_PURITIES) {
    const existing = existingByPurity.get(purity);
    // Respect a manual override on an individual purity: skip auto-derivation for it.
    if (existing?.is_manual_override) continue;

    const ratePerTola = purityRates[purity];
    const derived = deriveFromPerTola(ratePerTola);
    const previousRatePerTola = existing ? parseFloat(existing.rate_per_tola) : null;
    const { change, percentage } = rateChange(derived.ratePerTola, previousRatePerTola);

    await db
      .from("gold_rates")
      .update({
        rate_per_tola: derived.ratePerTola,
        rate_per_10_grams: derived.ratePer10Grams,
        rate_per_gram: derived.ratePerGram,
        previous_rate_per_tola: previousRatePerTola,
        rate_change: change,
        percentage_change: percentage,
        rate_source: parsed.data.rate_source,
        is_manual: true,
        is_active: true,
        notes: purity === "24K" ? parsed.data.notes || null : `Auto-derived from 24K base rate (${parsed.data.rate_source})`,
        effective_date: new Date().toISOString().slice(0, 10),
        effective_time: new Date().toISOString().slice(11, 19),
        updated_by: admin.id,
      })
      .eq("purity", purity);
  }

  await recordAdminAction(admin, "gold_rate_base_applied", "gold_rates", "24K", `Base 24K rate PKR ${parsed.data.rate_24k_per_tola}/tola applied, purities auto-derived`);

  revalidatePath("/admin/gold-rates");
  revalidatePath("/gold-rates");
  revalidatePath("/gold-calculator");
  revalidatePath("/");
  revalidatePath("/products", "layout");

  return { success: "Base 24K rate applied. 22K/21K/18K rates recalculated (except any with manual override enabled)." };
}

export async function toggleManualOverrideAction(purity: string, enabled: boolean) {
  const admin = await requirePermission("gold_rates.update");
  const db = createAdminClient();
  await db.from("gold_rates").update({ is_manual_override: enabled, updated_by: admin.id }).eq("purity", purity);
  await recordAdminAction(admin, "gold_rate_override_toggled", "gold_rates", purity, `Manual override ${enabled ? "enabled" : "disabled"} for ${purity}`);
  revalidatePath("/admin/gold-rates");
}
