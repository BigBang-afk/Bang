import "server-only";
import type Decimal from "decimal.js";
import { prisma } from "@/lib/db/prisma";
import { writeAuditLog } from "@/services/audit.service";
import { getSystemSetting } from "@/services/system-setting.service";
import { SETTINGS_KEYS } from "@/lib/settings-keys";
import { Prisma } from "@/generated/prisma/client";
import type { CashDirection, CashTransactionType, PaymentMethod } from "@/generated/prisma/client";

type PrismaTx = Prisma.TransactionClient;

/**
 * The company-wide physical cash book — append-only. See
 * CASH-MANAGEMENT.md. Distinct from party-cash-ledger.service.ts: this
 * tracks how much cash the business physically holds; the party ledger
 * tracks what is owed to/from one specific karigar or supplier. A sale
 * payment and a karigar cash payment both write here AND, where relevant,
 * to a party ledger — two different books recording the same event from
 * two different angles.
 */

export class InvalidCashAmountError extends Error {
  constructor(message = "Amount must be greater than zero.") {
    super(message);
    this.name = "InvalidCashAmountError";
  }
}

export type RecordCashTransactionInput = {
  transactionType: CashTransactionType;
  direction: CashDirection;
  amount: string | number | Decimal;
  paymentMethod: PaymentMethod;
  referenceType?: string;
  referenceId?: string;
  description?: string;
  createdById: string;
};

/** The single write path for CashTransaction — composable inside another service's own transaction. */
export async function recordCashTransactionInTx(
  tx: PrismaTx,
  input: RecordCashTransactionInput,
): Promise<{ id: string }> {
  if (!(new Prisma.Decimal(input.amount).gt(0))) throw new InvalidCashAmountError();

  const row = await tx.cashTransaction.create({
    data: {
      transactionType: input.transactionType,
      direction: input.direction,
      amount: String(input.amount),
      paymentMethod: input.paymentMethod,
      referenceType: input.referenceType ?? null,
      referenceId: input.referenceId ?? null,
      description: input.description ?? null,
      createdById: input.createdById,
    },
  });

  return { id: row.id };
}

export type RecordExpenseInput = {
  amount: number;
  paymentMethod: PaymentMethod;
  description: string;
};

/** A standalone business expense — always OUT, always requires a description. */
export async function recordExpense(input: RecordExpenseInput, userId: string): Promise<{ id: string }> {
  const result = await prisma.$transaction(async (tx) =>
    recordCashTransactionInTx(tx, {
      transactionType: "EXPENSE",
      direction: "OUT",
      amount: input.amount,
      paymentMethod: input.paymentMethod,
      description: input.description,
      createdById: userId,
    }),
  );

  await writeAuditLog({
    userId,
    action: "CASH_TRANSACTION_RECORDED",
    entity: "CashTransaction",
    entityId: result.id,
    metadata: { transactionType: "EXPENSE", amount: input.amount, paymentMethod: input.paymentMethod },
  });

  return result;
}

export type RecordCashAdjustmentInput = {
  amount: number;
  direction: CashDirection;
  paymentMethod: PaymentMethod;
  reason: string;
};

/**
 * A manual physical-cash correction — never automatic, and never applied
 * by a reconciliation check on its own (see RECONCILIATION.md). Always
 * requires a reason; the acting user and timestamp are the standard
 * createdById/createdAt columns every CashTransaction already carries.
 */
export async function recordCashAdjustment(input: RecordCashAdjustmentInput, userId: string): Promise<{ id: string }> {
  if (!input.reason.trim()) throw new Error("A reason is required for a cash adjustment.");

  const result = await prisma.$transaction(async (tx) =>
    recordCashTransactionInTx(tx, {
      transactionType: "CASH_ADJUSTMENT",
      direction: input.direction,
      amount: input.amount,
      paymentMethod: input.paymentMethod,
      description: input.reason,
      createdById: userId,
    }),
  );

  await writeAuditLog({
    userId,
    action: "CASH_ADJUSTED",
    entity: "CashTransaction",
    entityId: result.id,
    metadata: { direction: input.direction, amount: input.amount, reason: input.reason },
  });

  return result;
}

export type CashTransactionRow = {
  id: string;
  transactionType: CashTransactionType;
  direction: CashDirection;
  amount: Prisma.Decimal;
  paymentMethod: PaymentMethod;
  referenceType: string | null;
  referenceId: string | null;
  description: string | null;
  createdAt: Date;
  createdBy: { id: string; name: string };
};

