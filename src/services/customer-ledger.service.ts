import "server-only";
import type Decimal from "decimal.js";
import { prisma } from "@/lib/db/prisma";
import { adjustCustomerOutstandingBalanceInTx } from "@/services/customer.service";
import { Prisma } from "@/generated/prisma/client";
import type { LedgerTransactionType } from "@/generated/prisma/client";

type PrismaTx = Prisma.TransactionClient;

/**
 * The customer financial ledger — append-only, the single source of truth
 * for Customer.outstandingBalance. See CUSTOMER-LEDGER.md.
 *
 * Every ledger-affecting event in the app (a credit sale, a customer
 * payment, a future refund/adjustment) MUST go through
 * appendCustomerLedgerEntry() and nothing else may write to
 * Customer.outstandingBalance — this is what keeps the cached balance and
 * the ledger mathematically guaranteed to agree, even under concurrent
 * writes to the same customer (the balance update is one atomic
 * UPDATE...RETURNING statement, so two simultaneous entries for the same
 * customer are serialized by Postgres's row lock, not by application code).
 */

export type LedgerEntryInput = {
  customerId: string;
  transactionType: LedgerTransactionType;
  /** What caused this entry — "Sale", "CustomerPayment", ... A polymorphic
   * reference by string, the same pattern AuditLog.entity already uses. */
  referenceType: string;
  referenceId: string;
  debit?: string | number | Decimal;
  credit?: string | number | Decimal;
  description?: string;
  createdById: string;
};

export async function appendCustomerLedgerEntry(
  tx: PrismaTx,
  input: LedgerEntryInput,
): Promise<{ id: string; balanceAfter: Prisma.Decimal }> {
  const debit = input.debit ?? 0;
  const credit = input.credit ?? 0;
  const delta = new Prisma.Decimal(debit).sub(new Prisma.Decimal(credit));

  const balanceAfter = await adjustCustomerOutstandingBalanceInTx(tx, input.customerId, delta);

  const entry = await tx.customerLedgerEntry.create({
    data: {
      customerId: input.customerId,
      transactionType: input.transactionType,
      referenceType: input.referenceType,
      referenceId: input.referenceId,
      debit: String(debit),
      credit: String(credit),
      balanceAfter,
      description: input.description,
      createdById: input.createdById,
    },
  });

  return { id: entry.id, balanceAfter };
}

export type LedgerEntryRow = {
  id: string;
  transactionType: LedgerTransactionType;
  referenceType: string;
  referenceId: string;
  debit: Prisma.Decimal;
  credit: Prisma.Decimal;
  balanceAfter: Prisma.Decimal;
  description: string | null;
  createdAt: Date;
  createdBy: { id: string; name: string };
};

const LEDGER_ROW_SELECT = {
  id: true,
  transactionType: true,
  referenceType: true,
  referenceId: true,
  debit: true,
  credit: true,
  balanceAfter: true,
  description: true,
  createdAt: true,
  createdBy: { select: { id: true, name: true } },
} satisfies Prisma.CustomerLedgerEntrySelect;

export async function listLedgerEntriesForCustomer(
  customerId: string,
  filter: { page?: number; pageSize?: number } = {},
): Promise<{ rows: LedgerEntryRow[]; total: number }> {
  const page = Math.max(1, filter.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, filter.pageSize ?? 20));

  const [rows, total] = await Promise.all([
    prisma.customerLedgerEntry.findMany({
      where: { customerId },
      select: LEDGER_ROW_SELECT,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.customerLedgerEntry.count({ where: { customerId } }),
  ]);

  return { rows, total };
}

export type CompanyLedgerRow = LedgerEntryRow & {
  customer: { id: string; name: string; phone: string; customerCode: number };
};

export type CompanyLedgerFilters = {
  search?: string;
  transactionType?: LedgerTransactionType;
  dateFrom?: Date;
  dateTo?: Date;
  page?: number;
  pageSize?: number;
};

/** The company-wide Customer Ledger page — every entry, across every customer. */
export async function listAllLedgerEntries(
  filters: CompanyLedgerFilters,
): Promise<{ rows: CompanyLedgerRow[]; total: number }> {
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, filters.pageSize ?? 20));

  const where: Prisma.CustomerLedgerEntryWhereInput = {};
  if (filters.transactionType) where.transactionType = filters.transactionType;
  if (filters.dateFrom || filters.dateTo) {
    where.createdAt = { gte: filters.dateFrom, lte: filters.dateTo };
  }
  if (filters.search) {
    where.customer = {
      OR: [
        { name: { contains: filters.search, mode: "insensitive" } },
        { phone: { contains: filters.search } },
      ],
    };
  }

  const [rows, total] = await Promise.all([
    prisma.customerLedgerEntry.findMany({
      where,
      select: {
        ...LEDGER_ROW_SELECT,
        customer: { select: { id: true, name: true, phone: true, customerCode: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.customerLedgerEntry.count({ where }),
  ]);

  return { rows, total };
}

export type ReconciliationResult = {
  customerId: string;
  cachedBalance: string;
  ledgerBalance: string;
  matches: boolean;
};

export class LedgerReconciliationError extends Error {
  readonly result: ReconciliationResult;
  constructor(result: ReconciliationResult) {
    super(
      `Customer ${result.customerId}'s cached balance (${result.cachedBalance}) does not match its ledger-derived balance (${result.ledgerBalance}).`,
    );
    this.name = "LedgerReconciliationError";
    this.result = result;
  }
}

/**
 * Verifies Customer.outstandingBalance against the ledger's own math — the
 * sum of every entry's (debit - credit) for that customer, which must
 * exactly equal the most recent entry's balanceAfter, which must exactly
 * equal the cached column. Never auto-corrects a mismatch — see
 * CUSTOMER-LEDGER.md "Reconciliation": a detected mismatch is an integrity
 * error to investigate, not something to silently paper over.
 */
export async function reconcileCustomerBalance(customerId: string): Promise<ReconciliationResult> {
  const [customer, aggregate] = await Promise.all([
    prisma.customer.findUniqueOrThrow({ where: { id: customerId }, select: { outstandingBalance: true } }),
    prisma.customerLedgerEntry.aggregate({
      where: { customerId },
      _sum: { debit: true, credit: true },
    }),
  ]);

  const debitTotal = aggregate._sum.debit ?? new Prisma.Decimal(0);
  const creditTotal = aggregate._sum.credit ?? new Prisma.Decimal(0);
  const ledgerBalance = debitTotal.sub(creditTotal);
  const cachedBalance = customer.outstandingBalance;

  return {
    customerId,
    cachedBalance: cachedBalance.toString(),
    ledgerBalance: ledgerBalance.toString(),
    matches: cachedBalance.equals(ledgerBalance),
  };
}

/** Runs reconciliation across every customer — returns only the mismatches, if any. */
export async function reconcileAllCustomerBalances(): Promise<ReconciliationResult[]> {
  const customers = await prisma.customer.findMany({ select: { id: true } });
  const results = await Promise.all(customers.map((c) => reconcileCustomerBalance(c.id)));
  return results.filter((r) => !r.matches);
}
