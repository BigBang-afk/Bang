"use server";

import { revalidatePath } from "next/cache";
import { requireUser, assertPermission } from "@/lib/auth/dal";
import { PERMISSIONS, AuthorizationError } from "@/lib/auth/permissions";
import {
  createKarigarSchema,
  updateKarigarSchema,
  changeKarigarStatusSchema,
  giveGoldToKarigarSchema,
  receiveGoldFromKarigarSchema,
  classifyGoldJobDifferenceSchema,
  recordKarigarCashTransactionSchema,
} from "@/lib/validation/karigars";
import {
  createKarigar,
  updateKarigar,
  changeKarigarStatus,
  searchKarigars,
  DuplicateKarigarPhoneError,
  type KarigarRow,
} from "@/services/karigar.service";
import {
  giveGoldToKarigar,
  receiveGoldFromKarigar,
  classifyGoldJobDifference,
  KarigarNotFoundForJobError,
  KarigarBlockedError,
  GoldJobNotFoundError,
  GoldJobAlreadyReceivedError,
  InvalidGoldWeightError,
  type ReceiveGoldFromKarigarResult,
} from "@/services/karigar-job.service";
import { recordKarigarCashTransaction } from "@/services/karigar-cash.service";
import type { ActionResult } from "@/lib/actions/action-result";

async function requirePermissionAction(key: (typeof PERMISSIONS)[keyof typeof PERMISSIONS]) {
  const user = await requireUser();
  await assertPermission(user, key);
  return user;
}

export async function searchKarigarsAction(query: string): Promise<ActionResult<KarigarRow[]>> {
  try {
    await requirePermissionAction(PERMISSIONS.KARIGARS_VIEW);
  } catch (error) {
    if (error instanceof AuthorizationError) return { ok: false, error: error.message };
    throw error;
  }

  const rows = await searchKarigars(query);
  return { ok: true, data: rows };
}

export async function createKarigarAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  let user;
  try {
    user = await requirePermissionAction(PERMISSIONS.KARIGARS_MANAGE);
  } catch (error) {
    if (error instanceof AuthorizationError) return { ok: false, error: error.message };
    throw error;
  }

  const parsed = createKarigarSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid karigar details." };
  }

  try {
    const karigar = await createKarigar(parsed.data, user.id);
    revalidatePath("/karigars");
    return { ok: true, data: { id: karigar.id } };
  } catch (error) {
    if (error instanceof DuplicateKarigarPhoneError) return { ok: false, error: error.message };
    throw error;
  }
}

export async function updateKarigarAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  let user;
  try {
    user = await requirePermissionAction(PERMISSIONS.KARIGARS_MANAGE);
  } catch (error) {
    if (error instanceof AuthorizationError) return { ok: false, error: error.message };
    throw error;
  }

  const parsed = updateKarigarSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid karigar details." };
  }

  try {
    await updateKarigar(parsed.data, user.id);
    revalidatePath("/karigars");
    revalidatePath(`/karigars/${parsed.data.id}`);
    return { ok: true, data: { id: parsed.data.id } };
  } catch (error) {
    if (error instanceof DuplicateKarigarPhoneError) return { ok: false, error: error.message };
    throw error;
  }
}

export async function changeKarigarStatusAction(input: unknown): Promise<ActionResult<{ ok: true }>> {
  let user;
  try {
    user = await requirePermissionAction(PERMISSIONS.KARIGARS_MANAGE);
  } catch (error) {
    if (error instanceof AuthorizationError) return { ok: false, error: error.message };
    throw error;
  }

  const parsed = changeKarigarStatusSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Select a valid status." };

  await changeKarigarStatus(parsed.data.id, parsed.data.status, user.id);
  revalidatePath("/karigars");
  revalidatePath(`/karigars/${parsed.data.id}`);
  return { ok: true, data: { ok: true } };
}

export async function giveGoldToKarigarAction(input: unknown): Promise<ActionResult<{ jobId: string }>> {
  let user;
  try {
    user = await requirePermissionAction(PERMISSIONS.KARIGARS_GOLD);
  } catch (error) {
    if (error instanceof AuthorizationError) return { ok: false, error: error.message };
    throw error;
  }

  const parsed = giveGoldToKarigarSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid gold-given details." };
  }

  try {
    const result = await giveGoldToKarigar(parsed.data, user.id);
    revalidatePath(`/karigars/${parsed.data.karigarId}`);
    revalidatePath("/gold-ledger");
    return { ok: true, data: result };
  } catch (error) {
    if (
      error instanceof KarigarNotFoundForJobError ||
      error instanceof KarigarBlockedError ||
      error instanceof InvalidGoldWeightError
    ) {
      return { ok: false, error: error.message };
    }
    throw error;
  }
}

export async function receiveGoldFromKarigarAction(
  input: unknown,
): Promise<ActionResult<ReceiveGoldFromKarigarResult>> {
  let user;
  try {
    user = await requirePermissionAction(PERMISSIONS.KARIGARS_GOLD);
  } catch (error) {
    if (error instanceof AuthorizationError) return { ok: false, error: error.message };
    throw error;
  }

  const parsed = receiveGoldFromKarigarSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid gold-received details." };
  }

  try {
    const result = await receiveGoldFromKarigar(parsed.data, user.id);
    revalidatePath("/karigars");
    revalidatePath("/gold-ledger");
    return { ok: true, data: result };
  } catch (error) {
    if (
      error instanceof GoldJobNotFoundError ||
      error instanceof GoldJobAlreadyReceivedError ||
      error instanceof InvalidGoldWeightError
    ) {
      return { ok: false, error: error.message };
    }
    throw error;
  }
}

export async function classifyGoldJobDifferenceAction(input: unknown): Promise<ActionResult<{ ok: true }>> {
  let user;
  try {
    user = await requirePermissionAction(PERMISSIONS.KARIGARS_GOLD);
  } catch (error) {
    if (error instanceof AuthorizationError) return { ok: false, error: error.message };
    throw error;
  }

  const parsed = classifyGoldJobDifferenceSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid classification." };
  }

  try {
    await classifyGoldJobDifference(parsed.data.jobId, parsed.data.classification, user.id);
    revalidatePath("/karigars");
    return { ok: true, data: { ok: true } };
  } catch (error) {
    if (error instanceof GoldJobNotFoundError) return { ok: false, error: error.message };
    throw error;
  }
}

export async function recordKarigarCashTransactionAction(
  input: unknown,
): Promise<ActionResult<{ balanceAfter: string }>> {
  let user;
  try {
    user = await requirePermissionAction(PERMISSIONS.KARIGARS_CASH);
  } catch (error) {
    if (error instanceof AuthorizationError) return { ok: false, error: error.message };
    throw error;
  }

  const parsed = recordKarigarCashTransactionSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid cash transaction." };
  }

  const result = await recordKarigarCashTransaction(parsed.data, user.id);
  revalidatePath(`/karigars/${parsed.data.karigarId}`);
  revalidatePath("/cash-management");
  return { ok: true, data: result };
}
