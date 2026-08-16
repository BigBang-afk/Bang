import "server-only";
import type Decimal from "decimal.js";
import { prisma } from "@/lib/db/prisma";
import { writeAuditLog } from "@/services/audit.service";
import { formatCustomerCode, parseCustomerCode } from "@/lib/customer-code";
import { Prisma } from "@/generated/prisma/client";
import type { CustomerType, CustomerStatus } from "@/generated/prisma/client";

type PrismaTx = Prisma.TransactionClient;

/**
 * Customer identity/CRUD — see CUSTOMER-CRM.md. Financial fields
 * (outstandingBalance) are read here but only ever written by
 * customer-ledger.service.ts's appendCustomerLedgerEntry(); lifetime-value
 * and purchase-count stats live in customer-analytics.service.ts, computed
 * live from Sale rather than cached, so a later return/refund is always
 * reflected correctly (see CUSTOMER-CRM.md "Why spending isn't cached").
 */

export type CustomerRow = {
  id: string;
  customerCode: string;
  name: string;
  phone: string;
  email: string | null;
  customerType: CustomerType;
  status: CustomerStatus;
  outstandingBalance: Decimal;
  purchaseCount: number;
};

const CUSTOMER_ROW_SELECT = {
  id: true,
  customerCode: true,
  name: true,
  phone: true,
  email: true,
  customerType: true,
  status: true,
  outstandingBalance: true,
  _count: { select: { sales: true } },
} satisfies Prisma.CustomerSelect;

