"use server";

import { revalidatePath } from "next/cache";
import { requireUser, assertPermission } from "@/lib/auth/dal";
import { PERMISSIONS, AuthorizationError } from "@/lib/auth/permissions";
import { goldReconciliationSchema, goldAdjustmentSchema } from "@/lib/validation/gold-ledger";
import { runGoldReconciliation, type GoldReconciliationResult } from "@/services/reconciliation.service";
import { recordGoldAdjustment } from "@/services/gold-ledger.service";
import type { ActionResult } from "@/lib/actions/action-result";

async function requirePermissionAction(key: (typeof PERMISSIONS)[keyof typeof PERMISSIONS]) {
  const user = await requireUser();
  await assertPermission(user, key);
  return user;
}

export async function runGoldReconciliationAction(
  input: unknown,
): Promise<ActionResult<GoldReconciliationResult>> {
  let user;
  try {
    user = await requirePermissionAction(PERMISSIONS.GOLD_LEDGER_RECONCILE);
  } catch (error) {
    if (error instanceof AuthorizationError) return { ok: false, error: error.message };
    throw error;
  }

  const parsed = goldReconciliationSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid reconciliation details." };
  }

  const result = await runGoldReconciliation(parsed.data, user.id);
  revalidatePath("/gold-ledger");
  return { ok: true, data: result };
}

export async function recordGoldAdjustmentAction(
  input: unknown,
): Promise<ActionResult<{ id: string; balanceAfter: string }>> {
  let user;
  try {
    user = await requirePermissionAction(PERMISSIONS.GOLD_LEDGER_RECONCILE);
  } catch (error) {
    if (error instanceof AuthorizationError) return { ok: false, error: error.message };
    throw error;
  }

  const parsed = goldAdjustmentSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid adjustment details." };
  }

  const result = await recordGoldAdjustment(
    {
      partyType: parsed.data.partyType,
      partyId: parsed.data.partyId,
      purity: parsed.data.purity,
      direction: parsed.data.direction,
      weight: parsed.data.weight,
      referenceType: "ManualAdjustment",
      referenceId: parsed.data.partyId,
      description: parsed.data.description,
    },
    user.id,
  );
  revalidatePath("/gold-ledger");
  return { ok: true, data: result };
}
