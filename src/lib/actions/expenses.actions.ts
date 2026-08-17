"use server";

import { revalidatePath } from "next/cache";
import { requireUser, assertPermission } from "@/lib/auth/dal";
import { PERMISSIONS, AuthorizationError } from "@/lib/auth/permissions";
import {
  createExpenseCategorySchema,
  setExpenseCategoryActiveSchema,
  createExpenseSchema,
  voidExpenseSchema,
} from "@/lib/validation/accounting";
import {
  createExpenseCategory,
  setExpenseCategoryActive,
  DuplicateExpenseCategoryError,
  type ExpenseCategoryRow,
} from "@/services/expense-category.service";
import {
  createExpense,
  voidExpense,
  InvalidExpenseAmountError,
  InvalidExpensePaymentMethodError,
  ExpenseCategoryInactiveError,
  ExpenseNotFoundError,
  ExpenseAlreadyVoidedError,
  EmptyVoidReasonError,
} from "@/services/expense.service";
import type { ActionResult } from "@/lib/actions/action-result";

async function requirePermissionAction(key: (typeof PERMISSIONS)[keyof typeof PERMISSIONS]) {
  const user = await requireUser();
  await assertPermission(user, key);
  return user;
}

export async function createExpenseCategoryAction(input: unknown): Promise<ActionResult<ExpenseCategoryRow>> {
  let user;
  try {
    user = await requirePermissionAction(PERMISSIONS.ACCOUNTING_EXPENSES_MANAGE);
  } catch (error) {
    if (error instanceof AuthorizationError) return { ok: false, error: error.message };
    throw error;
  }

  const parsed = createExpenseCategorySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid category." };

  try {
    const category = await createExpenseCategory(parsed.data, user.id);
    revalidatePath("/accounting/expenses");
    return { ok: true, data: category };
  } catch (error) {
    if (error instanceof DuplicateExpenseCategoryError) return { ok: false, error: error.message };
    throw error;
  }
}

export async function setExpenseCategoryActiveAction(input: unknown): Promise<ActionResult<{ ok: true }>> {
  try {
    await requirePermissionAction(PERMISSIONS.ACCOUNTING_EXPENSES_MANAGE);
  } catch (error) {
    if (error instanceof AuthorizationError) return { ok: false, error: error.message };
    throw error;
  }

  const parsed = setExpenseCategoryActiveSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid request." };

  await setExpenseCategoryActive(parsed.data.id, parsed.data.isActive);
  revalidatePath("/accounting/expenses");
  return { ok: true, data: { ok: true } };
}

export async function createExpenseAction(
  input: unknown,
): Promise<ActionResult<{ id: string; expenseNumber: string }>> {
  let user;
  try {
    user = await requirePermissionAction(PERMISSIONS.ACCOUNTING_EXPENSES_CREATE);
  } catch (error) {
    if (error instanceof AuthorizationError) return { ok: false, error: error.message };
    throw error;
  }

  const parsed = createExpenseSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid expense." };

  try {
    const result = await createExpense(parsed.data, user.id);
    revalidatePath("/accounting/expenses");
    revalidatePath("/accounting");
    revalidatePath("/cash-management");
    return { ok: true, data: result };
  } catch (error) {
    if (
      error instanceof InvalidExpenseAmountError ||
      error instanceof InvalidExpensePaymentMethodError ||
      error instanceof ExpenseCategoryInactiveError
    ) {
      return { ok: false, error: error.message };
    }
    throw error;
  }
}

export async function voidExpenseAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  let user;
  try {
    user = await requirePermissionAction(PERMISSIONS.ACCOUNTING_EXPENSES_MANAGE);
  } catch (error) {
    if (error instanceof AuthorizationError) return { ok: false, error: error.message };
    throw error;
  }

  const parsed = voidExpenseSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "A reason is required." };

  try {
    const result = await voidExpense(parsed.data, user.id);
    revalidatePath("/accounting/expenses");
    revalidatePath("/accounting");
    revalidatePath("/cash-management");
    return { ok: true, data: result };
  } catch (error) {
    if (
      error instanceof ExpenseNotFoundError ||
      error instanceof ExpenseAlreadyVoidedError ||
      error instanceof EmptyVoidReasonError
    ) {
      return { ok: false, error: error.message };
    }
    throw error;
  }
}
