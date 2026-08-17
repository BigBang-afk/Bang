import "server-only";
import Decimal from "decimal.js";
import { prisma } from "@/lib/db/prisma";
import { calculateGoldValue } from "@/services/gold-calculation.service";
import { calculateInventoryPricing } from "@/services/inventory-pricing.service";
import { getEffectiveRatesForDate, getTodayBusinessDate } from "@/services/gold-rate.service";
import { recordStockMovement } from "@/services/stock-movement.service";
import { writeAuditLog } from "@/services/audit.service";
import { formatBarcodeCode, parseBarcodeCode } from "@/lib/barcode-code";
import { formatWeight, formatCurrency, formatRatePerGram } from "@/lib/format";
import {
  STOCK_STATUS_TRANSITIONS,
  LowerPriceConfirmationRequiredError,
  type CreateInventoryItemInput,
  type UpdateInventoryItemInput,
  type InventoryListFilters,
  type StockStatusValue,
  type EditableStockItem,
} from "@/types/inventory";
import type { GoldPurity } from "@/types/gold";
import type { PosCatalogItem } from "@/types/sales";
import type { Prisma, StockMovementType } from "@/generated/prisma/client";

const WEIGHT_DP = 3;
const MONEY_DP = 2;
const PERCENT_DP = 2;

function roundDp(value: Decimal, dp: number): Decimal {
  return value.toDecimalPlaces(dp, Decimal.ROUND_HALF_UP);
}

export class InvalidStatusTransitionError extends Error {
  constructor(from: string, to: string) {
    super(`Cannot change status from ${from} to ${to}.`);
    this.name = "InvalidStatusTransitionError";
  }
}

/**
 * Resolves the exact GoldRate row today's effective rate came from, when the
 * submitted rate matches it exactly — pure provenance, never the source of
 * truth for the stored value. See INVENTORY.md "Gold rate snapshot".
 */
async function resolveGoldRateSourceId(
  purity: GoldPurity,
  goldRate: Decimal,
): Promise<string | null> {
  const rates = await getEffectiveRatesForDate(getTodayBusinessDate());
  const match = rates.find(
    (rate) => rate.purity === purity && new Decimal(rate.ratePerGram.toString()).equals(goldRate),
  );
  return match?.id ?? null;
}

/**
 * Runs the item through the Phase 1 calculation engine (weight/gold value)
 * and the inventory pricing service (cost/profit) — the only place these
 * two are combined. Never re-implement this math anywhere else.
 */
function computeItemFinancials(input: {
  netWeight: number;
  goldRate: number;
  wastageType: "PERCENTAGE" | "FIXED_GRAMS";
  wastagePercent?: number;
  wastageGrams?: number;
  makingCharge?: number;
  stoneCharge?: number;
  diamondCharge?: number;
  otherCharge?: number;
  sellingPrice: number;
}) {
  const goldCalc = calculateGoldValue({
    netWeight: input.netWeight,
    goldRate: input.goldRate,
    wastage:
      input.wastageType === "PERCENTAGE"
        ? { type: "PERCENTAGE", wastagePercent: input.wastagePercent ?? 0 }
        : { type: "FIXED_GRAMS", wastageGrams: input.wastageGrams ?? 0 },
  });

  const pricing = calculateInventoryPricing({
    goldValue: goldCalc.goldValue,
    makingCharge: input.makingCharge,
    stoneCharge: input.stoneCharge,
    diamondCharge: input.diamondCharge,
    otherCharge: input.otherCharge,
    sellingPrice: input.sellingPrice,
  });

  return { goldCalc, pricing };
}

export type CreatedInventoryItem = { id: string; barcodeCode: string; productId: string };

type PrismaTx = Prisma.TransactionClient;
type CreateInventoryItemTxResult = Awaited<ReturnType<typeof createInventoryItemInTx>>;

/**
 * The transactional body of createInventoryItem() — extracted so
 * purchase.service.ts can compose it inside its OWN transaction (Purchase
 * + PurchaseItems + this InventoryItem + ledger entries all rolling back
 * together) instead of nesting a second top-level `prisma.$transaction`,
 * which Prisma doesn't support. Callers write their own audit log entries
 * after their transaction commits — see createInventoryItem() below for
 * the standalone Add Stock case.
 */
