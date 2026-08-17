import "server-only";
import { prisma } from "@/lib/db/prisma";
import { writeAuditLog } from "@/services/audit.service";
import { formatSupplierCode, parseSupplierCode } from "@/lib/supplier-code";
import { Prisma } from "@/generated/prisma/client";
import type { SupplierStatus } from "@/generated/prisma/client";

/**
 * Supplier identity/CRUD — see SUPPLIER-SYSTEM.md. Gold and cash positions
 * are read from gold-ledger.service.ts / party-cash-ledger.service.ts, not
 * stored here.
 */

export class DuplicateSupplierPhoneError extends Error {
  constructor() {
    super("A supplier with this phone number already exists.");
    this.name = "DuplicateSupplierPhoneError";
  }
}

export class SupplierNotFoundError extends Error {
  constructor() {
    super("Supplier could not be found.");
    this.name = "SupplierNotFoundError";
  }
}

export type SupplierRow = {
  id: string;
  supplierCode: string;
  name: string;
  companyName: string | null;
  phone: string;
  secondaryPhone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  status: SupplierStatus;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
};

const SUPPLIER_SELECT = {
  id: true,
  supplierCode: true,
  name: true,
  companyName: true,
  phone: true,
  secondaryPhone: true,
  email: true,
  address: true,
  city: true,
  status: true,
  notes: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.SupplierSelect;

function toSupplierRow(row: {
  id: string;
  supplierCode: number;
  name: string;
  companyName: string | null;
  phone: string;
  secondaryPhone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  status: SupplierStatus;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}): SupplierRow {
  return { ...row, supplierCode: formatSupplierCode(row.supplierCode) };
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Search by name, phone, or supplier code — used by the New Purchase supplier picker. */
export async function searchSuppliers(query: string, limit = 10): Promise<SupplierRow[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const parsedCode = parseSupplierCode(trimmed);
  const where: Prisma.SupplierWhereInput = UUID_PATTERN.test(trimmed)
    ? { id: trimmed }
    : {
        OR: [
          { name: { contains: trimmed, mode: "insensitive" } },
          { companyName: { contains: trimmed, mode: "insensitive" } },
          { phone: { contains: trimmed } },
          { secondaryPhone: { contains: trimmed } },
          ...(parsedCode !== null ? [{ supplierCode: parsedCode }] : []),
        ],
      };

  const rows = await prisma.supplier.findMany({
    where,
    select: SUPPLIER_SELECT,
    orderBy: { name: "asc" },
    take: limit,
  });
  return rows.map(toSupplierRow);
}

export async function getSupplierById(id: string): Promise<SupplierRow | null> {
  const row = await prisma.supplier.findUnique({ where: { id }, select: SUPPLIER_SELECT });
  return row ? toSupplierRow(row) : null;
}

export type CreateSupplierInput = {
  name: string;
  companyName?: string;
  phone: string;
  secondaryPhone?: string;
  email?: string;
  address?: string;
  city?: string;
  notes?: string;
};

export async function createSupplier(input: CreateSupplierInput, createdById: string): Promise<SupplierRow> {
  const existing = await prisma.supplier.findUnique({ where: { phone: input.phone } });
  if (existing) throw new DuplicateSupplierPhoneError();

  const supplier = await prisma.supplier.create({
    data: {
      name: input.name.trim(),
      companyName: input.companyName || null,
      phone: input.phone,
      secondaryPhone: input.secondaryPhone || null,
      email: input.email || null,
      address: input.address || null,
      city: input.city || null,
      notes: input.notes || null,
      createdById,
    },
    select: SUPPLIER_SELECT,
  });

  await writeAuditLog({
    userId: createdById,
    action: "SUPPLIER_CREATED",
    entity: "Supplier",
    entityId: supplier.id,
    metadata: { supplierCode: formatSupplierCode(supplier.supplierCode), name: supplier.name },
  });

  return toSupplierRow(supplier);
}

export type UpdateSupplierInput = {
  id: string;
  name: string;
  companyName?: string;
  phone: string;
  secondaryPhone?: string;
  email?: string;
  address?: string;
  city?: string;
  notes?: string;
};

export async function updateSupplier(input: UpdateSupplierInput, updatedById: string): Promise<void> {
  const existing = await prisma.supplier.findUnique({ where: { phone: input.phone } });
  if (existing && existing.id !== input.id) throw new DuplicateSupplierPhoneError();

  await prisma.supplier.update({
    where: { id: input.id },
    data: {
      name: input.name.trim(),
      companyName: input.companyName || null,
      phone: input.phone,
      secondaryPhone: input.secondaryPhone || null,
      email: input.email || null,
      address: input.address || null,
      city: input.city || null,
      notes: input.notes || null,
    },
  });

  await writeAuditLog({
    userId: updatedById,
    action: "SUPPLIER_UPDATED",
    entity: "Supplier",
    entityId: input.id,
    metadata: { name: input.name },
  });
}

export async function changeSupplierStatus(id: string, status: SupplierStatus, userId: string): Promise<void> {
  const existing = await prisma.supplier.findUniqueOrThrow({ where: { id }, select: { status: true } });
  await prisma.supplier.update({ where: { id }, data: { status } });
  await writeAuditLog({
    userId,
    action: "SUPPLIER_STATUS_CHANGED",
    entity: "Supplier",
    entityId: id,
    metadata: { previousStatus: existing.status, newStatus: status },
  });
}

export type SupplierListFilters = {
  search?: string;
  status?: SupplierStatus;
  sort?: "NEWEST" | "OLDEST" | "NAME";
  page?: number;
  pageSize?: number;
};

export async function listSuppliers(
  filters: SupplierListFilters,
): Promise<{ rows: SupplierRow[]; total: number }> {
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, filters.pageSize ?? 20));

  const parsedCode = filters.search ? parseSupplierCode(filters.search.trim()) : null;
  const where: Prisma.SupplierWhereInput = {
    ...(filters.search
      ? {
          OR: [
            { name: { contains: filters.search, mode: "insensitive" } },
            { companyName: { contains: filters.search, mode: "insensitive" } },
            { phone: { contains: filters.search } },
            { secondaryPhone: { contains: filters.search } },
            ...(parsedCode !== null ? [{ supplierCode: parsedCode }] : []),
          ],
        }
      : {}),
    ...(filters.status ? { status: filters.status } : {}),
  };

  const orderBy: Prisma.SupplierOrderByWithRelationInput =
    filters.sort === "OLDEST"
      ? { createdAt: "asc" }
      : filters.sort === "NAME"
        ? { name: "asc" }
        : { createdAt: "desc" };

  const [rows, total] = await Promise.all([
    prisma.supplier.findMany({
      where,
      select: SUPPLIER_SELECT,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.supplier.count({ where }),
  ]);

  return { rows: rows.map(toSupplierRow), total };
}

export type SupplierPurchaseSummary = {
  totalPurchases: string;
  purchaseCount: number;
  amountPaid: string;
  lastPurchaseAt: Date | null;
};

/**
 * Live-computed from Purchase, never cached — see PURCHASE-SYSTEM.md.
 * `amountPaid` is the sum of what was paid at purchase time; it does NOT
 * include standalone supplier payments made later against the running
 * balance — those only affect the party cash ledger. The supplier's
 * CURRENT payable/receivable is party-cash-ledger.service.ts's
 * getPartyCashPosition("SUPPLIER", supplierId), never this function —
 * exactly the same split Sale.balanceAmount (a snapshot) has from
 * Customer.outstandingBalance (the live figure) in Phase 3/4.
 */
export async function getSupplierPurchaseSummary(supplierId: string): Promise<SupplierPurchaseSummary> {
  const purchases = await prisma.purchase.findMany({
    where: { supplierId },
    select: { grandTotal: true, paidAmount: true, purchaseDate: true },
    orderBy: { purchaseDate: "asc" },
  });

  const totalPurchases = purchases.reduce((sum, p) => sum.add(p.grandTotal), new Prisma.Decimal(0));
  const amountPaid = purchases.reduce((sum, p) => sum.add(p.paidAmount), new Prisma.Decimal(0));

  return {
    totalPurchases: totalPurchases.toString(),
    purchaseCount: purchases.length,
    amountPaid: amountPaid.toString(),
    lastPurchaseAt: purchases.length > 0 ? purchases[purchases.length - 1].purchaseDate : null,
  };
}
