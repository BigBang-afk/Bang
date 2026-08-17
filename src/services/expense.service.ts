import "server-only";
import { prisma } from "@/lib/db/prisma";
import { writeAuditLog } from "@/services/audit.service";
import { recordCashTransactionInTx } from "@/services/cash-transaction.service";
import { formatExpenseNumber } from "@/lib/expense-number";
import { Prisma } from "@/generated/prisma/client";
import type { PaymentMethod } from "@/generated/prisma/client";

/**
 * Expense management — see EXPENSE-SYSTEM.md. Every expense is paired with
 * a CashTransaction (EXPENSE / OUT) in the same transaction, exactly the
 * spec's worked example ("Electricity Rs. 25,000, paid CASH → cash ledger
 * decreases by 25,000, expense increases by 25,000, atomically"). An
 * expense is never edited or deleted after creation — see `voidExpense`.
 */

export class InvalidExpenseAmountError extends Error {
  constructor(message = "Expense amount must be greater than zero.") {
    super(message);
    this.name = "InvalidExpenseAmountError";
  }
}

export class InvalidExpensePaymentMethodError extends Error {
  constructor(message = "CREDIT is not a valid payment method for an expense — nothing was actually paid.") {
    super(message);
    this.name = "InvalidExpensePaymentMethodError";
  }
}

export class ExpenseCategoryInactiveError extends Error {
  constructor(message = "This expense category is inactive.") {
    super(message);
    this.name = "ExpenseCategoryInactiveError";
  }
}

export class ExpenseNotFoundError extends Error {
  constructor(message = "Expense not found.") {
    super(message);
    this.name = "ExpenseNotFoundError";
  }
}

export class ExpenseAlreadyVoidedError extends Error {
  constructor(message = "This expense has already been voided.") {
    super(message);
    this.name = "ExpenseAlreadyVoidedError";
  }
}

export class EmptyVoidReasonError extends Error {
  constructor(message = "A reason is required to void an expense.") {
    super(message);
    this.name = "EmptyVoidReasonError";
  }
}

const NON_CREDIT_METHODS = new Set<PaymentMethod>(["CASH", "CARD", "BANK_TRANSFER", "OTHER"]);

export type CreateExpenseInput = {
  categoryId: string;
  description: string;
  amount: number;
  paymentMethod: PaymentMethod;
  expenseDate: Date;
  reference?: string;
  vendorName?: string;
  notes?: string;
  /** Set when this expense is the corrected entry replacing a previously voided one. */
  reversalOfId?: string;
};

export async function createExpense(
  input: CreateExpenseInput,
  userId: string,
): Promise<{ id: string; expenseNumber: string }> {
  if (!(input.amount > 0)) throw new InvalidExpenseAmountError();
  if (!NON_CREDIT_METHODS.has(input.paymentMethod)) throw new InvalidExpensePaymentMethodError();

  const category = await prisma.expenseCategory.findUnique({ where: { id: input.categoryId } });
  if (!category) throw new Error("Expense category not found.");
  if (!category.isActive) throw new ExpenseCategoryInactiveError();

  const expense = await prisma.$transaction(async (tx) => {
    const created = await tx.expense.create({
      data: {
        categoryId: input.categoryId,
        description: input.description,
        amount: String(input.amount),
        paymentMethod: input.paymentMethod,
        expenseDate: input.expenseDate,
        reference: input.reference || null,
        vendorName: input.vendorName || null,
        notes: input.notes || null,
        reversalOfId: input.reversalOfId || null,
        createdById: userId,
      },
    });

    await recordCashTransactionInTx(tx, {
      transactionType: "EXPENSE",
      direction: "OUT",
      amount: input.amount,
      paymentMethod: input.paymentMethod,
      referenceType: "Expense",
      referenceId: created.id,
      description: `${category.name}: ${input.description}`,
      createdById: userId,
    });

    return created;
  });

  await writeAuditLog({
    userId,
    action: "EXPENSE_CREATED",
    entity: "Expense",
    entityId: expense.id,
    metadata: {
      categoryId: input.categoryId,
      amount: input.amount,
      paymentMethod: input.paymentMethod,
      reversalOfId: input.reversalOfId ?? null,
    },
  });

  return { id: expense.id, expenseNumber: formatExpenseNumber(expense.sequence) };
}