async function createInventoryItemInTx(tx: PrismaTx, input: CreateInventoryItemInput, userId: string) {
  const { goldCalc, pricing } = computeItemFinancials(input);
  const goldRateSourceId = await resolveGoldRateSourceId(input.purity, goldCalc.goldRate);

  const netWeight = roundDp(goldCalc.netWeight, WEIGHT_DP);
  const wastageWeight = roundDp(goldCalc.wastageWeight, WEIGHT_DP);
  const grossWeight = roundDp(goldCalc.grossWeight, WEIGHT_DP);
  const wastagePercent = goldCalc.wastagePercent ? roundDp(goldCalc.wastagePercent, WEIGHT_DP) : null;
  const totalCost = roundDp(pricing.totalCost, MONEY_DP);
  const sellingPrice = roundDp(pricing.sellingPrice, MONEY_DP);

  if (sellingPrice.lt(totalCost) && !input.confirmLowerPrice) {
    throw new LowerPriceConfirmationRequiredError();
  }

  const product = await tx.product.create({
    data: {
      name: input.productName,
      categoryId: input.categoryId,
      subcategory: input.subcategory || null,
      designNumber: input.designNumber || null,
      supplier: input.supplier || null,
      karigar: input.karigar || null,
      imageUrl: input.imageUrl || null,
      notes: input.notes || null,
      createdById: userId,
    },
  });

  const item = await tx.inventoryItem.create({
    data: {
      productId: product.id,
      purity: input.purity,
      netWeight: netWeight.toString(),
      wastageType: input.wastageType,
      wastagePercent: wastagePercent ? wastagePercent.toString() : null,
      wastageWeight: wastageWeight.toString(),
      grossWeight: grossWeight.toString(),
      goldRatePerGram: goldCalc.goldRate.toString(),
      goldRateSourceId,
      goldValue: roundDp(goldCalc.goldValue, MONEY_DP).toString(),
      makingCharge: roundDp(pricing.makingCharge, MONEY_DP).toString(),
      stoneCharge: roundDp(pricing.stoneCharge, MONEY_DP).toString(),
      diamondCharge: roundDp(pricing.diamondCharge, MONEY_DP).toString(),
      otherCharge: roundDp(pricing.otherCharge, MONEY_DP).toString(),
      totalCost: totalCost.toString(),
      sellingPrice: sellingPrice.toString(),
      expectedProfit: roundDp(pricing.expectedProfit, MONEY_DP).toString(),
      profitMarginPercent: roundDp(pricing.profitMarginPercent, PERCENT_DP).toString(),
      status: "IN_STOCK",
      source: input.source ?? "MANUFACTURED",
      supplierId: input.supplierId ?? null,
      purchaseItemId: input.purchaseItemId ?? null,
      createdById: userId,
    },
  });

  const barcode = await tx.barcode.create({ data: { inventoryItemId: item.id } });

  await recordStockMovement(tx, {
    inventoryItemId: item.id,
    movementType: "STOCK_CREATED",
    previousStatus: null,
    newStatus: "IN_STOCK",
    weight: grossWeight.toString(),
    userId,
    metadata: { barcode: formatBarcodeCode(barcode.sequence) },
  });

  return { product, item, barcode };
}

/** Writes the STOCK_CREATED/BARCODE_GENERATED audit log pair — always called after the creating transaction commits, whether that's this file's own or purchase.service.ts's. */
async function writeInventoryItemCreatedAuditLogs(
  result: CreateInventoryItemTxResult,
  productName: string,
  userId: string,
): Promise<void> {
  const barcodeCode = formatBarcodeCode(result.barcode.sequence);
  await writeAuditLog({
    userId,
    action: "STOCK_CREATED",
    entity: "InventoryItem",
    entityId: result.item.id,
    metadata: { barcode: barcodeCode, productName },
  });
  await writeAuditLog({
    userId,
    action: "BARCODE_GENERATED",
    entity: "Barcode",
    entityId: result.barcode.id,
    metadata: { code: barcodeCode, inventoryItemId: result.item.id },
  });
}

export async function createInventoryItem(
  input: CreateInventoryItemInput,
  userId: string,
): Promise<CreatedInventoryItem> {
  const result = await prisma.$transaction((tx) => createInventoryItemInTx(tx, input, userId));
  await writeInventoryItemCreatedAuditLogs(result, input.productName, userId);
  return {
    id: result.item.id,
    barcodeCode: formatBarcodeCode(result.barcode.sequence),
    productId: result.product.id,
  };
}