const CASH_TRANSACTION_SELECT = {
  id: true,
  transactionType: true,
  direction: true,
  amount: true,
  paymentMethod: true,
  referenceType: true,
  referenceId: true,
  description: true,
  createdAt: true,
  createdBy: { select: { id: true, name: true } },
} satisfies Prisma.CashTransactionSelect;

export type CashTransactionFilters = {
  transactionType?: CashTransactionType;
  paymentMethod?: PaymentMethod;
  dateFrom?: Date;
  dateTo?: Date;
  page?: number;
  pageSize?: number;
};

export async function listCashTransactions(
  filters: CashTransactionFilters,
): Promise<{ rows: CashTransactionRow[]; total: number }> {
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, filters.pageSize ?? 20));

  const where: Prisma.CashTransactionWhereInput = {
    ...(filters.transactionType ? { transactionType: filters.transactionType } : {}),
    ...(filters.paymentMethod ? { paymentMethod: filters.paymentMethod } : {}),
    ...(filters.dateFrom || filters.dateTo ? { createdAt: { gte: filters.dateFrom, lte: filters.dateTo } } : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.cashTransaction.findMany({
      where,
      select: CASH_TRANSACTION_SELECT,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.cashTransaction.count({ where }),
  ]);

  return { rows, total };
}

const DEFAULT_OPENING_BALANCE = "0";

/**
 * Opening Cash + Cash Received - Cash Paid (+/- adjustments, folded into
 * IN/OUT by their own direction) = Closing Cash. Live-computed, never
 * cached — see CASH-MANAGEMENT.md "Cash balance". `paymentMethod` scopes
 * this to one method (e.g. CASH only, for the physical till) when passed;
 * omitted, it's the all-methods running total.
 */
export async function getCashBalance(paymentMethod?: PaymentMethod): Promise<string> {
  const openingSetting = await getSystemSetting(SETTINGS_KEYS.CASH_OPENING_BALANCE);
  const opening = new Prisma.Decimal(openingSetting || DEFAULT_OPENING_BALANCE);

  const where: Prisma.CashTransactionWhereInput = paymentMethod ? { paymentMethod } : {};
  const [inSum, outSum] = await Promise.all([
    prisma.cashTransaction.aggregate({ where: { ...where, direction: "IN" }, _sum: { amount: true } }),
    prisma.cashTransaction.aggregate({ where: { ...where, direction: "OUT" }, _sum: { amount: true } }),
  ]);

  const balance = opening
    .add(inSum._sum.amount ?? new Prisma.Decimal(0))
    .sub(outSum._sum.amount ?? new Prisma.Decimal(0));

  return balance.toString();
}

export type CashSummary = {
  openingBalance: string;
  totalIn: string;
  totalOut: string;
  closingBalance: string;
  byType: { transactionType: CashTransactionType; direction: CashDirection; total: string; count: number }[];
};

/** The Cash Summary report — real aggregates, no placeholder figures. */
export async function getCashSummary(): Promise<CashSummary> {
  const openingSetting = await getSystemSetting(SETTINGS_KEYS.CASH_OPENING_BALANCE);
  const opening = new Prisma.Decimal(openingSetting || DEFAULT_OPENING_BALANCE);

  const [inSum, outSum, grouped] = await Promise.all([
    prisma.cashTransaction.aggregate({ where: { direction: "IN" }, _sum: { amount: true } }),
    prisma.cashTransaction.aggregate({ where: { direction: "OUT" }, _sum: { amount: true } }),
    prisma.cashTransaction.groupBy({
      by: ["transactionType", "direction"],
      _sum: { amount: true },
      _count: { _all: true },
    }),
  ]);

  const totalIn = inSum._sum.amount ?? new Prisma.Decimal(0);
  const totalOut = outSum._sum.amount ?? new Prisma.Decimal(0);

  return {
    openingBalance: opening.toString(),
    totalIn: totalIn.toString(),
    totalOut: totalOut.toString(),
    closingBalance: opening.add(totalIn).sub(totalOut).toString(),
    byType: grouped.map((g) => ({
      transactionType: g.transactionType,
      direction: g.direction,
      total: (g._sum.amount ?? new Prisma.Decimal(0)).toString(),
      count: g._count._all,
    })),
  };
}