/**
 * Voids an expense — it is excluded from every report from this point
 * forward, but the row itself is never deleted or edited. Because the
 * original CashTransaction already recorded real cash leaving the drawer,
 * voiding writes a compensating CASH_ADJUSTMENT (direction IN, same
 * amount) in the same transaction so the cash book reflects the reversal —
 * never a silent, un-audited correction. If the expense should be
 * re-entered correctly, call `createExpense` again with `reversalOfId` set
 * to this expense's id.
 */
export async function voidExpense(
  input: { expenseId: string; reason: string },
  userId: string,
): Promise<{ id: string }> {
  if (!input.reason.trim()) throw new EmptyVoidReasonError();

  const expense = await prisma.expense.findUnique({ where: { id: input.expenseId } });
  if (!expense) throw new ExpenseNotFoundError();
  if (expense.status === "VOIDED") throw new ExpenseAlreadyVoidedError();

  await prisma.$transaction(async (tx) => {
    await tx.expense.update({
      where: { id: input.expenseId },
      data: {
        status: "VOIDED",
        voidReason: input.reason,
        voidedById: userId,
        voidedAt: new Date(),
      },
    });

    await recordCashTransactionInTx(tx, {
      transactionType: "CASH_ADJUSTMENT",
      direction: "IN",
      amount: expense.amount,
      paymentMethod: expense.paymentMethod,
      referenceType: "Expense",
      referenceId: expense.id,
      description: `Void reversal: ${input.reason}`,
      createdById: userId,
    });
  });

  await writeAuditLog({
    userId,
    action: "EXPENSE_VOIDED",
    entity: "Expense",
    entityId: expense.id,
    metadata: { reason: input.reason, amount: expense.amount.toString() },
  });

  return { id: expense.id };
}

export type ExpenseRow = {
  id: string;
  expenseNumber: string;
  description: string;
  amount: Prisma.Decimal;
  paymentMethod: PaymentMethod;
  expenseDate: Date;
  reference: string | null;
  vendorName: string | null;
  status: "ACTIVE" | "VOIDED";
  voidReason: string | null;
  category: { id: string; name: string };
  createdBy: { id: string; name: string };
  createdAt: Date;
};

const EXPENSE_ROW_SELECT = {
  id: true,
  sequence: true,
  description: true,
  amount: true,
  paymentMethod: true,
  expenseDate: true,
  reference: true,
  vendorName: true,
  status: true,
  voidReason: true,
  category: { select: { id: true, name: true } },
  createdBy: { select: { id: true, name: true } },
  createdAt: true,
} satisfies Prisma.ExpenseSelect;

function toExpenseRow(row: Prisma.ExpenseGetPayload<{ select: typeof EXPENSE_ROW_SELECT }>): ExpenseRow {
  return {
    id: row.id,
    expenseNumber: formatExpenseNumber(row.sequence),
    description: row.description,
    amount: row.amount,
    paymentMethod: row.paymentMethod,
    expenseDate: row.expenseDate,
    reference: row.reference,
    vendorName: row.vendorName,
    status: row.status,
    voidReason: row.voidReason,
    category: row.category,
    createdBy: row.createdBy,
    createdAt: row.createdAt,
  };
}

export type ExpenseListFilters = {
  categoryId?: string;
  paymentMethod?: PaymentMethod;
  status?: "ACTIVE" | "VOIDED";
  dateFrom?: Date;
  dateTo?: Date;
  page?: number;
  pageSize?: number;
};

export async function listExpenses(filters: ExpenseListFilters): Promise<{ rows: ExpenseRow[]; total: number }> {
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, filters.pageSize ?? 20));

  const where: Prisma.ExpenseWhereInput = {
    ...(filters.categoryId ? { categoryId: filters.categoryId } : {}),
    ...(filters.paymentMethod ? { paymentMethod: filters.paymentMethod } : {}),
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.dateFrom || filters.dateTo
      ? { expenseDate: { gte: filters.dateFrom, lte: filters.dateTo } }
      : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.expense.findMany({
      where,
      select: EXPENSE_ROW_SELECT,
      orderBy: { expenseDate: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.expense.count({ where }),
  ]);

  return { rows: rows.map(toExpenseRow), total };
}

export async function getExpenseById(id: string): Promise<ExpenseRow | null> {
  const row = await prisma.expense.findUnique({ where: { id }, select: EXPENSE_ROW_SELECT });
  return row ? toExpenseRow(row) : null;
}