/** Exposed for purchase.service.ts — see createInventoryItemInTx's doc comment. */
export { createInventoryItemInTx, writeInventoryItemCreatedAuditLogs };
export type { CreateInventoryItemTxResult };

export async function updateInventoryItem(
  input: UpdateInventoryItemInput,
  userId: string,
): Promise<void> {
  const existing = await prisma.inventoryItem.findUniqueOrThrow({
    where: { id: input.id },
    include: { product: true },
  });

  const { goldCalc, pricing } = computeItemFinancials(input);
  const goldRateSourceId = await resolveGoldRateSourceId(input.purity, goldCalc.goldRate);

  const netWeight = roundDp(goldCalc.netWeight, WEIGHT_DP);
  const wastageWeight = roundDp(goldCalc.wastageWeight, WEIGHT_DP);
  const grossWeight = roundDp(goldCalc.grossWeight, WEIGHT_DP);
  const wastagePercent = goldCalc.wastagePercent ? roundDp(goldCalc.wastagePercent, WEIGHT_DP) : null;
  const goldValue = roundDp(goldCalc.goldValue, MONEY_DP);
  const makingCharge = roundDp(pricing.makingCharge, MONEY_DP);
  const stoneCharge = roundDp(pricing.stoneCharge, MONEY_DP);
  const diamondCharge = roundDp(pricing.diamondCharge, MONEY_DP);
  const otherCharge = roundDp(pricing.otherCharge, MONEY_DP);
  const totalCost = roundDp(pricing.totalCost, MONEY_DP);
  const sellingPrice = roundDp(pricing.sellingPrice, MONEY_DP);
  const expectedProfit = roundDp(pricing.expectedProfit, MONEY_DP);
  const profitMarginPercent = roundDp(pricing.profitMarginPercent, PERCENT_DP);

  if (sellingPrice.lt(totalCost) && !input.confirmLowerPrice) {
    throw new LowerPriceConfirmationRequiredError();
  }

  const resolvedImageUrl = input.removeImage ? null : (input.imageUrl ?? existing.product.imageUrl);

  // Formatted (not raw .toString()) so the Stock History "before/after" table
  // reads as real numbers — Decimal#toString() strips trailing zeros (e.g.
  // "500000.00" -> "500000"), which is exactly why display code always goes
  // through these formatters instead of the raw string form.
  const financialBefore: Record<string, string> = {
    purity: existing.purity,
    netWeight: formatWeight(existing.netWeight),
    wastageType: existing.wastageType,
    wastagePercent: existing.wastagePercent ? `${existing.wastagePercent.toString()}%` : "",
    wastageWeight: formatWeight(existing.wastageWeight),
    grossWeight: formatWeight(existing.grossWeight),
    goldRatePerGram: formatRatePerGram(existing.goldRatePerGram),
    goldValue: formatCurrency(existing.goldValue),
    makingCharge: formatCurrency(existing.makingCharge),
    stoneCharge: formatCurrency(existing.stoneCharge),
    diamondCharge: formatCurrency(existing.diamondCharge),
    otherCharge: formatCurrency(existing.otherCharge),
    totalCost: formatCurrency(existing.totalCost),
    sellingPrice: formatCurrency(existing.sellingPrice),
  };
  const financialAfter: Record<string, string> = {
    purity: input.purity,
    netWeight: formatWeight(netWeight),
    wastageType: input.wastageType,
    wastagePercent: wastagePercent ? `${wastagePercent.toString()}%` : "",
    wastageWeight: formatWeight(wastageWeight),
    grossWeight: formatWeight(grossWeight),
    goldRatePerGram: formatRatePerGram(goldCalc.goldRate),
    goldValue: formatCurrency(goldValue),
    makingCharge: formatCurrency(makingCharge),
    stoneCharge: formatCurrency(stoneCharge),
    diamondCharge: formatCurrency(diamondCharge),
    otherCharge: formatCurrency(otherCharge),
    totalCost: formatCurrency(totalCost),
    sellingPrice: formatCurrency(sellingPrice),
  };

  const nonFinancialBefore: Record<string, string> = {
    productName: existing.product.name,
    categoryId: existing.product.categoryId,
    subcategory: existing.product.subcategory ?? "",
    designNumber: existing.product.designNumber ?? "",
    supplier: existing.product.supplier ?? "",
    karigar: existing.product.karigar ?? "",
    notes: existing.product.notes ?? "",
    imageUrl: existing.product.imageUrl ?? "",
  };
  const nonFinancialAfter: Record<string, string> = {
    productName: input.productName,
    categoryId: input.categoryId,
    subcategory: input.subcategory ?? "",
    designNumber: input.designNumber ?? "",
    supplier: input.supplier ?? "",
    karigar: input.karigar ?? "",
    notes: input.notes ?? "",
    imageUrl: resolvedImageUrl ?? "",
  };

  const financialChanges: Record<string, { before: string; after: string }> = {};
  for (const key of Object.keys(financialBefore)) {
    if (financialBefore[key] !== financialAfter[key]) {
      financialChanges[key] = { before: financialBefore[key], after: financialAfter[key] };
    }
  }
  const changedFields = [
    ...Object.keys(financialChanges),
    ...Object.keys(nonFinancialBefore).filter((key) => nonFinancialBefore[key] !== nonFinancialAfter[key]),
  ];

  await prisma.$transaction(async (tx) => {
    await tx.product.update({
      where: { id: existing.productId },
      data: {
        name: input.productName,
        categoryId: input.categoryId,
        subcategory: input.subcategory || null,
        designNumber: input.designNumber || null,
        supplier: input.supplier || null,
        karigar: input.karigar || null,
        imageUrl: resolvedImageUrl,
        notes: input.notes || null,
      },
    });

    await tx.inventoryItem.update({
      where: { id: input.id },
      data: {
        purity: input.purity,
        netWeight: netWeight.toString(),
        wastageType: input.wastageType,
        wastagePercent: wastagePercent ? wastagePercent.toString() : null,
        wastageWeight: wastageWeight.toString(),
        grossWeight: grossWeight.toString(),
        goldRatePerGram: goldCalc.goldRate.toString(),
        goldRateSourceId,
        goldValue: goldValue.toString(),
        makingCharge: makingCharge.toString(),
        stoneCharge: stoneCharge.toString(),
        diamondCharge: diamondCharge.toString(),
        otherCharge: otherCharge.toString(),
        totalCost: totalCost.toString(),
        sellingPrice: sellingPrice.toString(),
        expectedProfit: expectedProfit.toString(),
        profitMarginPercent: profitMarginPercent.toString(),
      },
    });

    if (Object.keys(financialChanges).length > 0) {
      await recordStockMovement(tx, {
        inventoryItemId: input.id,
        movementType: "STOCK_UPDATED",
        previousStatus: existing.status,
        newStatus: existing.status,
        weight: grossWeight.toString(),
        userId,
        metadata: { changes: financialChanges },
      });
    }
  });

  if (changedFields.length > 0) {
    await writeAuditLog({
      userId,
      action: "STOCK_UPDATED",
      entity: "InventoryItem",
      entityId: input.id,
      metadata: { changedFields },
    });
  }
  if (Object.keys(financialChanges).length > 0) {
    await writeAuditLog({
      userId,
      action: "FINANCIAL_FIELDS_CHANGED",
      entity: "InventoryItem",
      entityId: input.id,
      metadata: { changes: financialChanges },
    });
  }
}

