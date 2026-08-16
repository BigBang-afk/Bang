import "server-only";
import { prisma } from "@/lib/db/prisma";
import type { Prisma, StockMovementType, StockStatus } from "@/generated/prisma/client";

type PrismaTx = Prisma.TransactionClient;

export type RecordMovementInput = {
  inventoryItemId: string;
  movementType: StockMovementType;
  previousStatus?: StockStatus | null;
  newStatus?: StockStatus | null;
  weight?: Prisma.Decimal | number | string | null;
  notes?: string | null;
  metadata?: Prisma.InputJsonValue;
  userId: string | null;
};

/** Always call within the same transaction as the state change it records. */
export async function recordStockMovement(
  tx: PrismaTx,
  input: RecordMovementInput,
): Promise<void> {
  await tx.stockMovement.create({
    data: {
      inventoryItemId: input.inventoryItemId,
      movementType: input.movementType,
      previousStatus: input.previousStatus ?? null,
      newStatus: input.newStatus ?? null,
      weight: input.weight ?? null,
      notes: input.notes ?? null,
      metadata: input.metadata,
      userId: input.userId,
    },
  });
}

export type StockMovementRow = {
  id: string;
  movementType: StockMovementType;
  previousStatus: StockStatus | null;
  newStatus: StockStatus | null;
  weight: Prisma.Decimal | null;
  notes: string | null;
  metadata: Prisma.JsonValue;
  createdAt: Date;
  user: { id: string; name: string } | null;
  inventoryItem: {
    id: string;
    barcode: { sequence: number } | null;
    product: { name: string };
  };
};

export async function listStockMovementsForItem(
  inventoryItemId: string,
): Promise<StockMovementRow[]> {
  return prisma.stockMovement.findMany({
    where: { inventoryItemId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      movementType: true,
      previousStatus: true,
      newStatus: true,
      weight: true,
      notes: true,
      metadata: true,
      createdAt: true,
      user: { select: { id: true, name: true } },
      inventoryItem: {
        select: {
          id: true,
          barcode: { select: { sequence: true } },
          product: { select: { name: true } },
        },
      },
    },
  });
}

export async function listStockMovements(filter: {
  page: number;
  pageSize: number;
}): Promise<{ rows: StockMovementRow[]; total: number }> {
  const [rows, total] = await Promise.all([
    prisma.stockMovement.findMany({
      orderBy: { createdAt: "desc" },
      skip: (filter.page - 1) * filter.pageSize,
      take: filter.pageSize,
      select: {
        id: true,
        movementType: true,
        previousStatus: true,
        newStatus: true,
        weight: true,
        notes: true,
        metadata: true,
        createdAt: true,
        user: { select: { id: true, name: true } },
        inventoryItem: {
          select: {
            id: true,
            barcode: { select: { sequence: true } },
            product: { select: { name: true } },
          },
        },
      },
    }),
    prisma.stockMovement.count(),
  ]);

  return { rows, total };
}
