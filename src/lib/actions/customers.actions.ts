"use server";

import { revalidatePath } from "next/cache";
import { requireUser, assertPermission } from "@/lib/auth/dal";
import { PERMISSIONS, AuthorizationError } from "@/lib/auth/permissions";
import {
  createCustomerSchema,
  updateCustomerSchema,
  duplicateCheckSchema,
  changeCustomerStatusSchema,
  changeCustomerTypeSchema,
  addCustomerNoteSchema,
  updateCustomerNoteSchema,
  recordCustomerPaymentSchema,
  customerPreferenceSchema,
} from "@/lib/validation/customers";
import {
  createCustomer,
  updateCustomer,
  archiveCustomer,
  changeCustomerStatus,
  changeCustomerType,
  findPossibleDuplicates,
  exportAllCustomers,
  DuplicateCustomerPhoneError,
  CustomerNotFoundError,
  type PossibleDuplicateCustomer,
} from "@/services/customer.service";
import {
  addCustomerNote,
  updateCustomerNote,
  CustomerNoteNotFoundError,
} from "@/services/customer-notes.service";
import { upsertCustomerPreference } from "@/services/customer-preference.service";
import {
  recordCustomerPayment,
  InvalidPaymentAmountError,
  CreditNotAValidPaymentMethodError,
  OverpaymentNotAllowedError,
  CustomerNotFoundForPaymentError,
  type RecordedCustomerPayment,
} from "@/services/customer-payment.service";
import { writeAuditLog } from "@/services/audit.service";
import type { ActionResult } from "@/lib/actions/action-result";

async function requirePermissionAction(key: (typeof PERMISSIONS)[keyof typeof PERMISSIONS]) {
  const user = await requireUser();
  await assertPermission(user, key);
  return user;
}

function parseOptionalDate(value: string | undefined): Date | undefined {
  return value ? new Date(value) : undefined;
}

export async function createCustomerAction(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  let user;
  try {
    user = await requirePermissionAction(PERMISSIONS.CUSTOMERS_CREATE);
  } catch (error) {
    if (error instanceof AuthorizationError) return { ok: false, error: error.message };
    throw error;
  }

  const parsed = createCustomerSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid customer details." };
  }

  try {
    const customer = await createCustomer(
      {
        ...parsed.data,
        dateOfBirth: parseOptionalDate(parsed.data.dateOfBirth),
        anniversaryDate: parseOptionalDate(parsed.data.anniversaryDate),
      },
      user.id,
    );
    revalidatePath("/customers");
    revalidatePath("/dashboard");
    return { ok: true, data: { id: customer.id } };
  } catch (error) {
    if (error instanceof DuplicateCustomerPhoneError) return { ok: false, error: error.message };
    throw error;
  }
}

export async function updateCustomerAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  let user;
  try {
    user = await requirePermissionAction(PERMISSIONS.CUSTOMERS_MANAGE);
  } catch (error) {
    if (error instanceof AuthorizationError) return { ok: false, error: error.message };
    throw error;
  }

  const parsed = updateCustomerSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid customer details." };
  }

  try {
    await updateCustomer(
      {
        ...parsed.data,
        dateOfBirth: parseOptionalDate(parsed.data.dateOfBirth),
        anniversaryDate: parseOptionalDate(parsed.data.anniversaryDate),
      },
      user.id,
    );
    revalidatePath("/customers");
    revalidatePath(`/customers/${parsed.data.id}`);
    return { ok: true, data: { id: parsed.data.id } };
  } catch (error) {
    if (error instanceof DuplicateCustomerPhoneError) return { ok: false, error: error.message };
    throw error;
  }
}

export async function findPossibleDuplicatesAction(input: {
  phone: string;
  secondaryPhone?: string;
  email?: string;
}): Promise<ActionResult<PossibleDuplicateCustomer[]>> {
  try {
    await requirePermissionAction(PERMISSIONS.CUSTOMERS_CREATE);
  } catch (error) {
    if (error instanceof AuthorizationError) return { ok: false, error: error.message };
    throw error;
  }

  const parsed = duplicateCheckSchema.safeParse(input);
  if (!parsed.success) return { ok: true, data: [] };

  const matches = await findPossibleDuplicates(parsed.data);
  return { ok: true, data: matches };
}

export async function archiveCustomerAction(customerId: string): Promise<ActionResult<{ ok: true }>> {
  let user;
  try {
    user = await requirePermissionAction(PERMISSIONS.CUSTOMERS_MANAGE);
  } catch (error) {
    if (error instanceof AuthorizationError) return { ok: false, error: error.message };
    throw error;
  }

  await archiveCustomer(customerId, user.id);
  revalidatePath("/customers");
  revalidatePath(`/customers/${customerId}`);
  return { ok: true, data: { ok: true } };
}

