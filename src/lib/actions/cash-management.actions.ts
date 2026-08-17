"use server";

import { revalidatePath } from "next/cache";
import { requireUser, assertPermission } from "@/lib/auth/dal";
import { PERMISSIONS, AuthorizationError } from "@/lib/auth/permissions";
import {
  recordExpenseSchema,
  recordCashAdjustmentSchema,
  cashReconciliationSchema,
  partyCashAdjustmentSchema,
} from "@/lib/validation/cash-management";
import { recordExpense, recordCashAdjustment, InvalidCashAmountError } from "@/services/cash-transaction.service";
import { runCashReconciliation, type CashReconciliationResult } from "@/services/reconciliation.service";
import { recordPartyCashAdjustment } from "@/services/party-cash-ledger.service";
import type { ActionResult } from "@/lib/actions/action-result";

async function requirePermissionAction(key: (typeof PERMISSIONS)[keyof typeof PERMISSIONS]) {
  const user = await requireUser();
  await assertPermission(user, key);
  return user;
}

export async function recordExpenseAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  let user;
  try {
    user = await requirePermissionAction(PERMISSIONS.CASH_MANAGE);
  } catch (error) {
    if (error instanceof AuthorizationError) return { ok: false, error: error.message };
    throw error;
  }

  const parsed = recordExpenseSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid expense details." };
  }

  try {
    const result = await recordExpense(parsed.data, user.id);
    revalidatePath("/cash-management");
    return { ok: true, data: result };
  } catch (error) {
    if (error instanceof InvalidCashAmountError) return { ok: false, error: error.message };
    throw error;
  }
}

export async function recordCashAdjustmentAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  let user;
  try {
    user = await requirePermissionAction(PERMISSIONS.CASH_RECONCILE);
  } catch (error) {
    if (error instanceof AuthorizationError) return { ok: false, error: error.message };
    throw error;
  }

  const parsed = recordCashAdjustmentSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid adjustment details." };
  }

  try {
    const result = await recordCashAdjustment(parsed.data, user.id);
    revalidatePath("/cash-management");
    return { ok: true, data: result };
  } catch (error) {
    if (error instanceof InvalidCashAmountError) return { ok: false, error: error.message };
    throw error;
  }
}

export async function runCashReconciliationAction(
  input: unknown,
): Promise<ActionResult<CashReconciliationResult>> {
  let user;
  try {
    user = await requirePermissionAction(PERMISSIONS.CASH_RECONCILE);
  } catch (error) {
    if (error instanceof AuthorizationError) return { ok: false, error: error.message };
    throw error;
  }

  const parsed = cashReconciliationSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid reconciliation details." };
  }

  const result = await runCashReconciliation(parsed.data, user.id);
  revalidatePath("/cash-management");
  return { ok: true, data: result };
}

export async function recordPartyCashAdjustmentAction(
  input: unknown,
): Promise<ActionResult<{ id: string; balanceAfter: string }>> {
  let user;
  try {
    user = await requirePermissionAction(PERMISSIONS.CASH_RECONCILE);
  } catch (error) {
    if (error instanceof AuthorizationError) return { ok: false, error: error.message };
    throw error;
  }

  const parsed = partyCashAdjustmentSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid adjustment details." };
  }

  const result = await recordPartyCashAdjustment(
    {
      partyType: parsed.data.partyType,
      partyId: parsed.data.partyId,
      direction: parsed.data.direction,
      amount: parsed.data.amount,
      referenceType: "ManualAdjustment",
      referenceId: parsed.data.partyId,
      description: parsed.data.description,
    },
    user.id,
  );
  revalidatePath("/cash-management");
  return { ok: true, data: result };
}