function toCustomerRow(row: {
  id: string;
  customerCode: number;
  name: string;
  phone: string;
  email: string | null;
  customerType: CustomerType;
  status: CustomerStatus;
  outstandingBalance: Prisma.Decimal;
  _count: { sales: number };
}): CustomerRow {
  return {
    id: row.id,
    customerCode: formatCustomerCode(row.customerCode),
    name: row.name,
    phone: row.phone,
    email: row.email,
    customerType: row.customerType,
    status: row.status,
    outstandingBalance: row.outstandingBalance,
    purchaseCount: row._count.sales,
  };
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Search by name, phone, customer code, or exact ID — used by the POS customer picker. */
export async function searchCustomers(query: string, limit = 10): Promise<CustomerRow[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const parsedCode = parseCustomerCode(trimmed);
  const where: Prisma.CustomerWhereInput = UUID_PATTERN.test(trimmed)
    ? { id: trimmed }
    : {
        OR: [
          { name: { contains: trimmed, mode: "insensitive" } },
          { phone: { contains: trimmed } },
          { secondaryPhone: { contains: trimmed } },
          ...(parsedCode !== null ? [{ customerCode: parsedCode }] : []),
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
  customerCode: string;
  name: string;
  phone: string;
  email: string | null;
  customerType: CustomerType;
  status: CustomerStatus;
  outstandingBalance: string;
  purchaseCount: number;
};

export function toCustomerSearchResult(row: CustomerRow): CustomerSearchResult {
  return {
    id: row.id,
    customerCode: row.customerCode,
    name: row.name,
    phone: row.phone,
    email: row.email,
    customerType: row.customerType,
    status: row.status,
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

export class CustomerNotFoundError extends Error {
  constructor() {
    super("Customer could not be found.");
    this.name = "CustomerNotFoundError";
  }
}

export type PossibleDuplicateCustomer = {
  id: string;
  name: string;
  phone: string;
  totalSpending: string;
  lastPurchaseAt: Date | null;
};

/**
 * Checked before creating a customer — matches on phone, secondary phone,
 * or email. A match here is a *warning*, not a hard block (only the exact
 * primary-phone unique constraint hard-blocks); the caller decides "Use
 * Existing Customer" or "Create New Customer Anyway". See CUSTOMER-CRM.md
 * "Duplicate customer protection".
 */
export async function findPossibleDuplicates(input: {
  phone: string;
  secondaryPhone?: string;
  email?: string;
}): Promise<PossibleDuplicateCustomer[]> {
  const or: Prisma.CustomerWhereInput[] = [{ phone: input.phone }, { secondaryPhone: input.phone }];
  if (input.secondaryPhone) {
    or.push({ phone: input.secondaryPhone }, { secondaryPhone: input.secondaryPhone });
  }
  if (input.email) {
    or.push({ email: input.email });
  }

  const matches = await prisma.customer.findMany({
    where: { OR: or },
    select: {
      id: true,
      name: true,
      phone: true,
      sales: {
        where: { status: { not: "RETURNED" } },
        select: { grandTotal: true, saleDate: true },
      },
    },
    take: 5,
  });

  return matches.map((customer) => {
    const totalSpending = customer.sales.reduce(
      (sum, sale) => sum.add(sale.grandTotal),
      new Prisma.Decimal(0),
    );
    const lastPurchaseAt = customer.sales.reduce<Date | null>(
      (latest, sale) => (!latest || sale.saleDate > latest ? sale.saleDate : latest),
      null,
    );
    return {
      id: customer.id,
      name: customer.name,
      phone: customer.phone,
      totalSpending: totalSpending.toString(),
      lastPurchaseAt,
    };
  });
}

export type CreateCustomerInput = {
  firstName: string;
  lastName?: string;
  phone: string;
  secondaryPhone?: string;
  email?: string;
  address?: string;
  city?: string;
  dateOfBirth?: Date;
  anniversaryDate?: Date;
  gender?: string;
  preferredLanguage?: string;
  customerType?: CustomerType;
  notes?: string;
};

export async function createCustomer(
  input: CreateCustomerInput,
  createdById: string,
): Promise<CustomerRow> {
  const existing = await prisma.customer.findUnique({ where: { phone: input.phone } });
  if (existing) throw new DuplicateCustomerPhoneError();

  const name = [input.firstName.trim(), input.lastName?.trim()].filter(Boolean).join(" ");

  const customer = await prisma.customer.create({
    data: {
      name,
      firstName: input.firstName.trim(),
      lastName: input.lastName?.trim() || null,
      phone: input.phone,
      secondaryPhone: input.secondaryPhone || null,
      email: input.email || null,
      address: input.address || null,
      city: input.city || null,
      dateOfBirth: input.dateOfBirth ?? null,
      anniversaryDate: input.anniversaryDate ?? null,
      gender: input.gender || null,
      preferredLanguage: input.preferredLanguage || null,
      customerType: input.customerType ?? "REGULAR",
      notes: input.notes || null,
      createdById,
    },
  });

  await writeAuditLog({
    userId: createdById,
    action: "CUSTOMER_CREATED",
    entity: "Customer",
    entityId: customer.id,
    metadata: { customerCode: formatCustomerCode(customer.customerCode), name: customer.name },
  });

  return {
    id: customer.id,
    customerCode: formatCustomerCode(customer.customerCode),
    name: customer.name,
    phone: customer.phone,
    email: customer.email,
    customerType: customer.customerType,
    status: customer.status,
    outstandingBalance: customer.outstandingBalance,
    purchaseCount: 0,
  };
}

export type UpdateCustomerInput = {
  id: string;
  firstName: string;
  lastName?: string;
  phone: string;
  secondaryPhone?: string;
  email?: string;
  address?: string;
  city?: string;
  dateOfBirth?: Date;
  anniversaryDate?: Date;
  gender?: string;
  preferredLanguage?: string;
  notes?: string;
};

export async function updateCustomer(input: UpdateCustomerInput, updatedById: string): Promise<void> {
  const existing = await prisma.customer.findUnique({ where: { phone: input.phone } });
  if (existing && existing.id !== input.id) throw new DuplicateCustomerPhoneError();

  const name = [input.firstName.trim(), input.lastName?.trim()].filter(Boolean).join(" ");

  await prisma.customer.update({
    where: { id: input.id },
    data: {
      name,
      firstName: input.firstName.trim(),
      lastName: input.lastName?.trim() || null,
      phone: input.phone,
      secondaryPhone: input.secondaryPhone || null,
      email: input.email || null,
      address: input.address || null,
      city: input.city || null,
      dateOfBirth: input.dateOfBirth ?? null,
      anniversaryDate: input.anniversaryDate ?? null,
      gender: input.gender || null,
      preferredLanguage: input.preferredLanguage || null,
      notes: input.notes || null,
    },
  });

  await writeAuditLog({
    userId: updatedById,
    action: "CUSTOMER_UPDATED",
    entity: "Customer",
    entityId: input.id,
    metadata: { name },
  });
}

/** Sets status to INACTIVE — never deletes a customer, even one with no sales. */
export async function archiveCustomer(id: string, userId: string): Promise<void> {
  await prisma.customer.update({ where: { id }, data: { status: "INACTIVE" } });
  await writeAuditLog({ userId, action: "CUSTOMER_ARCHIVED", entity: "Customer", entityId: id, metadata: {} });
}

export async function changeCustomerStatus(
  id: string,
  status: CustomerStatus,
  userId: string,
): Promise<void> {
  const existing = await prisma.customer.findUniqueOrThrow({ where: { id }, select: { status: true } });
  await prisma.customer.update({ where: { id }, data: { status } });
  await writeAuditLog({
    userId,
    action: "CUSTOMER_STATUS_CHANGED",
    entity: "Customer",
    entityId: id,
    metadata: { previousStatus: existing.status, newStatus: status },
  });
}

export async function changeCustomerType(
  id: string,
  customerType: CustomerType,
  userId: string,
): Promise<void> {
  const existing = await prisma.customer.findUniqueOrThrow({ where: { id }, select: { customerType: true } });
  await prisma.customer.update({ where: { id }, data: { customerType } });
  await writeAuditLog({
    userId,
    action: "CUSTOMER_TYPE_CHANGED",
    entity: "Customer",
    entityId: id,
    metadata: { previousType: existing.customerType, newType: customerType },
  });
}

const PROFILE_INCLUDE = {
  createdBy: { select: { id: true, name: true } },
  preference: true,
} satisfies Prisma.CustomerInclude;

export type CustomerProfile = Prisma.CustomerGetPayload<{ include: typeof PROFILE_INCLUDE }>;

export async function getCustomerProfile(id: string): Promise<CustomerProfile | null> {
  return prisma.customer.findUnique({ where: { id }, include: PROFILE_INCLUDE });
}

export type CustomerListFilters = {
  search?: string;
  customerType?: CustomerType;
  status?: CustomerStatus;
  city?: string;
  minSpending?: number;
  maxSpending?: number;
  minOutstanding?: number;
  purchasedAfter?: Date;
  purchasedBefore?: Date;
  sort?: "NEWEST" | "OLDEST" | "SPENDING_HIGH" | "OUTSTANDING_HIGH" | "MOST_PURCHASES" | "RECENT_PURCHASE";
  page?: number;
  pageSize?: number;
};

export type CustomerListRow = {
  id: string;
  customerCode: string;
  name: string;
  phone: string;
  email: string | null;
  city: string | null;
  customerType: CustomerType;
  status: CustomerStatus;
  totalSpending: string;
  outstandingBalance: string;
  purchaseCount: number;
  lastPurchaseAt: Date | null;
  createdAt: Date;
};

/**
 * The All Customers list. Total spending / purchase count / last purchase
 * date are computed live from `sales` (excluding RETURNED sales) via a raw
 * aggregate join rather than a cached column, specifically so a return
 * approved after the fact is always reflected correctly — see
 * CUSTOMER-CRM.md "Why spending isn't cached". Every filter value is
 * passed as a bound parameter (Prisma.sql / Prisma.join), never
 * string-interpolated, so this stays injection-safe despite being raw SQL.
 */
export async function listCustomers(
  filters: CustomerListFilters,
): Promise<{ rows: CustomerListRow[]; total: number }> {
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, filters.pageSize ?? 20));

  const conditions: Prisma.Sql[] = [];
  if (filters.search) {
    const trimmed = filters.search.trim();
    const parsedCode = parseCustomerCode(trimmed);
    const searchConditions: Prisma.Sql[] = [
      Prisma.sql`c.name ILIKE ${`%${trimmed}%`}`,
      Prisma.sql`c.phone ILIKE ${`%${trimmed}%`}`,
      Prisma.sql`c.email ILIKE ${`%${trimmed}%`}`,
    ];
    if (parsedCode !== null) searchConditions.push(Prisma.sql`c."customerCode" = ${parsedCode}`);
    conditions.push(Prisma.sql`(${Prisma.join(searchConditions, " OR ")})`);
  }
  if (filters.customerType) conditions.push(Prisma.sql`c."customerType" = ${filters.customerType}::"CustomerType"`);
  if (filters.status) conditions.push(Prisma.sql`c.status = ${filters.status}::"CustomerStatus"`);
  if (filters.city) conditions.push(Prisma.sql`c.city ILIKE ${`%${filters.city}%`}`);
  if (filters.minOutstanding !== undefined) {
    conditions.push(Prisma.sql`c."outstandingBalance" >= ${filters.minOutstanding}`);
  }

  const having: Prisma.Sql[] = [];
  if (filters.minSpending !== undefined) {
    having.push(Prisma.sql`COALESCE(SUM(s."grandTotal"), 0) >= ${filters.minSpending}`);
  }
  if (filters.maxSpending !== undefined) {
    having.push(Prisma.sql`COALESCE(SUM(s."grandTotal"), 0) <= ${filters.maxSpending}`);
  }
  if (filters.purchasedAfter) {
    having.push(Prisma.sql`MAX(s."saleDate") >= ${filters.purchasedAfter}`);
  }
  if (filters.purchasedBefore) {
    having.push(Prisma.sql`MAX(s."saleDate") <= ${filters.purchasedBefore}`);
  }

  const whereClause = conditions.length > 0 ? Prisma.sql`WHERE ${Prisma.join(conditions, " AND ")}` : Prisma.empty;
  const havingClause = having.length > 0 ? Prisma.sql`HAVING ${Prisma.join(having, " AND ")}` : Prisma.empty;

  const orderBy: Prisma.Sql = (() => {
    switch (filters.sort) {
      case "OLDEST":
        return Prisma.sql`c."createdAt" ASC`;
      case "SPENDING_HIGH":
        return Prisma.sql`"totalSpending" DESC`;
      case "OUTSTANDING_HIGH":
        return Prisma.sql`c."outstandingBalance" DESC`;
      case "MOST_PURCHASES":
        return Prisma.sql`"purchaseCount" DESC`;
      case "RECENT_PURCHASE":
        return Prisma.sql`"lastPurchaseAt" DESC NULLS LAST`;
      case "NEWEST":
      default:
        return Prisma.sql`c."createdAt" DESC`;
    }
  })();

  const rows = await prisma.$queryRaw<
    {
      id: string;
      customerCode: number;
      name: string;
      phone: string;
      email: string | null;
      city: string | null;
      customerType: CustomerType;
      status: CustomerStatus;
      outstandingBalance: Prisma.Decimal;
      totalSpending: Prisma.Decimal;
      purchaseCount: bigint;
      lastPurchaseAt: Date | null;
      createdAt: Date;
    }[]
  >(Prisma.sql`
    SELECT
      c.id, c."customerCode", c.name, c.phone, c.email, c.city, c."customerType", c.status,
      c."outstandingBalance", c."createdAt",
      COALESCE(SUM(s."grandTotal"), 0) AS "totalSpending",
      COUNT(s.id) AS "purchaseCount",
      MAX(s."saleDate") AS "lastPurchaseAt"
    FROM customers c
    LEFT JOIN sales s ON s."customerId" = c.id AND s.status != 'RETURNED'
    ${whereClause}
    GROUP BY c.id
    ${havingClause}
    ORDER BY ${orderBy}
    LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}
  `);

  const [{ total }] = await prisma.$queryRaw<{ total: bigint }[]>(Prisma.sql`
    SELECT COUNT(*)::bigint AS total FROM (
      SELECT c.id
      FROM customers c
      LEFT JOIN sales s ON s."customerId" = c.id AND s.status != 'RETURNED'
      ${whereClause}
      GROUP BY c.id
      ${havingClause}
    ) counted
  `);

  return {
    rows: rows.map((row) => ({
      id: row.id,
      customerCode: formatCustomerCode(row.customerCode),
      name: row.name,
      phone: row.phone,
      email: row.email,
      city: row.city,
      customerType: row.customerType,
      status: row.status,
      totalSpending: row.totalSpending.toString(),
      outstandingBalance: row.outstandingBalance.toString(),
      purchaseCount: Number(row.purchaseCount),
      lastPurchaseAt: row.lastPurchaseAt,
      createdAt: row.createdAt,
    })),
    total: Number(total),
  };
}

/** Every customer, unpaginated — for CSV export only (OWNER/ADMIN). See CUSTOMER-CRM.md "Export". */
export async function exportAllCustomers(): Promise<CustomerListRow[]> {
  const rows = await prisma.$queryRaw<
    {
      id: string;
      customerCode: number;
      name: string;
      phone: string;
      email: string | null;
      city: string | null;
      customerType: CustomerType;
      status: CustomerStatus;
      outstandingBalance: Prisma.Decimal;
      totalSpending: Prisma.Decimal;
      purchaseCount: bigint;
      lastPurchaseAt: Date | null;
      createdAt: Date;
    }[]
  >(Prisma.sql`
    SELECT
      c.id, c."customerCode", c.name, c.phone, c.email, c.city, c."customerType", c.status,
      c."outstandingBalance", c."createdAt",
      COALESCE(SUM(s."grandTotal"), 0) AS "totalSpending",
      COUNT(s.id) AS "purchaseCount",
      MAX(s."saleDate") AS "lastPurchaseAt"
    FROM customers c
    LEFT JOIN sales s ON s."customerId" = c.id AND s.status != 'RETURNED'
    GROUP BY c.id
    ORDER BY c."createdAt" DESC
  `);

  return rows.map((row) => ({
    id: row.id,
    customerCode: formatCustomerCode(row.customerCode),
    name: row.name,
    phone: row.phone,
    email: row.email,
    city: row.city,
    customerType: row.customerType,
    status: row.status,
    totalSpending: row.totalSpending.toString(),
    outstandingBalance: row.outstandingBalance.toString(),
    purchaseCount: Number(row.purchaseCount),
    lastPurchaseAt: row.lastPurchaseAt,
    createdAt: row.createdAt,
  }));
}

/**
 * Adds to a customer's cached outstanding balance directly — used only by
 * customer-ledger.service.ts's appendCustomerLedgerEntry(), which is the
 * only code path allowed to change this column. Never call this directly
 * from anywhere else; it would desync the balance from the ledger.
 */
export async function adjustCustomerOutstandingBalanceInTx(
  tx: PrismaTx,
  customerId: string,
  delta: string | number | Decimal,
): Promise<Prisma.Decimal> {
  const rows = await tx.$queryRaw<{ outstandingBalance: Prisma.Decimal }[]>`
    UPDATE customers
    SET "outstandingBalance" = "outstandingBalance" + ${String(delta)}::numeric, "updatedAt" = now()
    WHERE id = ${customerId}::uuid
    RETURNING "outstandingBalance"
  `;
  if (rows.length === 0) throw new CustomerNotFoundError();
  return rows[0].outstandingBalance;
}
