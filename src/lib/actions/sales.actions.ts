"use server";

import { revalidatePath } from "next/cache";
import { requireUser, assertPermission } from "@/lib/auth/dal";
import { PERMISSIONS, AuthorizationError } from "@/lib/auth/permissions";
import {
  barcodeLookupSchema,
  posSearchSchema,
  completeSaleSchema,
  quickCreateCustomerSchema,
  customerSearchSchema,
  requestReturnSchema,
  approveReturnSchema,
} from "@/lib/validation/sales";
import {
  getInventoryItemByBarcode,
  searchInventoryForSale,
  toPosCatalogItem,
} from "@/services/inventory-item.service";
import {
  completeSale,
  InventoryUnavailableError,
  CustomerNotFoundError,
} from "@/services/sale-transaction.service";
import { SalePricingError } from "@/services/sale-pricing.service";
import {
  searchCustomers,
  createCustomer,
  toCustomerSearchResult,
  DuplicateCustomerPhoneError,
} from "@/services/customer.service";
import {
  requestReturn,
  approveReturn,
  ReturnNotFoundError,
  ReturnAlreadyExistsError,
  ReturnAlreadyProcessedError,
  SaleItemNotSoldError,
} from "@/services/returns.service";
import { recordInvoicePrint, recordInvoiceDownload } from "@/services/sale.service";
import { previewCart, previewPaymentBalance } from "@/services/sale-preview.service";
import type {
  PosCatalogItem,
  CompleteSaleInput,
  CompletedSale,
  SaleCartItemInput,
  SalePaymentInput,
} from "@/types/sales";
import type { CustomerSearchResult } from "@/services/customer.service";
import type { CartPreview, PaymentBalancePreview } from "@/services/sale-preview.service";
import type { ActionResult } from "@/lib/actions/action-result";

async function requireSalesCreate() {
  const user = await requireUser();
  await assertPermission(user, PERMISSIONS.SALES_CREATE);
  return user;
}

export async function lookupBarcodeForSaleAction(code: string): Promise<ActionResult<PosCatalogItem | null>> {
  try {
    await requireSalesCreate();
  } catch (error) {
    if (error instanceof AuthorizationError) return { ok: false, error: error.message };
    throw error;
  }

  const parsed = barcodeLookupSchema.safeParse({ code });
  if (!parsed.success) return { ok: false, error: "Enter or scan a barcode." };

  const item = await getInventoryItemByBarcode(parsed.data.code);
  return { ok: true, data: item ? toPosCatalogItem(item) : null };
}

export async function searchProductsForSaleAction(query: string): Promise<ActionResult<PosCatalogItem[]>> {
  try {
    await requireSalesCreate();
  } catch (error) {
    if (error instanceof AuthorizationError) return { ok: false, error: error.message };
    throw error;
  }

  const parsed = posSearchSchema.safeParse({ query });
  if (!parsed.success) return { ok: true, data: [] };

  const items = await searchInventoryForSale(parsed.data.query);
  return { ok: true, data: items };
}

export async function previewCartAction(items: SaleCartItemInput[]): Promise<ActionResult<CartPreview>> {
  let user;
  try {
    user = await requireSalesCreate();
  } catch (error) {
    if (error instanceof AuthorizationError) return { ok: false, error: error.message };
    throw error;
  }

  const preview = await previewCart(items, user);
  return { ok: true, data: preview };
}

export async function previewPaymentBalanceAction(
  payments: SalePaymentInput[],
  grandTotal: string,
): Promise<ActionResult<PaymentBalancePreview>> {
  try {
    await requireSalesCreate();
  } catch (error) {
    if (error instanceof AuthorizationError) return { ok: false, error: error.message };
    throw error;
  }

  return { ok: true, data: previewPaymentBalance(payments, grandTotal) };
}

export async function completeSaleAction(input: CompleteSaleInput): Promise<ActionResult<CompletedSale>> {
  let user;
  try {
    user = await requireSalesCreate();
  } catch (error) {
    if (error instanceof AuthorizationError) return { ok: false, error: error.message };
    throw error;
  }

  const parsed = completeSaleSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid sale data." };
  }

  try {
    const sale = await completeSale(parsed.data, user);
    revalidatePath("/pos");
    revalidatePath("/pos/sales");
    revalidatePath("/inventory");
    revalidatePath("/dashboard");
    return { ok: true, data: sale };
  } catch (error) {
    if (
      error instanceof InventoryUnavailableError ||
      error instanceof CustomerNotFoundError ||
      error instanceof SalePricingError
    ) {
      return { ok: false, error: error.message };
    }
    throw error;
  }
}

