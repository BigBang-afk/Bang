import "server-only";
import Decimal from "decimal.js";
import { prisma } from "@/lib/db/prisma";
import { writeAuditLog } from "@/services/audit.service";
import { reconcileAllCustomerBalances } from "@/services/customer-ledger.service";
import { getCashBalance } from "@/services/cash-transaction.service";
import { Prisma } from "@/generated/prisma/client";
import type { PartyType } from "@/generated/prisma/client";

/**
 * Financial (cross-book) reconciliation — independent-recomputation
 * integrity checks, distinct from Phase 5's reconciliation.service.ts
 * (which compares the system's figure against a *physical* count). These
 * checks compare two independently-computed figures for the SAME fact —
 * e.g. a cached balance column against the sum of the ledger rows that are
 * supposed to justify it — and exist to catch a bug or an out-of-band data
 * edit, not day-to-day drift. See RECONCILIATION.md "Financial
 * reconciliation". Never auto-corrects; a mismatch is reported for
 * investigation only.
 */

export type ReconciliationCheckResult = {
  status: "OK" | "FINANCIAL_INTEGRITY_ERROR";
  expected: string;
  actual: string;
  difference: string;
  errors: string[];
};

function ok(expected: Decimal, actual: Decimal): ReconciliationCheckResult {
  return { status: "OK", expected: expected.toString(), actual: actual.toString(), difference: actual.sub(expected).toString(), errors: [] };
}

function failed(expected: Decimal, actual: Decimal, errors: string[]): ReconciliationCheckResult {
  return {
    status: "FINANCIAL_INTEGRITY_ERROR",
    expected: expected.toString(),
    actual: actual.toString(),
    difference: actual.sub(expected).toString(),
    errors,
  };
}

/**
 * Sale.balanceAmount is, by construction, "sum of Payment.amount where
 * method == CREDIT" (see DATABASE.md). This check independently recomputes
 * grandTotal - non-credit-paid across every sale and verifies it equals
 * the cached balanceAmount total — matching the spec's worked example
 * (Sales 1,000,000 - Payments 900,000 should equal the resulting
 * receivable). A mismatch means some code path wrote Sale/Payment data
 * outside the normal completeSale() transaction.
 */
export async function reconcileSales(): Promise<ReconciliationCheckResult> {
  const [saleAgg, nonCreditPaymentAgg, balanceAgg] = await Promise.all([
    prisma.sale.aggregate({ _sum: { grandTotal: true } }),
    prisma.payment.aggregate({ where: { method: { not: "CREDIT" } }, _sum: { amount: true } }),
    prisma.sale.aggregate({ _sum: { balanceAmount: true } }),
  ]);

  const grandTotal = new Decimal(saleAgg._sum.grandTotal ?? 0);
  const nonCreditPaid = new Decimal(nonCreditPaymentAgg._sum.amount ?? 0);
  const expected = grandTotal.sub(nonCreditPaid);
  const actual = new Decimal(balanceAgg._sum.balanceAmount ?? 0);

  if (expected.equals(actual)) return ok(expected, actual);
  return failed(expected, actual, [
    `Sales total (${grandTotal.toString()}) minus non-credit payments (${nonCreditPaid.toString()}) should equal total Sale.balanceAmount (${expected.toString()}), but found ${actual.toString()}.`,
  ]);
}

/** Delegates to the existing per-customer check (customer-ledger.service.ts) — one write path, reused rather than re-implemented. */
export async function reconcileCustomerLedger(): Promise<ReconciliationCheckResult> {
  const mismatches = await reconcileAllCustomerBalances();
  if (mismatches.length === 0) return ok(new Decimal(0), new Decimal(0));

  const totalDifference = mismatches.reduce(
    (sum, m) => sum.add(new Decimal(m.ledgerBalance).sub(new Decimal(m.cachedBalance))),
    new Decimal(0),
  );
  return failed(
    new Decimal(0),
    totalDifference,
    mismatches.map((m) => `Customer ${m.customerId}: cached ${m.cachedBalance} vs ledger-derived ${m.ledgerBalance}.`),
  );
}

async function reconcilePartyCashLedger(partyType: PartyType, label: string): Promise<ReconciliationCheckResult> {
  const balances = await prisma.partyCashBalance.findMany({ where: { partyType } });
  const errors: string[] = [];
  let totalDifference = new Decimal(0);

  for (const balance of balances) {
    const agg = await prisma.partyCashLedgerEntry.aggregate({
      where: { partyType, partyId: balance.partyId },
      _sum: { debit: true, credit: true },
    });
    const ledgerBalance = new Decimal(agg._sum.debit ?? 0).sub(new Decimal(agg._sum.credit ?? 0));
    const cached = new Decimal(balance.balance.toString());
    if (!ledgerBalance.equals(cached)) {
      errors.push(`${label} ${balance.partyId}: cached ${cached.toString()} vs ledger-derived ${ledgerBalance.toString()}.`);
      totalDifference = totalDifference.add(ledgerBalance.sub(cached));
    }
  }

  if (errors.length === 0) return ok(new Decimal(0), new Decimal(0));
  return failed(new Decimal(0), totalDifference, errors);
}

export async function reconcileSupplierLedger(): Promise<ReconciliationCheckResult> {
  return reconcilePartyCashLedger("SUPPLIER", "Supplier");
}

/** Not one of the spec's 6 named functions, but the identical check for karigars — near-zero incremental cost given `reconcilePartyCashLedger` is already shared. */
export async function reconcileKarigarLedger(): Promise<ReconciliationCheckResult> {
  return reconcilePartyCashLedger("KARIGAR", "Karigar");
}