function mapStatusToMovementType(status: StockStatusValue): StockMovementType {
  switch (status) {
    case "RESERVED":
      return "STOCK_RESERVED";
    case "SOLD":
      return "STOCK_SOLD";
    case "RETURNED":
      return "STOCK_RETURNED";
    case "DAMAGED":
      return "STOCK_DAMAGED";
    case "LOST":
      return "STOCK_LOST";
    case "IN_STOCK":
    default:
      return "STOCK_ADJUSTED";
  }
}

/**
 * The atomic primitive behind every status change: a conditional
 * `UPDATE ... WHERE status = <expected>` (check-and-set, immune to a
 * concurrent writer racing the same row — see SALES.md "Concurrency") plus
 * its StockMovement, both inside the caller's transaction. Exported so
 * Phase 3's return-approval flow can fold this into one larger transaction
 * (inventory status + Return + Sale status, all atomic) instead of either
 * duplicating this logic or nesting a second top-level transaction inside
 * it. `changeInventoryItemStatus` below is the single-purpose wrapper for
 * every other caller.
 */
export async function transitionInventoryStatusInTx(
  tx: Prisma.TransactionClient,
  input: {
    id: string;
    expectedStatus: StockStatusValue;
    newStatus: StockStatusValue;
    weight: Prisma.Decimal | number | string;
    userId: string;
    notes?: string;
    saleId?: string;
  },
): Promise<void> {
  const updated = await tx.inventoryItem.updateMany({
    where: { id: input.id, status: input.expectedStatus },
    data: { status: input.newStatus },
  });
  if (updated.count !== 1) {
    throw new InvalidStatusTransitionError(input.expectedStatus, input.newStatus);
  }
  await recordStockMovement(tx, {
    inventoryItemId: input.id,
    movementType: mapStatusToMovementType(input.newStatus),
    previousStatus: input.expectedStatus,
    newStatus: input.newStatus,
    weight: input.weight,
    notes: input.notes,
    userId: input.userId,
    saleId: input.saleId,
  });
}

