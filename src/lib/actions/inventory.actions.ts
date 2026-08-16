"use server";

import { revalidatePath } from "next/cache";
import type { z } from "zod";
import { requireUser, assertPermission } from "@/lib/auth/dal";
import { PERMISSIONS, AuthorizationError } from "@/lib/auth/permissions";
import {
  createInventoryItemSchema,
  updateInventoryItemSchema,
  changeStatusSchema,
} from "@/lib/validation/inventory";
import {
  createInventoryItem,
  updateInventoryItem,
  changeInventoryItemStatus,
  archiveInventoryItem,
  recordBarcodePrint,
  getInventoryItemById,
  InvalidStatusTransitionError,
} from "@/services/inventory-item.service";
import { LowerPriceConfirmationRequiredError } from "@/types/inventory";
import { saveProductImage, deleteProductImage, ProductImageError } from "@/lib/uploads/product-image";

export type InventoryItemFormState =
  | {
      error?: string;
      fieldErrors?: Record<string, string>;
      requiresPriceConfirmation?: boolean;
      success?: boolean;
      itemId?: string;
      barcodeCode?: string;
    }
  | undefined;

function collectFieldErrors(error: z.ZodError): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path[0];
    if (typeof key === "string" && !fieldErrors[key]) {
      fieldErrors[key] = issue.message;
    }
  }
  return fieldErrors;
}

function extractInventoryFields(formData: FormData) {
  return {
    productName: formData.get("productName"),
    categoryId: formData.get("categoryId"),
    subcategory: formData.get("subcategory"),
    designNumber: formData.get("designNumber"),
    supplier: formData.get("supplier"),
    karigar: formData.get("karigar"),
    notes: formData.get("notes"),
    purity: formData.get("purity"),
    netWeight: formData.get("netWeight"),
    goldRate: formData.get("goldRate"),
    wastageType: formData.get("wastageType"),
    wastagePercent: formData.get("wastagePercent") || undefined,
    wastageGrams: formData.get("wastageGrams") || undefined,
    makingCharge: formData.get("makingCharge") || undefined,
    stoneCharge: formData.get("stoneCharge") || undefined,
    diamondCharge: formData.get("diamondCharge") || undefined,
    otherCharge: formData.get("otherCharge") || undefined,
    sellingPrice: formData.get("sellingPrice"),
    confirmLowerPrice: formData.get("confirmLowerPrice") || undefined,
  };
}

export async function createInventoryItemAction(
  _prevState: InventoryItemFormState,
  formData: FormData,
): Promise<InventoryItemFormState> {
  const user = await requireUser();
  try {
    await assertPermission(user, PERMISSIONS.INVENTORY_MANAGE);
  } catch (error) {
    if (error instanceof AuthorizationError) return { error: error.message };
    throw error;
  }

  const parsed = createInventoryItemSchema.safeParse(extractInventoryFields(formData));
  if (!parsed.success) {
    return { error: "Please fix the highlighted fields.", fieldErrors: collectFieldErrors(parsed.error) };
  }

  let imageUrl: string | undefined;
  const imageFile = formData.get("image");
  if (imageFile instanceof File && imageFile.size > 0) {
    try {
      imageUrl = await saveProductImage(imageFile);
    } catch (error) {
      if (error instanceof ProductImageError) {
        return { error: error.message, fieldErrors: { image: error.message } };
      }
      throw error;
    }
  }

  try {
    const created = await createInventoryItem({ ...parsed.data, imageUrl }, user.id);
    revalidatePath("/inventory");
    revalidatePath("/inventory/old-stock");
    revalidatePath("/dashboard");
    return { success: true, itemId: created.id, barcodeCode: created.barcodeCode };
  } catch (error) {
    if (error instanceof LowerPriceConfirmationRequiredError) {
      return { error: error.message, requiresPriceConfirmation: true };
    }
    throw error;
  }
}

