import "server-only";
import { prisma } from "@/lib/db/prisma";
import { Prisma } from "@/generated/prisma/client";
import { getPurchaseSummary, type PurchaseSummary } from "@/services/purchase.service";

/**
 * Supplier Analytics — see ANALYTICS.md "Supplier analytics". Purchase
 * totals reuse purchase.service.ts's getPurchaseSummary(); this file adds
 * the per-supplier breakdown and top-supplier ranking on top of it.
 */

export type SupplierAnalyticsSummary = PurchaseSummary & { activeSuppliers: number };

export async function getSupplierAnalyticsSummary(): Promise<SupplierAnalyticsSummary> {
  const [purchaseSummary, activeSuppliers] = await Promise.all([
    getPurchaseSummary(),
    prisma.supplier.count({ where: { status: "ACTIVE" } }),
  ]);
  return { ...purchaseSummary, activeSuppliers };
}

export type TopSupplierRow = {
  supplierId: string;
  name: string;
  purchaseCount: number;
  purchaseValue: string;
  amountPaid: string;
  outstanding: string;
};

export type TopSupplierMetric = "volume" | "value";

export async function getTopSuppliers(metric: TopSupplierMetric, limit = 10): Promise<TopSupplierRow[]> {
  const rows = await prisma.purchase.groupBy({
    by: ["supplierId"],
    _sum: { grandTotal: true, paidAmount: true, balanceAmount: true },
    _count: true,
    orderBy: metric === "value" ? { _sum: { grandTotal: "desc" } } : { _count: { supplierId: "desc" } },
    take: limit,
  });

  const suppliers = await prisma.supplier.findMany({
    where: { id: { in: rows.map((r) => r.supplierId) } },
    select: { id: true, name: true },
  });
  const nameById = new Map(suppliers.map((s) => [s.id, s.name]));

  return rows.map((row) => ({
    supplierId: row.supplierId,
    name: nameById.get(row.supplierId) ?? "Unknown",
    purchaseCount: row._count,
    purchaseValue: (row._sum.grandTotal ?? new Prisma.Decimal(0)).toString(),
    amountPaid: (row._sum.paidAmount ?? new Prisma.Decimal(0)).toString(),
    outstanding: (row._sum.balanceAmount ?? new Prisma.Decimal(0)).toString(),
  }));
}