export async function changeInventoryItemStatus(
  id: string,
  newStatus: StockStatusValue,
  userId: string,
  notes?: string,
): Promise<void> {
  const existing = await prisma.inventoryItem.findUniqueOrThrow({
    where: { id },
    select: { status: true, grossWeight: true },
  });

  const allowed = STOCK_STATUS_TRANSITIONS[existing.status as StockStatusValue];
  if (existing.status !== newStatus && !allowed.includes(newStatus)) {
    throw new InvalidStatusTransitionError(existing.status, newStatus);
  }

  await prisma.$transaction(async (tx) => {
    await transitionInventoryStatusInTx(tx, {
      id,
      expectedStatus: existing.status,
      newStatus,
      weight: existing.grossWeight,
      userId,
      notes,
    });
  });

  await writeAuditLog({
    userId,
    action: "STOCK_STATUS_CHANGED",
    entity: "InventoryItem",
    entityId: id,
    metadata: { previousStatus: existing.status, newStatus },
  });
}

export async function archiveInventoryItem(
  id: string,
  userId: string,
  notes?: string,
): Promise<void> {
  const existing = await prisma.inventoryItem.findUniqueOrThrow({
    where: { id },
    select: { status: true, grossWeight: true, archivedAt: true },
  });
  if (existing.archivedAt) return;

  await prisma.$transaction(async (tx) => {
    await tx.inventoryItem.update({ where: { id }, data: { archivedAt: new Date() } });
    await recordStockMovement(tx, {
      inventoryItemId: id,
      movementType: "STOCK_ARCHIVED",
      previousStatus: existing.status,
      newStatus: existing.status,
      weight: existing.grossWeight,
      notes,
      userId,
    });
  });

  await writeAuditLog({
    userId,
    action: "STOCK_ARCHIVED",
    entity: "InventoryItem",
    entityId: id,
    metadata: {},
  });
}

const ITEM_DETAIL_INCLUDE = {
  product: { include: { category: true } },
  barcode: true,
  createdBy: { select: { id: true, name: true } },
  goldRateSource: { select: { id: true, businessDate: true } },
} satisfies Prisma.InventoryItemInclude;

export type InventoryItemDetail = Prisma.InventoryItemGetPayload<{
  include: typeof ITEM_DETAIL_INCLUDE;
}>;

export async function getInventoryItemById(id: string): Promise<InventoryItemDetail | null> {
  return prisma.inventoryItem.findUnique({ where: { id }, include: ITEM_DETAIL_INCLUDE });
}

/** Used by POS barcode scan / manual code entry — see POS.md "Barcode scanning". */
export async function getInventoryItemByBarcode(code: string): Promise<InventoryItemDetail | null> {
  const sequence = parseBarcodeCode(code);
  if (sequence === null) return null;
  return prisma.inventoryItem.findFirst({
    where: { barcode: { sequence } },
    include: ITEM_DETAIL_INCLUDE,
  });
}

/**
 * Projects InventoryItemDetail to plain strings/primitives — Prisma's
 * Decimal instances cannot be passed as props into a Client Component
 * ("use client" boundary), so every Server Component handing item data to
 * <StockForm> must go through this first.
 */