export async function updateInventoryItemAction(
  _prevState: InventoryItemFormState,
  formData: FormData,
): Promise<InventoryItemFormState> {
  const user = await requireUser();
  try {
    await assertPermission(user, PERMISSIONS.INVENTORY_MANAGE);
  } catch (error) {
    if (error instanceof AuthorizationError) return { error: error.message };
    throw error;
  }

  const id = formData.get("id");
  if (typeof id !== "string" || !id) {
    return { error: "Missing stock item id." };
  }

  const parsed = updateInventoryItemSchema.safeParse({
    ...extractInventoryFields(formData),
    id,
    removeImage: formData.get("removeImage") || undefined,
  });
  if (!parsed.success) {
    return { error: "Please fix the highlighted fields.", fieldErrors: collectFieldErrors(parsed.error) };
  }

  const existing = await getInventoryItemById(id);
  if (!existing) {
    return { error: "Stock item not found." };
  }

  let imageUrl: string | undefined;
  const imageFile = formData.get("image");
  if (imageFile instanceof File && imageFile.size > 0) {
    try {
      imageUrl = await saveProductImage(imageFile);
    } catch (error) {
      if (error instanceof ProductImageError) {
        return { error: error.message, fieldErrors: { image: error.message } };
      }
      throw error;
    }
  }

  try {
    await updateInventoryItem({ ...parsed.data, imageUrl }, user.id);
    if ((imageUrl || parsed.data.removeImage) && existing.product.imageUrl) {
      await deleteProductImage(existing.product.imageUrl);
    }
    revalidatePath("/inventory");
    revalidatePath(`/inventory/${id}`);
    return { success: true, itemId: id };
  } catch (error) {
    if (error instanceof LowerPriceConfirmationRequiredError) {
      return { error: error.message, requiresPriceConfirmation: true };
    }
    // Undo the just-saved upload so it doesn't leak as an orphaned file.
    if (imageUrl) await deleteProductImage(imageUrl);
    throw error;
  }
}

export type ChangeStatusState = { error?: string; success?: boolean } | undefined;

export async function changeStockStatusAction(
  _prevState: ChangeStatusState,
  formData: FormData,
): Promise<ChangeStatusState> {
  const user = await requireUser();
  try {
    await assertPermission(user, PERMISSIONS.INVENTORY_MANAGE);
  } catch (error) {
    if (error instanceof AuthorizationError) return { error: error.message };
    throw error;
  }

  const parsed = changeStatusSchema.safeParse({
    id: formData.get("id"),
    newStatus: formData.get("newStatus"),
    notes: formData.get("notes") || undefined,
  });
  if (!parsed.success) {
    return { error: "Select a valid status." };
  }

  try {
    await changeInventoryItemStatus(parsed.data.id, parsed.data.newStatus, user.id, parsed.data.notes);
  } catch (error) {
    if (error instanceof InvalidStatusTransitionError) return { error: error.message };
    throw error;
  }

  revalidatePath(`/inventory/${parsed.data.id}`);
  revalidatePath("/inventory");
  revalidatePath("/inventory/old-stock");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function archiveInventoryItemAction(
  inventoryItemId: string,
  notes?: string,
): Promise<{ ok: boolean; error?: string }> {
  const user = await requireUser();
  try {
    await assertPermission(user, PERMISSIONS.INVENTORY_MANAGE);
  } catch (error) {
    if (error instanceof AuthorizationError) return { ok: false, error: error.message };
    throw error;
  }

  await archiveInventoryItem(inventoryItemId, user.id, notes);
  revalidatePath("/inventory");
  revalidatePath(`/inventory/${inventoryItemId}`);
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function recordBarcodePrintAction(
  inventoryItemId: string,
): Promise<{ ok: boolean; error?: string }> {
  const user = await requireUser();
  try {
    await assertPermission(user, PERMISSIONS.BARCODE_PRINT);
  } catch (error) {
    if (error instanceof AuthorizationError) return { ok: false, error: error.message };
    throw error;
  }

  await recordBarcodePrint(inventoryItemId, user.id);
  revalidatePath(`/inventory/${inventoryItemId}`);
  return { ok: true };
}

export async function recordBarcodePrintsAction(
  inventoryItemIds: string[],
): Promise<{ ok: boolean; error?: string }> {
  const user = await requireUser();
  try {
    await assertPermission(user, PERMISSIONS.BARCODE_PRINT);
  } catch (error) {
    if (error instanceof AuthorizationError) return { ok: false, error: error.message };
    throw error;
  }

  for (const id of inventoryItemIds) {
    await recordBarcodePrint(id, user.id);
  }
  revalidatePath("/inventory/barcodes");
  return { ok: true };
}
