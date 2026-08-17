import "server-only";
import Decimal from "decimal.js";
import { prisma } from "@/lib/db/prisma";
import { writeAuditLog } from "@/services/audit.service";
import { getSystemGoldWeightForPurity } from "@/services/gold-ledger.service";
import { getCashBalance } from "@/services/cash-transaction.service";
import { Prisma } from "@/generated/prisma/client";
import type { GoldPurity, PaymentMethod, ReconciliationStatus } from "@/generated/prisma/client";

/**
 * Gold and cash reconciliation — a point-in-time comparison of what the
 * system computes against a physical count, always recorded as its own
 * row, NEVER auto-correcting either ledger. A mismatch is flagged
 * RECONCILIATION_REQUIRED; applying a fix is a deliberate, separate step
 * (gold-ledger.service.ts's recordGoldAdjustment() /
 * party-cash-ledger.service.ts's recordPartyCashAdjustment() /
 * cash-transaction.service.ts's recordCashAdjustment()), never implied by
 * running a reconciliation. See RECONCILIATION.md.
 */

export type GoldReconciliationResult = {
  id: string;
  purity: GoldPurity;
  systemWeight: string;
  physicalWeight: string;
  differenceWeight: string;
  status: ReconciliationStatus;
};

export async function runGoldReconciliation(
  input: { purity: GoldPurity; physicalWeight: number; notes?: string },
  userId: string,
): Promise<GoldReconciliationResult> {
  const systemWeight = await getSystemGoldWeightForPurity(input.purity);
  const physicalWeight = new Decimal(input.physicalWeight);
  const differenceWeight = systemWeight.sub(physicalWeight);
  const status: ReconciliationStatus = differenceWeight.isZero() ? "MATCHED" : "RECONCILIATION_REQUIRED";

  const row = await prisma.goldReconciliation.create({
    data: {
      purity: input.purity,
      systemWeight: systemWeight.toString(),
      physicalWeight: physicalWeight.toString(),
      differenceWeight: differenceWeight.toString(),
      status,
      notes: input.notes || null,
      createdById: userId,
    },
  });

  await writeAuditLog({
    userId,
    action: "GOLD_RECONCILIATION_COMPLETED",
    entity: "GoldReconciliation",
    entityId: row.id,
    metadata: {
      purity: input.purity,
      systemWeight: systemWeight.toString(),
      physicalWeight: physicalWeight.toString(),
      differenceWeight: differenceWeight.toString(),
      status,
    },
  });

  return {
    id: row.id,
    purity: row.purity,
    systemWeight: row.systemWeight.toString(),
    physicalWeight: row.physicalWeight.toString(),
    differenceWeight: row.differenceWeight.toString(),
    status: row.status,
  };
}

export type GoldReconciliationRow = GoldReconciliationResult & { notes: string | null; createdAt: Date; createdBy: { id: string; name: string } };

export async function listGoldReconciliations(purity?: GoldPurity): Promise<GoldReconciliationRow[]> {
  const rows = await prisma.goldReconciliation.findMany({
    where: purity ? { purity } : {},
    orderBy: { createdAt: "desc" },
    include: { createdBy: { select: { id: true, name: true } } },
  });
  return rows.map((row) => ({
    id: row.id,
    purity: row.purity,
    systemWeight: row.systemWeight.toString(),
    physicalWeight: row.physicalWeight.toString(),
    differenceWeight: row.differenceWeight.toString(),
    status: row.status,
    notes: row.notes,
    createdAt: row.createdAt,
    createdBy: row.createdBy,
  }));
}

/** The latest reconciliation run per purity — for the Gold Reconciliation summary cards. */
export async function getLatestGoldReconciliationByPurity(): Promise<Record<string, GoldReconciliationRow | null>> {
  const purities: GoldPurity[] = ["K24", "K22", "K21", "K18", "SILVER"];
  const result: Record<string, GoldReconciliationRow | null> = {};
  await Promise.all(
    purities.map(async (purity) => {
      const row = await prisma.goldReconciliation.findFirst({
        where: { purity },
        orderBy: { createdAt: "desc" },
        include: { createdBy: { select: { id: true, name: true } } },
      });
      result[purity] = row
        ? {
            id: row.id,
            purity: row.purity,
            systemWeight: row.systemWeight.toString(),
            physicalWeight: row.physicalWeight.toString(),
            differenceWeight: row.differenceWeight.toString(),
            status: row.status,
            notes: row.notes,
            createdAt: row.createdAt,
            createdBy: row.createdBy,
          }
        : null;
    }),
  );
  return result;
}

export type CashReconciliationResult = {
  id: string;
  systemAmount: string;
  physicalAmount: string;
  difference: string;
  status: ReconciliationStatus;
};

export async function runCashReconciliation(
  input: { physicalAmount: number; paymentMethod?: PaymentMethod; notes?: string },
  userId: string,
): Promise<CashReconciliationResult> {
  const systemAmountStr = await getCashBalance(input.paymentMethod ?? "CASH");
  const systemAmount = new Prisma.Decimal(systemAmountStr);
  const physicalAmount = new Prisma.Decimal(input.physicalAmount);
  const difference = systemAmount.sub(physicalAmount);
  const status: ReconciliationStatus = difference.isZero() ? "MATCHED" : "RECONCILIATION_REQUIRED";

  const row = await prisma.cashReconciliation.create({
    data: {
      systemAmount: systemAmount.toString(),
      physicalAmount: physicalAmount.toString(),
      difference: difference.toString(),
      status,
      notes: input.notes || null,
      createdById: userId,
    },
  });

  await writeAuditLog({
    userId,
    action: "CASH_RECONCILIATION_COMPLETED",
    entity: "CashReconciliation",
    entityId: row.id,
    metadata: {
      systemAmount: systemAmount.toString(),
      physicalAmount: physicalAmount.toString(),
      difference: difference.toString(),
      status,
    },
  });

  return {
    id: row.id,
    systemAmount: row.systemAmount.toString(),
    physicalAmount: row.physicalAmount.toString(),
    difference: row.difference.toString(),
    status: row.status,
  };
}

export type CashReconciliationRow = CashReconciliationResult & { notes: string | null; createdAt: Date; createdBy: { id: string; name: string } };

export async function listCashReconciliations(): Promise<CashReconciliationRow[]> {
  const rows = await prisma.cashReconciliation.findMany({
    orderBy: { createdAt: "desc" },
    include: { createdBy: { select: { id: true, name: true } } },
  });
  return rows.map((row) => ({
    id: row.id,
    systemAmount: row.systemAmount.toString(),
    physicalAmount: row.physicalAmount.toString(),
    difference: row.difference.toString(),
    status: row.status,
    notes: row.notes,
    createdAt: row.createdAt,
    createdBy: row.createdBy,
  }));
}

export async function getLatestCashReconciliation(): Promise<CashReconciliationRow | null> {
  const row = await prisma.cashReconciliation.findFirst({
    orderBy: { createdAt: "desc" },
    include: { createdBy: { select: { id: true, name: true } } },
  });
  return row
    ? {
        id: row.id,
        systemAmount: row.systemAmount.toString(),
        physicalAmount: row.physicalAmount.toString(),
        difference: row.difference.toString(),
        status: row.status,
        notes: row.notes,
        createdAt: row.createdAt,
        createdBy: row.createdBy,
      }
    : null;
}