export function toEditableStockItem(item: InventoryItemDetail): EditableStockItem {
  return {
    id: item.id,
    purity: item.purity,
    netWeight: item.netWeight.toString(),
    wastageType: item.wastageType,
    wastagePercent: item.wastagePercent ? item.wastagePercent.toString() : null,
    wastageWeight: item.wastageWeight.toString(),
    goldRatePerGram: item.goldRatePerGram.toString(),
    makingCharge: item.makingCharge.toString(),
    stoneCharge: item.stoneCharge.toString(),
    diamondCharge: item.diamondCharge.toString(),
    otherCharge: item.otherCharge.toString(),
    sellingPrice: item.sellingPrice.toString(),
    barcodeCode: item.barcode ? formatBarcodeCode(item.barcode.sequence) : null,
    product: {
      name: item.product.name,
      categoryId: item.product.categoryId,
      subcategory: item.product.subcategory,
      designNumber: item.product.designNumber,
      supplier: item.product.supplier,
      karigar: item.product.karigar,
      notes: item.product.notes,
      imageUrl: item.product.imageUrl,
    },
  };
}

/** Projects an inventory row to POS-safe serialized strings — see toEditableStockItem. */
export function toPosCatalogItem(item: InventoryListRow): PosCatalogItem {
  return {
    inventoryItemId: item.id,
    barcodeCode: item.barcode ? formatBarcodeCode(item.barcode.sequence) : null,
    productName: item.product.name,
    categoryName: item.product.category?.name ?? null,
    imageUrl: item.product.imageUrl,
    status: item.status,
    purity: item.purity,
    netWeight: item.netWeight.toString(),
    wastageType: item.wastageType,
    wastagePercent: item.wastagePercent ? item.wastagePercent.toString() : null,
    wastageWeight: item.wastageWeight.toString(),
    grossWeight: item.grossWeight.toString(),
    goldRatePerGram: item.goldRatePerGram.toString(),
    goldValue: item.goldValue.toString(),
    makingCharge: item.makingCharge.toString(),
    stoneCharge: item.stoneCharge.toString(),
    diamondCharge: item.diamondCharge.toString(),
    otherCharge: item.otherCharge.toString(),
    sellingPrice: item.sellingPrice.toString(),
  };
}

const LIST_ROW_INCLUDE = {
  product: { include: { category: true } },
  barcode: true,
} satisfies Prisma.InventoryItemInclude;

export type InventoryListRow = Prisma.InventoryItemGetPayload<{ include: typeof LIST_ROW_INCLUDE }>;

function mapSortToOrderBy(
  sort: InventoryListFilters["sort"],
): Prisma.InventoryItemOrderByWithRelationInput {
  switch (sort) {
    case "OLDEST":
      return { createdAt: "asc" };
    case "PRICE_HIGH":
      return { sellingPrice: "desc" };
    case "PRICE_LOW":
      return { sellingPrice: "asc" };
    case "WEIGHT_HIGH":
      return { grossWeight: "desc" };
    case "WEIGHT_LOW":
      return { grossWeight: "asc" };
    case "PROFIT_HIGH":
      return { expectedProfit: "desc" };
    case "NEWEST":
    default:
      return { createdAt: "desc" };
  }
}

export async function listInventoryItems(
  filters: InventoryListFilters,
): Promise<{ rows: InventoryListRow[]; total: number }> {
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, filters.pageSize ?? 20));

  const productWhere: Prisma.ProductWhereInput = {};
  if (filters.categoryId) productWhere.categoryId = filters.categoryId;
  if (filters.supplier) productWhere.supplier = { contains: filters.supplier, mode: "insensitive" };
  if (filters.karigar) productWhere.karigar = { contains: filters.karigar, mode: "insensitive" };

  const where: Prisma.InventoryItemWhereInput = {
    archivedAt: filters.includeArchived ? undefined : null,
  };
  if (Object.keys(productWhere).length > 0) where.product = productWhere;
  if (filters.purity) where.purity = filters.purity;
  if (filters.status) where.status = filters.status;
  if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
    where.sellingPrice = { gte: filters.minPrice, lte: filters.maxPrice };
  }
  if (filters.minWeight !== undefined || filters.maxWeight !== undefined) {
    where.grossWeight = { gte: filters.minWeight, lte: filters.maxWeight };
  }
  if (filters.dateFrom || filters.dateTo) {
    where.createdAt = { gte: filters.dateFrom, lte: filters.dateTo };
  }

  if (filters.search) {
    const parsedBarcode = parseBarcodeCode(filters.search);
    where.OR = [
      { product: { name: { contains: filters.search, mode: "insensitive" } } },
      { product: { designNumber: { contains: filters.search, mode: "insensitive" } } },
      { product: { supplier: { contains: filters.search, mode: "insensitive" } } },
      { product: { karigar: { contains: filters.search, mode: "insensitive" } } },
      { product: { category: { name: { contains: filters.search, mode: "insensitive" } } } },
      ...(parsedBarcode !== null ? [{ barcode: { sequence: parsedBarcode } }] : []),
    ];
  }

  const [rows, total] = await Promise.all([
    prisma.inventoryItem.findMany({
      where,
      orderBy: mapSortToOrderBy(filters.sort),
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: LIST_ROW_INCLUDE,
    }),
    prisma.inventoryItem.count({ where }),
  ]);

  return { rows, total };
}

