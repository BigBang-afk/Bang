import "server-only";
import type Decimal from "decimal.js";
import { prisma } from "@/lib/db/prisma";
import { writeAuditLog } from "@/services/audit.service";
import type { Prisma } from "@/generated/prisma/client";

type PrismaTx = Prisma.TransactionClient;

export type CustomerRow = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  outstandingBalance: Prisma.Decimal;
  purchaseCount: number;
};

const CUSTOMER_ROW_SELECT = {
  id: true,
  name: true,
  phone: true,
  email: true,
  outstandingBalance: true,
  _count: { select: { sales: true } },
} satisfies Prisma.CustomerSelect;

function toCustomerRow(row: {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  outstandingBalance: Prisma.Decimal;
  _count: { sales: number };
}): CustomerRow {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    email: row.email,
    outstandingBalance: row.outstandingBalance,
    purchaseCount: row._count.sales,
  };
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Search by name, phone, or exact customer ID — never fetches every customer into the browser. */
export async function searchCustomers(query: string, limit = 10): Promise<CustomerRow[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const where: Prisma.CustomerWhereInput = UUID_PATTERN.test(trimmed)
    ? { id: trimmed }
    : {
        OR: [
          { name: { contains: trimmed, mode: "insensitive" } },
          { phone: { contains: trimmed } },
        ],
      };

  const rows = await prisma.customer.findMany({
    where,
    select: CUSTOMER_ROW_SELECT,
    orderBy: { name: "asc" },
    take: limit,
  });
  return rows.map(toCustomerRow);
}

export async function getCustomerById(id: string): Promise<CustomerRow | null> {
  const row = await prisma.customer.findUnique({ where: { id }, select: CUSTOMER_ROW_SELECT });
  return row ? toCustomerRow(row) : null;
}

/** Plain-string projection — Decimal instances cannot cross a Server Action
 * reply into a Client Component any more than they can cross as page props. */
export type CustomerSearchResult = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  outstandingBalance: string;
  purchaseCount: number;
};

export function toCustomerSearchResult(row: CustomerRow): CustomerSearchResult {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    email: row.email,
    outstandingBalance: row.outstandingBalance.toString(),
    purchaseCount: row.purchaseCount,
  };
}

export class DuplicateCustomerPhoneError extends Error {
  constructor() {
    super("A customer with this phone number already exists.");
    this.name = "DuplicateCustomerPhoneError";
  }
}

export async function createCustomer(
  input: { name: string; phone: string; email?: string; notes?: string },
  createdById: string,
): Promise<CustomerRow> {
  const existing = await prisma.customer.findUnique({ where: { phone: input.phone } });
  if (existing) throw new DuplicateCustomerPhoneError();

  const customer = await prisma.customer.create({
    data: {
      name: input.name,
      phone: input.phone,
      email: input.email || null,
      notes: input.notes || null,
      createdById,
    },
  });

  await writeAuditLog({
    userId: createdById,
    action: "CUSTOMER_CREATED",
    entity: "Customer",
    entityId: customer.id,
    metadata: { name: customer.name, phone: customer.phone },
  });

  return {
    id: customer.id,
    name: customer.name,
    phone: customer.phone,
    email: customer.email,
    outstandingBalance: customer.outstandingBalance,
    purchaseCount: 0,
  };
}

/**
 * Adds to a customer's running outstanding balance — always called from
 * inside the same transaction as the Sale that created the credit. Phase 3
 * never decrements this (no "customer pays down credit" flow yet); see
 * SALES.md "Customer credit".
 */
export async function increaseCustomerOutstandingBalance(
  tx: PrismaTx,
  customerId: string,
  amount: string | number | Decimal,
): Promise<void> {
  await tx.customer.update({
    where: { id: customerId },
    data: { outstandingBalance: { increment: amount } },
  });
}
