import "server-only";
import { prisma } from "@/lib/db/prisma";
import { writeAuditLog } from "@/services/audit.service";
import {
  transitionInventoryStatusInTx,
  InvalidStatusTransitionError,
} from "@/services/inventory-item.service";
import { STOCK_STATUS_TRANSITIONS, type StockStatusValue } from "@/types/inventory";

/**
 * Returns foundation only — see SALES.md "Returns foundation". Two-step by
 * design: requestReturn() never touches inventory; approveReturn() is the
 * only path that moves an item SOLD -> RETURNED, and it does so atomically
 * alongside the Return and Sale status updates.
 */

export class ReturnNotFoundError extends Error {
  constructor() {
    super("Return could not be found.");
    this.name = "ReturnNotFoundError";
  }
}

export class ReturnAlreadyExistsError extends Error {
  constructor() {
    super("A return has already been requested for this item.");
    this.name = "ReturnAlreadyExistsError";
  }
}

export class ReturnAlreadyProcessedError extends Error {
  constructor() {
    super("This return has already been processed.");
    this.name = "ReturnAlreadyProcessedError";
  }
}

export class SaleItemNotSoldError extends Error {
  constructor() {
    super("Only sold items can be returned.");
    this.name = "SaleItemNotSoldError";
  }
}

export async function requestReturn(
  saleItemId: string,
  reason: string,
  userId: string,
): Promise<{ id: string }> {
  const saleItem = await prisma.saleItem.findUnique({
    where: { id: saleItemId },
    include: { return: true, inventoryItem: { select: { status: true } } },
  });
  if (!saleItem) throw new ReturnNotFoundError();
  if (saleItem.return) throw new ReturnAlreadyExistsError();
  if (saleItem.inventoryItem.status !== "SOLD") throw new SaleItemNotSoldError();

  const ret = await prisma.return.create({
    data: {
      saleItemId,
      reason,
      status: "RETURN_REQUESTED",
      requestedById: userId,
    },
  });

  await writeAuditLog({
    userId,
    action: "RETURN_REQUESTED",
    entity: "Return",
    entityId: ret.id,
    metadata: { saleItemId, reason },
  });

  return { id: ret.id };
}

export async function approveReturn(
  returnId: string,
  userId: string,
  notes?: string,
): Promise<void> {
  const ret = await prisma.return.findUnique({
    where: { id: returnId },
    include: {
      saleItem: {
        include: {
          inventoryItem: { select: { id: true, status: true } },
          sale: { include: { items: { include: { return: true } } } },
        },
      },
    },
  });
  if (!ret) throw new ReturnNotFoundError();
  if (ret.status !== "RETURN_REQUESTED") throw new ReturnAlreadyProcessedError();

  const currentInventoryStatus = ret.saleItem.inventoryItem.status as StockStatusValue;
  const allowed = STOCK_STATUS_TRANSITIONS[currentInventoryStatus];
  if (currentInventoryStatus !== "RETURNED" && !allowed.includes("RETURNED")) {
    throw new InvalidStatusTransitionError(currentInventoryStatus, "RETURNED");
  }

  await prisma.$transaction(async (tx) => {
    await transitionInventoryStatusInTx(tx, {
      id: ret.saleItem.inventoryItem.id,
      expectedStatus: currentInventoryStatus,
      newStatus: "RETURNED",
      weight: ret.saleItem.grossWeight,
      userId,
      notes,
      saleId: ret.saleItem.saleId,
    });

    await tx.return.update({
      where: { id: returnId },
      data: { status: "RETURNED", processedById: userId, processedAt: new Date() },
    });

    const items = ret.saleItem.sale.items;
    const returnedCount = items.filter((item) =>
      item.id === ret.saleItem.id ? true : item.return?.status === "RETURNED",
    ).length;
    const newSaleStatus = returnedCount >= items.length ? "RETURNED" : "PARTIALLY_RETURNED";
    await tx.sale.update({ where: { id: ret.saleItem.saleId }, data: { status: newSaleStatus } });
  });

  await writeAuditLog({
    userId,
    action: "RETURN_APPROVED",
    entity: "Return",
    entityId: returnId,
    metadata: { saleItemId: ret.saleItemId },
  });
  await writeAuditLog({
    userId,
    action: "STOCK_STATUS_CHANGED",
    entity: "InventoryItem",
    entityId: ret.saleItem.inventoryItem.id,
    metadata: { previousStatus: currentInventoryStatus, newStatus: "RETURNED" },
  });
}

export type ReturnListRow = {
  id: string;
  status: string;
  reason: string;
  requestedAt: Date;
  processedAt: Date | null;
  saleItem: {
    id: string;
    productName: string;
    barcodeCode: string;
    finalPrice: unknown;
    sale: { id: string; customer: { name: string } | null; invoice: { sequence: number } | null };
  };
  requestedBy: { id: string; name: string };
  processedBy: { id: string; name: string } | null;
};

export async function listReturns(filter?: { status?: "RETURN_REQUESTED" | "RETURNED" }) {
  return prisma.return.findMany({
    where: filter?.status ? { status: filter.status } : undefined,
    orderBy: { requestedAt: "desc" },
    include: {
      saleItem: {
        include: {
          sale: {
            include: {
              customer: { select: { name: true } },
              invoice: { select: { sequence: true } },
            },
          },
        },
      },
      requestedBy: { select: { id: true, name: true } },
      processedBy: { select: { id: true, name: true } },
    },
  });
}

export async function getReturnById(id: string) {
  return prisma.return.findUnique({
    where: { id },
    include: {
      saleItem: {
        include: {
          sale: {
            include: {
              customer: { select: { name: true, phone: true } },
              invoice: { select: { sequence: true } },
            },
          },
          inventoryItem: { select: { status: true } },
        },
      },
      requestedBy: { select: { id: true, name: true } },
      processedBy: { select: { id: true, name: true } },
    },
  });
}