async function reconcileGoldLedger(): Promise<ReconciliationCheckResult> {
  const balances = await prisma.partyGoldBalance.findMany();
  const errors: string[] = [];
  let totalDifference = new Decimal(0);

  for (const balance of balances) {
    const agg = await prisma.goldLedgerEntry.aggregate({
      where: { partyType: balance.partyType, partyId: balance.partyId, purity: balance.purity },
      _sum: { debit: true, credit: true },
    });
    const ledgerBalance = new Decimal(agg._sum.debit ?? 0).sub(new Decimal(agg._sum.credit ?? 0));
    const cached = new Decimal(balance.balance.toString());
    if (!ledgerBalance.equals(cached)) {
      errors.push(
        `${balance.partyType} ${balance.partyId} (${balance.purity}): cached ${cached.toString()} vs ledger-derived ${ledgerBalance.toString()}.`,
      );
      totalDifference = totalDifference.add(ledgerBalance.sub(cached));
    }
  }

  if (errors.length === 0) return ok(new Decimal(0), new Decimal(0));
  return failed(new Decimal(0), totalDifference, errors);
}

export async function reconcileGold(): Promise<ReconciliationCheckResult> {
  return reconcileGoldLedger();
}

/**
 * Independently recomputes the cash balance via a fresh raw-SQL aggregate
 * and compares it against `getCashBalance()`'s own computation — a
 * different code path over the same table, catching a divergence between
 * the two rather than testing the physical till (that's Phase 5's
 * runCashReconciliation()).
 */
export async function reconcileCash(): Promise<ReconciliationCheckResult> {
  const [expectedStr, rows] = await Promise.all([
    getCashBalance(),
    prisma.$queryRaw<{ total: Prisma.Decimal }[]>`
      SELECT COALESCE(SUM(CASE WHEN direction = 'IN' THEN amount ELSE -amount END), 0) AS total
      FROM cash_transactions
    `,
  ]);

  const openingRow = await prisma.systemSetting.findUnique({ where: { key: "cash.opening_balance" } });
  const opening = new Decimal(openingRow?.value || "0");
  const actual = opening.add(new Decimal(rows[0]?.total ?? 0));
  const expected = new Decimal(expectedStr);

  if (expected.equals(actual)) return ok(expected, actual);
  return failed(expected, actual, [
    `getCashBalance() reports ${expected.toString()} but an independent raw-SQL aggregate reports ${actual.toString()}.`,
  ]);
}

/**
 * Verifies inventory/sale status consistency: every SOLD, non-archived
 * InventoryItem must have exactly one non-returned SaleItem, and vice
 * versa — catching a status left out of sync by a bug rather than a
 * spec-required workflow (approveReturn/completeSale are the only writers
 * of both sides together).
 */
export async function reconcileInventory(): Promise<ReconciliationCheckResult> {
  const [soldWithoutSaleItem, saleItemsWithWrongStatus] = await Promise.all([
    prisma.inventoryItem.count({
      where: { status: "SOLD", archivedAt: null, saleItems: { none: {} } },
    }),
    prisma.saleItem.count({
      where: {
        OR: [{ return: null }, { return: { status: { not: "RETURNED" } } }],
        inventoryItem: { status: { not: "SOLD" } },
      },
    }),
  ]);

  const totalMismatches = soldWithoutSaleItem + saleItemsWithWrongStatus;
  if (totalMismatches === 0) return ok(new Decimal(0), new Decimal(0));

  const errors: string[] = [];
  if (soldWithoutSaleItem > 0) errors.push(`${soldWithoutSaleItem} inventory item(s) marked SOLD with no corresponding sale item.`);
  if (saleItemsWithWrongStatus > 0) errors.push(`${saleItemsWithWrongStatus} sold (non-returned) sale item(s) whose inventory item is not marked SOLD.`);

  return failed(new Decimal(0), new Decimal(totalMismatches), errors);
}

export type FullFinancialReconciliation = {
  sales: ReconciliationCheckResult;
  customerLedger: ReconciliationCheckResult;
  supplierLedger: ReconciliationCheckResult;
  karigarLedger: ReconciliationCheckResult;
  cash: ReconciliationCheckResult;
  gold: ReconciliationCheckResult;
  inventory: ReconciliationCheckResult;
  overallStatus: "OK" | "FINANCIAL_INTEGRITY_ERROR";
};

/** Runs every check and records the run as an audit event — never auto-corrects anything found. */
export async function runFullFinancialReconciliation(userId: string): Promise<FullFinancialReconciliation> {
  const [sales, customerLedger, supplierLedger, karigarLedger, cash, gold, inventory] = await Promise.all([
    reconcileSales(),
    reconcileCustomerLedger(),
    reconcileSupplierLedger(),
    reconcileKarigarLedger(),
    reconcileCash(),
    reconcileGold(),
    reconcileInventory(),
  ]);

  const checks = [sales, customerLedger, supplierLedger, karigarLedger, cash, gold, inventory];
  const overallStatus = checks.every((c) => c.status === "OK") ? "OK" : "FINANCIAL_INTEGRITY_ERROR";

  await writeAuditLog({
    userId,
    action: "FINANCIAL_RECONCILIATION_PERFORMED",
    entity: "FinancialReconciliation",
    metadata: { overallStatus, failedChecks: checks.filter((c) => c.status !== "OK").length },
  });

  return { sales, customerLedger, supplierLedger, karigarLedger, cash, gold, inventory, overallStatus };
}
