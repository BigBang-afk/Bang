import "server-only";
import { prisma } from "@/lib/db/prisma";
import { writeAuditLog } from "@/services/audit.service";
import { formatBarcodeCode, parseBarcodeCode } from "@/lib/barcode-code";
import { parseInvoiceNumber } from "@/lib/invoice-number";
import type { SaleListFilters } from "@/types/sales";
import type { Prisma } from "@/generated/prisma/client";

const SALE_DETAIL_INCLUDE = {
  customer: true,
  createdBy: { select: { id: true, name: true } },
  items: { include: { return: true }, orderBy: { createdAt: "asc" } },
  payments: {
    include: { createdBy: { select: { id: true, name: true } } },
    orderBy: { createdAt: "asc" },
  },
  invoice: true,
} satisfies Prisma.SaleInclude;

export type SaleDetail = Prisma.SaleGetPayload<{ include: typeof SALE_DETAIL_INCLUDE }>;

export async function getSaleById(id: string): Promise<SaleDetail | null> {
  return prisma.sale.findUnique({ where: { id }, include: SALE_DETAIL_INCLUDE });
}

const SALE_LIST_INCLUDE = {
  customer: { select: { id: true, name: true, phone: true } },
  createdBy: { select: { id: true, name: true } },
  invoice: {
    select: { sequence: true, generatedAt: true, printCount: true, downloadCount: true },
  },
  _count: { select: { items: true } },
} satisfies Prisma.SaleInclude;

export type SaleListRow = Prisma.SaleGetPayload<{ include: typeof SALE_LIST_INCLUDE }>;

function mapSortToOrderBy(sort: SaleListFilters["sort"]): Prisma.SaleOrderByWithRelationInput {
  switch (sort) {
    case "OLDEST":
      return { saleDate: "asc" };
    case "VALUE_HIGH":
      return { grandTotal: "desc" };
    case "VALUE_LOW":
      return { grandTotal: "asc" };
    case "NEWEST":
    default:
      return { saleDate: "desc" };
  }
}

export async function listSales(
  filters: SaleListFilters,
): Promise<{ rows: SaleListRow[]; total: number }> {
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, filters.pageSize ?? 20));

  const where: Prisma.SaleWhereInput = {};
  if (filters.status) where.status = filters.status;
  if (filters.customerId) where.customerId = filters.customerId;
  if (filters.createdById) where.createdById = filters.createdById;
  if (filters.dateFrom || filters.dateTo) {
    where.saleDate = { gte: filters.dateFrom, lte: filters.dateTo };
  }
  if (filters.paymentStatus === "PAID") where.balanceAmount = { equals: 0 };
  if (filters.paymentStatus === "ON_CREDIT") where.balanceAmount = { gt: 0 };

  if (filters.search) {
    const parsedInvoice = parseInvoiceNumber(filters.search);
    const parsedBarcode = parseBarcodeCode(filters.search);
    where.OR = [
      { customer: { name: { contains: filters.search, mode: "insensitive" } } },
      { customer: { phone: { contains: filters.search } } },
      ...(parsedInvoice !== null ? [{ invoice: { sequence: parsedInvoice } }] : []),
      ...(parsedBarcode !== null
        ? [{ items: { some: { barcodeCode: formatBarcodeCode(parsedBarcode) } } }]
        : []),
    ];
  }

  const [rows, total] = await Promise.all([
    prisma.sale.findMany({
      where,
      orderBy: mapSortToOrderBy(filters.sort),
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: SALE_LIST_INCLUDE,
    }),
    prisma.sale.count({ where }),
  ]);

  return { rows, total };
}

export async function recordInvoicePrint(saleId: string, userId: string): Promise<void> {
  const invoice = await prisma.invoice.update({
    where: { saleId },
    data: { printCount: { increment: 1 }, lastPrintedAt: new Date() },
  });
  await writeAuditLog({
    userId,
    action: "INVOICE_PRINTED",
    entity: "Invoice",
    entityId: invoice.id,
    metadata: { saleId },
  });
}

export async function recordInvoiceDownload(saleId: string, userId: string): Promise<void> {
  const invoice = await prisma.invoice.update({
    where: { saleId },
    data: { downloadCount: { increment: 1 }, lastDownloadedAt: new Date() },
  });
  await writeAuditLog({
    userId,
    action: "INVOICE_DOWNLOADED",
    entity: "Invoice",
    entityId: invoice.id,
    metadata: { saleId },
  });
}
