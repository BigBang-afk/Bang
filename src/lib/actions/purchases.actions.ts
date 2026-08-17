"use server";

import { revalidatePath } from "next/cache";
import { requireUser, assertPermission } from "@/lib/auth/dal";
import { PERMISSIONS, AuthorizationError } from "@/lib/auth/permissions";
import { createPurchaseSchema } from "@/lib/validation/purchases";
import {
  createPurchase,
  SupplierNotFoundForPurchaseError,
  EmptyPurchaseError,
  PurchaseOverpaymentError,
  MissingSellingPriceError,
} from "@/services/purchase.service";
import type { ActionResult } from "@/lib/actions/action-result";

async function requirePermissionAction(key: (typeof PERMISSIONS)[keyof typeof PERMISSIONS]) {
  const user = await requireUser();
  await assertPermission(user, key);
  return user;
}

export async function createPurchaseAction(
  input: unknown,
): Promise<ActionResult<{ purchaseId: string; purchaseNumber: string }>> {
  let user;
  try {
    user = await requirePermissionAction(PERMISSIONS.PURCHASES_CREATE);
  } catch (error) {
    if (error instanceof AuthorizationError) return { ok: false, error: error.message };
    throw error;
  }

  const parsed = createPurchaseSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid purchase details." };
  }

  try {
    const result = await createPurchase(
      { ...parsed.data, purchaseDate: parsed.data.purchaseDate ? new Date(parsed.data.purchaseDate) : undefined },
      user.id,
    );
    revalidatePath("/purchases");
    revalidatePath("/inventory");
    revalidatePath(`/suppliers/${parsed.data.supplierId}`);
    return { ok: true, data: result };
  } catch (error) {
    if (
      error instanceof SupplierNotFoundForPurchaseError ||
      error instanceof EmptyPurchaseError ||
      error instanceof PurchaseOverpaymentError ||
      error instanceof MissingSellingPriceError
    ) {
      return { ok: false, error: error.message };
    }
    throw error;
  }
}
