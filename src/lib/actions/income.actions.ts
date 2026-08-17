"use server";

import { revalidatePath } from "next/cache";
import { requireUser, assertPermission } from "@/lib/auth/dal";
import { PERMISSIONS, AuthorizationError } from "@/lib/auth/permissions";
import { createIncomeSchema, voidIncomeSchema } from "@/lib/validation/accounting";
import {
  createIncome,
  voidIncome,
  InvalidIncomeAmountError,
  InvalidIncomePaymentMethodError,
  IncomeNotFoundError,
  IncomeAlreadyVoidedError,
  EmptyIncomeVoidReasonError,
} from "@/services/income.service";
import type { ActionResult } from "@/lib/actions/action-result";

async function requirePermissionAction(key: (typeof PERMISSIONS)[keyof typeof PERMISSIONS]) {
  const user = await requireUser();
  await assertPermission(user, key);
  return user;
}

export async function createIncomeAction(
  input: unknown,
): Promise<ActionResult<{ id: string; incomeNumber: string }>> {
  let user;
  try {
    user = await requirePermissionAction(PERMISSIONS.ACCOUNTING_INCOME_MANAGE);
  } catch (error) {
    if (error instanceof AuthorizationError) return { ok: false, error: error.message };
    throw error;
  }

  const parsed = createIncomeSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid income entry." };

  try {
    const result = await createIncome(parsed.data, user.id);
    revalidatePath("/accounting/income");
    revalidatePath("/accounting");
    revalidatePath("/cash-management");
    return { ok: true, data: result };
  } catch (error) {
    if (error instanceof InvalidIncomeAmountError || error instanceof InvalidIncomePaymentMethodError) {
      return { ok: false, error: error.message };
    }
    throw error;
  }
}

export async function voidIncomeAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  let user;
  try {
    user = await requirePermissionAction(PERMISSIONS.ACCOUNTING_INCOME_MANAGE);
  } catch (error) {
    if (error instanceof AuthorizationError) return { ok: false, error: error.message };
    throw error;
  }

  const parsed = voidIncomeSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "A reason is required." };

  try {
    const result = await voidIncome(parsed.data, user.id);
    revalidatePath("/accounting/income");
    revalidatePath("/accounting");
    revalidatePath("/cash-management");
    return { ok: true, data: result };
  } catch (error) {
    if (
      error instanceof IncomeNotFoundError ||
      error instanceof IncomeAlreadyVoidedError ||
      error instanceof EmptyIncomeVoidReasonError
    ) {
      return { ok: false, error: error.message };
    }
    throw error;
  }
}
