import "server-only";
import Decimal from "decimal.js";
import { prisma } from "@/lib/db/prisma";
import { getSystemSetting } from "@/services/system-setting.service";
import { SETTINGS_KEYS } from "@/lib/settings-keys";
import { getInventoryValuationReport } from "@/services/financial-reports.service";

/**
 * Inventory Intelligence — see ANALYTICS.md "Inventory analytics". Never
 * changes a price or auto-discounts a product; every recommendation here
 * is text a human reads and acts on (or doesn't).
 */

export type InventoryStatusBreakdown = {
  totalItems: number;
  inStock: number;
  reserved: number;
  sold: number;
  returned: number;
  damaged: number;
  lost: number;
  /** Archived (Product no longer actively offered) — see INVENTORY.md "Old stock". */
  inactive: number;
  costValue: string;
  sellingValue: string;
  expectedGrossProfit: string;
};

export async function getInventoryStatusBreakdown(): Promise<InventoryStatusBreakdown> {
  const [counts, valuation] = await Promise.all([
    prisma.inventoryItem.groupBy({ by: ["status", "archivedAt"], _count: true }),
    getInventoryValuationReport(),
  ]);

  const byStatus = { inStock: 0, reserved: 0, sold: 0, returned: 0, damaged: 0, lost: 0 };
  let inactive = 0;
  let totalItems = 0;
  for (const row of counts) {
    totalItems += row._count;
    if (row.archivedAt !== null) {
      inactive += row._count;
      continue;
    }
    switch (row.status) {
      case "IN_STOCK":
        byStatus.inStock += row._count;
        break;
      case "RESERVED":
        byStatus.reserved += row._count;
        break;
      case "SOLD":
        byStatus.sold += row._count;
        break;
      case "RETURNED":
        byStatus.returned += row._count;
        break;
      case "DAMAGED":
        byStatus.damaged += row._count;
        break;
      case "LOST":
        byStatus.lost += row._count;
        break;
    }
  }

  return {
    totalItems,
    ...byStatus,
    inactive,
    costValue: valuation.costValue,
    sellingValue: valuation.sellingValue,
    expectedGrossProfit: valuation.expectedGrossProfit,
  };
}

export type InventoryAgeBucket = {
  label: string;
  minDays: number;
  maxDays: number | null;
  itemCount: number;
  costValue: string;
  sellingValue: string;
};

const AGE_BUCKETS = [
  { label: "0-30 days", minDays: 0, maxDays: 30 },
  { label: "31-60 days", minDays: 31, maxDays: 60 },
  { label: "61-90 days", minDays: 61, maxDays: 90 },
  { label: "91-180 days", minDays: 91, maxDays: 180 },
  { label: "180+ days", minDays: 181, maxDays: null },
];

/** The spec's exact 5-bucket aging breakdown — finer-grained than financial-reports.service.ts's own 4-bucket inventory-valuation age split, so kept as its own query rather than reusing that one. Flags aging stock; never auto-discounts it. */
export async function getInventoryAgeBuckets(): Promise<InventoryAgeBucket[]> {
  const items = await prisma.inventoryItem.findMany({
    where: { archivedAt: null, status: { not: "SOLD" } },
    select: { totalCost: true, sellingPrice: true, createdAt: true },
  });

  const now = Date.now();
  const buckets = AGE_BUCKETS.map((b) => ({ ...b, itemCount: 0, costValue: new Decimal(0), sellingValue: new Decimal(0) }));

  for (const item of items) {
    const days = Math.floor((now - item.createdAt.getTime()) / (1000 * 60 * 60 * 24));
    const bucket = buckets.find((b) => days >= b.minDays && (b.maxDays === null || days <= b.maxDays)) ?? buckets[buckets.length - 1];
    bucket.itemCount += 1;
    bucket.costValue = bucket.costValue.add(item.totalCost.toString());
    bucket.sellingValue = bucket.sellingValue.add(item.sellingPrice.toString());
  }

  return buckets.map((b) => ({
    label: b.label,
    minDays: b.minDays,
    maxDays: b.maxDays,
    itemCount: b.itemCount,
    costValue: b.costValue.toString(),
    sellingValue: b.sellingValue.toString(),
  }));
}

export type SlowMovingItem = {
  inventoryItemId: string;
  productName: string;
  categoryName: string;
  daysSinceCreated: number;
  sellingPrice: string;
  recommendation: string;
};

/** No recorded sale in `noSaleDays` (default from SETTINGS_KEYS.BI_AGING_STOCK_DAYS) — an item that was never sold and has sat this long is "slow-moving." Always a recommendation TEXT, never an automatic price/discount/display change. */
export async function getSlowMovingInventory(limit = 50): Promise<SlowMovingItem[]> {
  const days = Number.parseInt((await getSystemSetting(SETTINGS_KEYS.BI_AGING_STOCK_DAYS)) || "90", 10);
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const items = await prisma.inventoryItem.findMany({
    where: { archivedAt: null, status: "IN_STOCK", createdAt: { lte: cutoff } },
    select: {
      id: true,
      sellingPrice: true,
      createdAt: true,
      product: { select: { name: true, category: { select: { name: true } } } },
    },
    orderBy: { createdAt: "asc" },
    take: limit,
  });

  const now = Date.now();
  return items.map((item) => {
    const daysSinceCreated = Math.floor((now - item.createdAt.getTime()) / (1000 * 60 * 60 * 24));
    return {
      inventoryItemId: item.id,
      productName: item.product.name,
      categoryName: item.product.category.name,
      daysSinceCreated,
      sellingPrice: item.sellingPrice.toString(),
      recommendation: `No recorded sale in ${daysSinceCreated} days. Consider a campaign for this product, or moving it to a featured display.`,
    };
  });
}