export async function changeCustomerStatusAction(input: unknown): Promise<ActionResult<{ ok: true }>> {
  let user;
  try {
    user = await requirePermissionAction(PERMISSIONS.CUSTOMERS_MANAGE);
  } catch (error) {
    if (error instanceof AuthorizationError) return { ok: false, error: error.message };
    throw error;
  }

  const parsed = changeCustomerStatusSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Select a valid status." };

  await changeCustomerStatus(parsed.data.id, parsed.data.status, user.id);
  revalidatePath("/customers");
  revalidatePath(`/customers/${parsed.data.id}`);
  return { ok: true, data: { ok: true } };
}

export async function changeCustomerTypeAction(input: unknown): Promise<ActionResult<{ ok: true }>> {
  let user;
  try {
    user = await requirePermissionAction(PERMISSIONS.CUSTOMERS_MANAGE);
  } catch (error) {
    if (error instanceof AuthorizationError) return { ok: false, error: error.message };
    throw error;
  }

  const parsed = changeCustomerTypeSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Select a valid customer type." };

  await changeCustomerType(parsed.data.id, parsed.data.customerType, user.id);
  revalidatePath("/customers");
  revalidatePath(`/customers/${parsed.data.id}`);
  return { ok: true, data: { ok: true } };
}

export async function addCustomerNoteAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  let user;
  try {
    user = await requirePermissionAction(PERMISSIONS.CUSTOMERS_NOTES);
  } catch (error) {
    if (error instanceof AuthorizationError) return { ok: false, error: error.message };
    throw error;
  }

  const parsed = addCustomerNoteSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid note." };
  }

  const note = await addCustomerNote(parsed.data.customerId, parsed.data.note, user.id);
  revalidatePath(`/customers/${parsed.data.customerId}`);
  return { ok: true, data: note };
}

export async function updateCustomerNoteAction(input: unknown): Promise<ActionResult<{ ok: true }>> {
  let user;
  try {
    user = await requirePermissionAction(PERMISSIONS.CUSTOMERS_NOTES);
  } catch (error) {
    if (error instanceof AuthorizationError) return { ok: false, error: error.message };
    throw error;
  }

  const parsed = updateCustomerNoteSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid note." };
  }

  try {
    await updateCustomerNote(parsed.data.id, parsed.data.note, user.id);
    return { ok: true, data: { ok: true } };
  } catch (error) {
    if (error instanceof CustomerNoteNotFoundError) return { ok: false, error: error.message };
    throw error;
  }
}

export async function upsertCustomerPreferenceAction(input: unknown): Promise<ActionResult<{ ok: true }>> {
  try {
    await requirePermissionAction(PERMISSIONS.CUSTOMERS_MANAGE);
  } catch (error) {
    if (error instanceof AuthorizationError) return { ok: false, error: error.message };
    throw error;
  }

  const parsed = customerPreferenceSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid preferences." };
  }

  await upsertCustomerPreference(parsed.data.customerId, parsed.data);
  revalidatePath(`/customers/${parsed.data.customerId}`);
  return { ok: true, data: { ok: true } };
}

export async function recordCustomerPaymentAction(
  input: unknown,
): Promise<ActionResult<RecordedCustomerPayment>> {
  let user;
  try {
    user = await requirePermissionAction(PERMISSIONS.CUSTOMERS_PAYMENT);
  } catch (error) {
    if (error instanceof AuthorizationError) return { ok: false, error: error.message };
    throw error;
  }

  const parsed = recordCustomerPaymentSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid payment." };
  }

  try {
    const result = await recordCustomerPayment(parsed.data, user.id);
    revalidatePath(`/customers/${parsed.data.customerId}`);
    revalidatePath("/customers/ledger");
    return { ok: true, data: result };
  } catch (error) {
    if (
      error instanceof InvalidPaymentAmountError ||
      error instanceof CreditNotAValidPaymentMethodError ||
      error instanceof OverpaymentNotAllowedError ||
      error instanceof CustomerNotFoundForPaymentError
    ) {
      return { ok: false, error: error.message };
    }
    throw error;
  }
}

export async function exportCustomersAction(): Promise<ActionResult<string>> {
  let user;
  try {
    user = await requirePermissionAction(PERMISSIONS.CUSTOMERS_EXPORT);
  } catch (error) {
    if (error instanceof AuthorizationError) return { ok: false, error: error.message };
    throw error;
  }

  const rows = await exportAllCustomers();

  const header = [
    "Customer Code",
    "Name",
    "Phone",
    "Email",
    "City",
    "Customer Type",
    "Total Purchases",
    "Total Spending",
    "Outstanding Balance",
    "Last Purchase",
  ];
  const lines = [header.join(",")];
  for (const row of rows) {
    const cells = [
      row.customerCode,
      row.name,
      row.phone,
      row.email ?? "",
      row.city ?? "",
      row.customerType,
      String(row.purchaseCount),
      row.totalSpending,
      row.outstandingBalance,
      row.lastPurchaseAt ? row.lastPurchaseAt.toISOString().slice(0, 10) : "",
    ];
    lines.push(cells.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","));
  }

  await writeAuditLog({
    userId: user.id,
    action: "CUSTOMER_EXPORTED",
    entity: "Customer",
    entityId: null,
    metadata: { rowCount: rows.length },
  });

  return { ok: true, data: lines.join("\n") };
}

export { CustomerNotFoundError };
