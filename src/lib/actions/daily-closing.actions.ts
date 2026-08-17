"use server";

import { revalidatePath } from "next/cache";
import { requireUser, assertPermission } from "@/lib/auth/dal";
import { PERMISSIONS, AuthorizationError } from "@/lib/auth/permissions";
import { submitDailyClosingSchema, confirmDailyClosingSchema, reopenDailyClosingSchema } from "@/lib/validation/accounting";
import {
  submitDailyClosing,
  confirmDailyClosing,
  reopenDailyClosing,
  InvalidPhysicalCashAmountError,
  DailyClosingAlreadyClosedError,
  DailyClosingNotFoundError,
  DailyClosingNotPendingReviewError,
  DailyClosingNotClosedError,
  EmptyReopenReasonError,
  type DailyClosingRecord,
} from "@/services/daily-closing.service";
import type { ActionResult } from "@/lib/actions/action-result";

async function requirePermissionAction(key: (typeof PERMISSIONS)[keyof typeof PERMISSIONS]) {
  const user = await requireUser();
  await assertPermission(user, key);
  return user;
}

export async function submitDailyClosingAction(input: unknown): Promise<ActionResult<DailyClosingRecord>> {
  let user;
  try {
    user = await requirePermissionAction(PERMISSIONS.ACCOUNTING_DAILY_CLOSING);
  } catch (error) {
    if (error instanceof AuthorizationError) return { ok: false, error: error.message };
    throw error;
  }

  const parsed = submitDailyClosingSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid closing details." };

  try {
    const result = await submitDailyClosing(parsed.data, user.id);
    revalidatePath("/accounting/daily-closing");
    revalidatePath("/accounting");
    return { ok: true, data: result };
  } catch (error) {
    if (error instanceof InvalidPhysicalCashAmountError || error instanceof DailyClosingAlreadyClosedError) {
      return { ok: false, error: error.message };
    }
    throw error;
  }
}

export async function confirmDailyClosingAction(input: unknown): Promise<ActionResult<DailyClosingRecord>> {
  let user;
  try {
    user = await requirePermissionAction(PERMISSIONS.ACCOUNTING_DAILY_CLOSING);
  } catch (error) {
    if (error instanceof AuthorizationError) return { ok: false, error: error.message };
    throw error;
  }

  const parsed = confirmDailyClosingSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid business date." };

  try {
    const result = await confirmDailyClosing(parsed.data.businessDate, user.id);
    revalidatePath("/accounting/daily-closing");
    revalidatePath("/accounting");
    return { ok: true, data: result };
  } catch (error) {
    if (error instanceof DailyClosingNotFoundError || error instanceof DailyClosingNotPendingReviewError) {
      return { ok: false, error: error.message };
    }
    throw error;
  }
}

export async function reopenDailyClosingAction(input: unknown): Promise<ActionResult<DailyClosingRecord>> {
  let user;
  try {
    user = await requirePermissionAction(PERMISSIONS.ACCOUNTING_DAILY_CLOSING_REOPEN);
  } catch (error) {
    if (error instanceof AuthorizationError) return { ok: false, error: error.message };
    throw error;
  }

  const parsed = reopenDailyClosingSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "A reason is required." };

  try {
    const result = await reopenDailyClosing(parsed.data, user.id);
    revalidatePath("/accounting/daily-closing");
    revalidatePath("/accounting");
    return { ok: true, data: result };
  } catch (error) {
    if (
      error instanceof DailyClosingNotFoundError ||
      error instanceof DailyClosingNotClosedError ||
      error instanceof EmptyReopenReasonError
    ) {
      return { ok: false, error: error.message };
    }
    throw error;
  }
}
