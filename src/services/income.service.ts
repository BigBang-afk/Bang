import "server-only";
import { prisma } from "@/lib/db/prisma";
import { writeAuditLog } from "@/services/audit.service";
import { recordCashTransactionInTx } from "@/services/cash-transaction.service";
import { formatIncomeNumber } from "@/lib/income-number";
import { Prisma } from "@/generated/prisma/client";
import type { IncomeType, PaymentMethod } from "@/generated/prisma/client";

/**
 * Standalone (non-POS) income — service charges, misc receipts. POS sales
 * are never duplicated here; they already flow through
 * sale-transaction.service.ts's SALE_PAYMENT cash entries. See
 * ACCOUNTING.md "Sources of truth". Same void/reversal correction policy
 * as expense.service.ts.
 */

export class InvalidIncomeAmountError extends Error {
  constructor(message = "Income amount must be greater than zero.") {
    super(message);
    this.name = "InvalidIncomeAmountError";
  }
}

export class InvalidIncomePaymentMethodError extends Error {
  constructor(message = "CREDIT is not a valid payment method for income — nothing was actually received.") {
    super(message);
    this.name = "InvalidIncomePaymentMethodError";
  }
}

export class IncomeNotFoundError extends Error {
  constructor(message = "Income entry not found.") {
    super(message);
    this.name = "IncomeNotFoundError";
  }
}

export class IncomeAlreadyVoidedError extends Error {
  constructor(message = "This income entry has already been voided.") {
    super(message);
    this.name = "IncomeAlreadyVoidedError";
  }
}

export class EmptyIncomeVoidReasonError extends Error {
  constructor(message = "A reason is required to void an income entry.") {
    super(message);
    this.name = "EmptyIncomeVoidReasonError";
  }
}

const NON_CREDIT_METHODS = new Set<PaymentMethod>(["CASH", "CARD", "BANK_TRANSFER", "OTHER"]);

export type CreateIncomeInput = {
  incomeType: IncomeType;
  description: string;
  amount: number;
  paymentMethod: PaymentMethod;
  incomeDate: Date;
  reference?: string;
  notes?: string;
  reversalOfId?: string;
};

export async function createIncome(
  input: CreateIncomeInput,
  userId: string,
): Promise<{ id: string; incomeNumber: string }> {
  if (!(input.amount > 0)) throw new InvalidIncomeAmountError();
  if (!NON_CREDIT_METHODS.has(input.paymentMethod)) throw new InvalidIncomePaymentMethodError();

  const income = await prisma.$transaction(async (tx) => {
    const created = await tx.income.create({
      data: {
        incomeType: input.incomeType,
        description: input.description,
        amount: String(input.amount),
        paymentMethod: input.paymentMethod,
        incomeDate: input.incomeDate,
        reference: input.reference || null,
        notes: input.notes || null,
        reversalOfId: input.reversalOfId || null,
        createdById: userId,
      },
    });

    await recordCashTransactionInTx(tx, {
      transactionType: "INCOME_RECEIVED",
      direction: "IN",
      amount: input.amount,
      paymentMethod: input.paymentMethod,
      referenceType: "Income",
      referenceId: created.id,
      description: input.description,
      createdById: userId,
    });

    return created;
  });

  await writeAuditLog({
    userId,
    action: "INCOME_CREATED",
    entity: "Income",
    entityId: income.id,
    metadata: { incomeType: input.incomeType, amount: input.amount, paymentMethod: input.paymentMethod },
  });

  return { id: income.id, incomeNumber: formatIncomeNumber(income.sequence) };
}

/** Same reversal pattern as voidExpense — a compensating CASH_ADJUSTMENT (direction OUT) restores the cash book. */
export async function voidIncome(
  input: { incomeId: string; reason: string },
  userId: string,
): Promise<{ id: string }> {
  if (!input.reason.trim()) throw new EmptyIncomeVoidReasonError();

  const income = await prisma.income.findUnique({ where: { id: input.incomeId } });
  if (!income) throw new IncomeNotFoundError();
  if (income.status === "VOIDED") throw new IncomeAlreadyVoidedError();

  await prisma.$transaction(async (tx) => {
    await tx.income.update({
      where: { id: input.incomeId },
      data: { status: "VOIDED", voidReason: input.reason, voidedById: userId, voidedAt: new Date() },
    });

    await recordCashTransactionInTx(tx, {
      transactionType: "CASH_ADJUSTMENT",
      direction: "OUT",
      amount: income.amount,
      paymentMethod: income.paymentMethod,
      referenceType: "Income",
      referenceId: income.id,
      description: `Void reversal: ${input.reason}`,
      createdById: userId,
    });
  });

  await writeAuditLog({
    userId,
    action: "INCOME_VOIDED",
    entity: "Income",
    entityId: income.id,
    metadata: { reason: input.reason, amount: income.amount.toString() },
  });

  return { id: income.id };
}

export type IncomeRow = {
  id: string;
  incomeNumber: string;
  incomeType: IncomeType;
  description: string;
  amount: Prisma.Decimal;
  paymentMethod: PaymentMethod;
  incomeDate: Date;
  reference: string | null;
  status: "ACTIVE" | "VOIDED";
  voidReason: string | null;
  createdBy: { id: string; name: string };
  createdAt: Date;
};

const INCOME_ROW_SELECT = {
  id: true,
  sequence: true,
  incomeType: true,
  description: true,
  amount: true,
  paymentMethod: true,
  incomeDate: true,
  reference: true,
  status: true,
  voidReason: true,
  createdBy: { select: { id: true, name: true } },
  createdAt: true,
} satisfies Prisma.IncomeSelect;

function toIncomeRow(row: Prisma.IncomeGetPayload<{ select: typeof INCOME_ROW_SELECT }>): IncomeRow {
  return {
    id: row.id,
    incomeNumber: formatIncomeNumber(row.sequence),
    incomeType: row.incomeType,
    description: row.description,
    amount: row.amount,
    paymentMethod: row.paymentMethod,
    incomeDate: row.incomeDate,
    reference: row.reference,
    status: row.status,
    voidReason: row.voidReason,
    createdBy: row.createdBy,
    createdAt: row.createdAt,
  };
}

export type IncomeListFilters = {
  incomeType?: IncomeType;
  status?: "ACTIVE" | "VOIDED";
  dateFrom?: Date;
  dateTo?: Date;
  page?: number;
  pageSize?: number;
};

export async function listIncomes(filters: IncomeListFilters): Promise<{ rows: IncomeRow[]; total: number }> {
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, filters.pageSize ?? 20));

  const where: Prisma.IncomeWhereInput = {
    ...(filters.incomeType ? { incomeType: filters.incomeType } : {}),
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.dateFrom || filters.dateTo ? { incomeDate: { gte: filters.dateFrom, lte: filters.dateTo } } : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.income.findMany({
      where,
      select: INCOME_ROW_SELECT,
      orderBy: { incomeDate: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.income.count({ where }),
  ]);

  return { rows: rows.map(toIncomeRow), total };
}

export async function getIncomeById(id: string): Promise<IncomeRow | null> {
  const row = await prisma.income.findUnique({ where: { id }, select: INCOME_ROW_SELECT });
  return row ? toIncomeRow(row) : null;
}
