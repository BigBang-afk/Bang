"use server";

import { revalidatePath } from "next/cache";
import { requireUser, assertPermission } from "@/lib/auth/dal";
import { PERMISSIONS, AuthorizationError } from "@/lib/auth/permissions";
import {
  createSupplierSchema,
  updateSupplierSchema,
  changeSupplierStatusSchema,
  recordSupplierPaymentSchema,
} from "@/lib/validation/suppliers";
import {
  createSupplier,
  updateSupplier,
  changeSupplierStatus,
  searchSuppliers,
  DuplicateSupplierPhoneError,
  type SupplierRow,
} from "@/services/supplier.service";
import { recordSupplierPayment } from "@/services/supplier-payment.service";
import type { ActionResult } from "@/lib/actions/action-result";

async function requirePermissionAction(key: (typeof PERMISSIONS)[keyof typeof PERMISSIONS]) {
  const user = await requireUser();
  await assertPermission(user, key);
  return user;
}

export async function searchSuppliersAction(query: string): Promise<ActionResult<SupplierRow[]>> {
  try {
    await requirePermissionAction(PERMISSIONS.SUPPLIERS_VIEW);
  } catch (error) {
    if (error instanceof AuthorizationError) return { ok: false, error: error.message };
    throw error;
  }

  const rows = await searchSuppliers(query);
  return { ok: true, data: rows };
}

export async function createSupplierAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  let user;
  try {
    user = await requirePermissionAction(PERMISSIONS.SUPPLIERS_MANAGE);
  } catch (error) {
    if (error instanceof AuthorizationError) return { ok: false, error: error.message };
    throw error;
  }

  const parsed = createSupplierSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid supplier details." };
  }

  try {
    const supplier = await createSupplier(parsed.data, user.id);
    revalidatePath("/suppliers");
    return { ok: true, data: { id: supplier.id } };
  } catch (error) {
    if (error instanceof DuplicateSupplierPhoneError) return { ok: false, error: error.message };
    throw error;
  }
}

export async function updateSupplierAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  let user;
  try {
    user = await requirePermissionAction(PERMISSIONS.SUPPLIERS_MANAGE);
  } catch (error) {
    if (error instanceof AuthorizationError) return { ok: false, error: error.message };
    throw error;
  }

  const parsed = updateSupplierSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid supplier details." };
  }

  try {
    await updateSupplier(parsed.data, user.id);
    revalidatePath("/suppliers");
    revalidatePath(`/suppliers/${parsed.data.id}`);
    return { ok: true, data: { id: parsed.data.id } };
  } catch (error) {
    if (error instanceof DuplicateSupplierPhoneError) return { ok: false, error: error.message };
    throw error;
  }
}

export async function changeSupplierStatusAction(input: unknown): Promise<ActionResult<{ ok: true }>> {
  let user;
  try {
    user = await requirePermissionAction(PERMISSIONS.SUPPLIERS_MANAGE);
  } catch (error) {
    if (error instanceof AuthorizationError) return { ok: false, error: error.message };
    throw error;
  }

  const parsed = changeSupplierStatusSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Select a valid status." };

  await changeSupplierStatus(parsed.data.id, parsed.data.status, user.id);
  revalidatePath("/suppliers");
  revalidatePath(`/suppliers/${parsed.data.id}`);
  return { ok: true, data: { ok: true } };
}

export async function recordSupplierPaymentAction(
  input: unknown,
): Promise<ActionResult<{ balanceAfter: string }>> {
  let user;
  try {
    user = await requirePermissionAction(PERMISSIONS.CASH_MANAGE);
  } catch (error) {
    if (error instanceof AuthorizationError) return { ok: false, error: error.message };
    throw error;
  }

  const parsed = recordSupplierPaymentSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid payment." };
  }

  const result = await recordSupplierPayment(parsed.data, user.id);
  revalidatePath(`/suppliers/${parsed.data.supplierId}`);
  revalidatePath("/cash-management");
  return { ok: true, data: result };
}