/** POS product search — only ever offers items that are actually sellable right now. */
export async function searchInventoryForSale(query: string, limit = 15): Promise<PosCatalogItem[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];
  const { rows } = await listInventoryItems({ search: trimmed, status: "IN_STOCK", page: 1, pageSize: limit });
  return rows.map(toPosCatalogItem);
}

export type InventorySummary = {
  totalItems: number;
  inStock: number;
  reserved: number;
  sold: number;
  totalCostValue: string;
  totalSellingValue: string;
  expectedGrossProfit: string;
};

/** Cost/selling/profit figures exclude SOLD items — see INVENTORY.md "Stock valuation". */
export async function getInventorySummary(): Promise<InventorySummary> {
  const [totalItems, inStock, reserved, sold, valuationAgg] = await Promise.all([
    prisma.inventoryItem.count({ where: { archivedAt: null } }),
    prisma.inventoryItem.count({ where: { archivedAt: null, status: "IN_STOCK" } }),
    prisma.inventoryItem.count({ where: { archivedAt: null, status: "RESERVED" } }),
    prisma.inventoryItem.count({ where: { archivedAt: null, status: "SOLD" } }),
    prisma.inventoryItem.aggregate({
      where: { archivedAt: null, status: { not: "SOLD" } },
      _sum: { totalCost: true, sellingPrice: true },
    }),
  ]);

  const totalCostValue = new Decimal(valuationAgg._sum.totalCost?.toString() ?? 0);
  const totalSellingValue = new Decimal(valuationAgg._sum.sellingPrice?.toString() ?? 0);
  const expectedGrossProfit = totalSellingValue.sub(totalCostValue);

  return {
    totalItems,
    inStock,
    reserved,
    sold,
    totalCostValue: totalCostValue.toString(),
    totalSellingValue: totalSellingValue.toString(),
    expectedGrossProfit: expectedGrossProfit.toString(),
  };
}

export type OldStockRow = {
  id: string;
  barcodeSequence: number | null;
  productName: string;
  createdAt: Date;
  totalCost: Prisma.Decimal;
  sellingPrice: Prisma.Decimal;
  daysInStock: number;
};

/** Items still IN_STOCK, created at least `minDays` ago — see INVENTORY.md "Old stock". */
export async function getOldStock(minDays: number): Promise<OldStockRow[]> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - minDays);

  const rows = await prisma.inventoryItem.findMany({
    where: { archivedAt: null, status: "IN_STOCK", createdAt: { lte: cutoff } },
    orderBy: { createdAt: "asc" },
    include: { product: true, barcode: true },
  });

  const now = Date.now();
  return rows.map((row) => ({
    id: row.id,
    barcodeSequence: row.barcode?.sequence ?? null,
    productName: row.product.name,
    createdAt: row.createdAt,
    totalCost: row.totalCost,
    sellingPrice: row.sellingPrice,
    daysInStock: Math.floor((now - row.createdAt.getTime()) / (1000 * 60 * 60 * 24)),
  }));
}

export async function recordBarcodePrint(inventoryItemId: string, userId: string): Promise<void> {
  const barcode = await prisma.barcode.update({
    where: { inventoryItemId },
    data: { printCount: { increment: 1 }, lastPrintedAt: new Date() },
  });

  await writeAuditLog({
    userId,
    action: "BARCODE_PRINTED",
    entity: "Barcode",
    entityId: barcode.id,
    metadata: { code: formatBarcodeCode(barcode.sequence), inventoryItemId },
  });
}