export async function searchCustomersAction(
  query: string,
): Promise<ActionResult<CustomerSearchResult[]>> {
  try {
    await requireSalesCreate();
  } catch (error) {
    if (error instanceof AuthorizationError) return { ok: false, error: error.message };
    throw error;
  }

  const parsed = customerSearchSchema.safeParse({ query });
  if (!parsed.success) return { ok: true, data: [] };

  const rows = await searchCustomers(parsed.data.query);
  return { ok: true, data: rows.map(toCustomerSearchResult) };
}

export async function createCustomerAction(input: {
  firstName: string;
  lastName?: string;
  phone: string;
  email?: string;
}): Promise<ActionResult<CustomerSearchResult>> {
  let user;
  try {
    user = await requireSalesCreate();
  } catch (error) {
    if (error instanceof AuthorizationError) return { ok: false, error: error.message };
    throw error;
  }

  const parsed = quickCreateCustomerSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid customer details." };
  }

  try {
    const customer = await createCustomer(parsed.data, user.id);
    return { ok: true, data: toCustomerSearchResult(customer) };
  } catch (error) {
    if (error instanceof DuplicateCustomerPhoneError) return { ok: false, error: error.message };
    throw error;
  }
}

export async function requestReturnAction(input: {
  saleItemId: string;
  reason: string;
}): Promise<ActionResult<{ id: string }>> {
  let user;
  try {
    user = await requireUser();
    await assertPermission(user, PERMISSIONS.SALES_RETURN);
  } catch (error) {
    if (error instanceof AuthorizationError) return { ok: false, error: error.message };
    throw error;
  }

  const parsed = requestReturnSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid return request." };
  }

  try {
    const ret = await requestReturn(parsed.data.saleItemId, parsed.data.reason, user.id);
    revalidatePath("/pos/returns");
    return { ok: true, data: ret };
  } catch (error) {
    if (
      error instanceof ReturnAlreadyExistsError ||
      error instanceof SaleItemNotSoldError ||
      error instanceof ReturnNotFoundError
    ) {
      return { ok: false, error: error.message };
    }
    throw error;
  }
}

export async function approveReturnAction(input: {
  returnId: string;
  notes?: string;
}): Promise<ActionResult<{ ok: true }>> {
  let user;
  try {
    user = await requireUser();
    await assertPermission(user, PERMISSIONS.SALES_RETURN);
  } catch (error) {
    if (error instanceof AuthorizationError) return { ok: false, error: error.message };
    throw error;
  }

  const parsed = approveReturnSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid return." };
  }

  try {
    await approveReturn(parsed.data.returnId, user.id, parsed.data.notes);
    revalidatePath("/pos/returns");
    revalidatePath("/inventory");
    revalidatePath("/dashboard");
    return { ok: true, data: { ok: true } };
  } catch (error) {
    if (error instanceof ReturnNotFoundError || error instanceof ReturnAlreadyProcessedError) {
      return { ok: false, error: error.message };
    }
    throw error;
  }
}

export async function recordInvoicePrintAction(saleId: string): Promise<{ ok: boolean; error?: string }> {
  const user = await requireUser();
  try {
    await assertPermission(user, PERMISSIONS.SALES_VIEW);
  } catch (error) {
    if (error instanceof AuthorizationError) return { ok: false, error: error.message };
    throw error;
  }

  await recordInvoicePrint(saleId, user.id);
  return { ok: true };
}

export async function recordInvoiceDownloadAction(saleId: string): Promise<{ ok: boolean; error?: string }> {
  const user = await requireUser();
  try {
    await assertPermission(user, PERMISSIONS.SALES_VIEW);
  } catch (error) {
    if (error instanceof AuthorizationError) return { ok: false, error: error.message };
    throw error;
  }

  await recordInvoiceDownload(saleId, user.id);
  return { ok: true };
}
