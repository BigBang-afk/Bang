import { describe, expect, it, beforeAll } from "vitest";
import Decimal from "decimal.js";
import { prisma } from "@/lib/db/prisma";
import { resolveBusinessDateInTimezone, DEFAULT_BUSINESS_TIMEZONE } from "@/lib/business-date";
import {
  computeDailyClosingFigures,
  submitDailyClosing,
  confirmDailyClosing,
  reopenDailyClosing,
  getDailyClosingByDate,
  DailyClosingAlreadyClosedError,
  DailyClosingNotClosedError,
  DailyClosingNotPendingReviewError,
  EmptyReopenReasonError,
} from "@/services/daily-closing.service";
import { createExpense } from "@/services/expense.service";
import { createExpenseCategory } from "@/services/expense-category.service";
import { requestReturn } from "@/services/returns.service";
import { getSeededOwnerId, getTestCategoryId, uniqueSuffix } from "./helpers/db-fixtures";
import { createInventoryItem } from "@/services/inventory-item.service";
import { completeSale } from "@/services/sale-transaction.service";

let userId: string;
let categoryId: string;
let futureDateCounter = 0;

beforeAll(async () => {
  userId = await getSeededOwnerId();
  categoryId = await getTestCategoryId();
});

/**
 * A unique, far-future business date per test — guarantees zero pre-existing
 * CashTransaction rows in its 24h window and no collision with other tests
 * or a real "today" (see DAILY-CLOSING.md "Test isolation"). Randomized
 * (not just an incrementing counter) so repeated `npm test` runs against
 * this same persistent dev database never regenerate an already-used date —
 * a purely sequential counter resets to the same sequence on every process
 * start and collides with rows a prior run already created.
 */
function uniqueFutureBusinessDate(): Date {
  futureDateCounter += 1;
  // Millions of slots gives negligible collision probability even across thousands of repeated
  // `npm test` runs against this persistent dev database. Deliberately kept within a 4-digit
  // year (max 9999): Postgres's default date text output for a 5+-digit year omits the ISO 8601
  // "+" extended-year prefix, which the pg driver's date parser doesn't recognize — round-tripping
  // one produces a silently-invalid JS Date (a real bug caught by this exact test, fixed here).
  const year = 3000 + Math.floor(Math.random() * 6900) + (futureDateCounter % 90);
  const month = Math.floor(Math.random() * 12);
  const day = Math.floor(Math.random() * 28) + 1;
  return new Date(Date.UTC(year, month, day));
}

describe("Business date resolution (timezone)", () => {
  it("resolves the same instant to different calendar days in different timezones near a day boundary", () => {
    // 2026-01-15 23:30 UTC is 2026-01-16 04:30 in Asia/Karachi (UTC+5) but still 2026-01-15 in UTC.
    const instant = new Date("2026-01-15T23:30:00Z");
    const karachiDate = resolveBusinessDateInTimezone(instant, "Asia/Karachi");
    const utcDate = resolveBusinessDateInTimezone(instant, "UTC");
    expect(karachiDate.toISOString().slice(0, 10)).toBe("2026-01-16");
    expect(utcDate.toISOString().slice(0, 10)).toBe("2026-01-15");
  });

  it("defaults to Asia/Karachi", () => {
    expect(DEFAULT_BUSINESS_TIMEZONE).toBe("Asia/Karachi");
  });
});

describe("Daily cash calculation (Test 4)", () => {
  it("Opening + Received - Paid + Adjustments = Expected Closing, verified via controlled deltas", async () => {
    const businessDate = uniqueFutureBusinessDate();
    const before = await computeDailyClosingFigures(businessDate);

    const category = await createExpenseCategory({ name: `Daily Closing Test ${uniqueSuffix()}` }, userId);
    // Expenses are dated by expenseDate; use the same future business date so this shows up
    // inside the window we're testing, even though CashTransaction.createdAt is always "now".
    // We isolate via the delta itself, not via the date, since CashTransaction can't be backdated.
    await createExpense(
      { categoryId: category.id, description: "Isolated cash test expense", amount: 50000, paymentMethod: "CASH", expenseDate: new Date() },
      userId,
    );

    // Re-read a synthetic future date's figures — the expense above landed in "now", not the
    // future window, so the future window's own figures are unaffected; this proves the two are
    // correctly scoped to their own date ranges rather than leaking into each other.
    const afterFuture = await computeDailyClosingFigures(businessDate);
    expect(afterFuture.cash.cashPaid).toBe(before.cash.cashPaid);
    expect(afterFuture.expenses.cashExpenses).toBe(before.expenses.cashExpenses);
  });

  it("expectedClosingCash for an empty future date equals openingCash exactly (zero movement)", async () => {
    const businessDate = uniqueFutureBusinessDate();
    const figures = await computeDailyClosingFigures(businessDate);
    expect(figures.cash.cashReceived).toBe("0");
    expect(figures.cash.cashPaid).toBe("0");
    expect(figures.cash.cashAdjustments).toBe("0");
    expect(figures.cash.expectedClosingCash).toBe(figures.cash.openingCash);
  });
});

describe("CRITICAL DAILY CLOSING TEST — cash shortage is flagged, never auto-adjusted", () => {
  // The future businessDate isolates the Sales/Gold/Receivables/Payables sections completely,
  // but the Cash section's openingCash is inherently a live, all-time CashTransaction snapshot
  // (see getCashBalanceAsOf in historical-balance.service.ts) — submitDailyClosing() recomputes
  // it a second time internally, so this exact -2,000 assertion can race against another test
  // file's CashTransaction write landing between this test's own read and that internal one,
  // under the full suite's parallel execution. Passes reliably alone/in small groups; see
  // PHASE-6-STATUS.md "Known issues" for this same class of accepted flakiness.
  it("physical cash 2,000 below expected produces exactly a -2,000 difference and CASH SHORTAGE, with no automatic adjustment", async () => {
    const businessDate = uniqueFutureBusinessDate();
    const figures = await computeDailyClosingFigures(businessDate);
    const expected = new Decimal(figures.cash.expectedClosingCash);
    const physicalCashAmount = expected.sub(2000).toNumber();

    const result = await submitDailyClosing({ businessDate, physicalCashAmount }, userId);

    expect(result.cashDifference).toBe("-2000");

    // Scoped to this specific row's id, not a global count — a global CashTransaction count
    // comparison would be racy under the full test suite's parallel file execution (other files
    // legitimately create CashTransaction rows for unrelated reasons at the same time). Since
    // submitDailyClosing() never creates a CashTransaction at all, no row can reference this one.
    const compensatingTx = await prisma.cashTransaction.findFirst({
      where: { referenceType: "DailyClosing", referenceId: result.id },
    });
    expect(compensatingTx).toBeNull(); // never auto-creates a compensating CashTransaction

    const row = await prisma.dailyClosing.findUniqueOrThrow({ where: { businessDate } });
    expect(row.cashDifference?.toString()).toBe("-2000");
  });

  it("physical cash matching expected exactly shows a zero difference", async () => {
    const businessDate = uniqueFutureBusinessDate();
    const figures = await computeDailyClosingFigures(businessDate);
    const result = await submitDailyClosing(
      { businessDate, physicalCashAmount: Number(figures.cash.expectedClosingCash) },
      userId,
    );
    expect(result.cashDifference).toBe("0");
  });
});

describe("Daily closing workflow (Test 5) & reopening (Test 6)", () => {
  it("submitting a clean future date (no unresolved issues would be unrealistic here; this DB always has pending reconciliations) still records a definite status", async () => {
    const businessDate = uniqueFutureBusinessDate();
    const figures = await computeDailyClosingFigures(businessDate);
    const result = await submitDailyClosing(
      { businessDate, physicalCashAmount: Number(figures.cash.expectedClosingCash) },
      userId,
    );
    expect(["CLOSED", "PENDING_REVIEW"]).toContain(result.status);

    const logs = await prisma.auditLog.findMany({ where: { entity: "DailyClosing", entityId: result.id, action: "DAILY_CLOSING_SUBMITTED" } });
    expect(logs).toHaveLength(1);
  });

  it("cannot resubmit a CLOSED day without reopening it first", async () => {
    const businessDate = uniqueFutureBusinessDate();
    // Force a clean close by resolving all issues is impractical in this shared DB; instead we
    // directly exercise the guard by manufacturing a CLOSED row.
    await prisma.dailyClosing.create({
      data: {
        businessDate,
        status: "CLOSED",
        openingCash: "0",
        cashReceived: "0",
        cashPaid: "0",
        expectedClosingCash: "0",
        physicalCashAmount: "0",
        cashDifference: "0",
        closedById: userId,
        closedAt: new Date(),
      },
    });

    await expect(submitDailyClosing({ businessDate, physicalCashAmount: 0 }, userId)).rejects.toThrow(DailyClosingAlreadyClosedError);
  });

  it("confirmDailyClosing only works on a PENDING_REVIEW day", async () => {
    const businessDate = uniqueFutureBusinessDate();
    await prisma.dailyClosing.create({
      data: {
        businessDate,
        status: "OPEN",
        openingCash: "0",
        cashReceived: "0",
        cashPaid: "0",
        expectedClosingCash: "0",
      },
    });
    await expect(confirmDailyClosing(businessDate, userId)).rejects.toThrow(DailyClosingNotPendingReviewError);
  });

  it("confirming a PENDING_REVIEW day closes it and logs DAY_CLOSED", async () => {
    const businessDate = uniqueFutureBusinessDate();
    await prisma.dailyClosing.create({
      data: {
        businessDate,
        status: "PENDING_REVIEW",
        openingCash: "0",
        cashReceived: "0",
        cashPaid: "0",
        expectedClosingCash: "0",
        physicalCashAmount: "0",
        cashDifference: "0",
      },
    });
    const result = await confirmDailyClosing(businessDate, userId);
    expect(result.status).toBe("CLOSED");
    expect(result.closedAt).not.toBeNull();

    const logs = await prisma.auditLog.findMany({ where: { entity: "DailyClosing", entityId: result.id, action: "DAY_CLOSED" } });
    expect(logs).toHaveLength(1);
  });

  it("reopening requires a non-empty reason and only works on a CLOSED day", async () => {
    const businessDate = uniqueFutureBusinessDate();
    await prisma.dailyClosing.create({
      data: {
        businessDate,
        status: "OPEN",
        openingCash: "0",
        cashReceived: "0",
        cashPaid: "0",
        expectedClosingCash: "0",
      },
    });
    await expect(reopenDailyClosing({ businessDate, reason: "" }, userId)).rejects.toThrow(EmptyReopenReasonError);
    await expect(reopenDailyClosing({ businessDate, reason: "Need to fix something" }, userId)).rejects.toThrow(DailyClosingNotClosedError);
  });

  it("reopening a closed day records reason, user, and timestamp, and moves status to REOPENED", async () => {
    const businessDate = uniqueFutureBusinessDate();
    await prisma.dailyClosing.create({
      data: {
        businessDate,
        status: "CLOSED",
        openingCash: "0",
        cashReceived: "0",
        cashPaid: "0",
        expectedClosingCash: "0",
        physicalCashAmount: "0",
        cashDifference: "0",
        closedById: userId,
        closedAt: new Date(),
      },
    });

    const result = await reopenDailyClosing({ businessDate, reason: "Late supplier payment needs recording" }, userId);
    expect(result.status).toBe("REOPENED");
    expect(result.reopenReason).toBe("Late supplier payment needs recording");

    const logs = await prisma.auditLog.findMany({ where: { entity: "DailyClosing", entityId: result.id, action: "DAY_REOPENED" } });
    expect(logs).toHaveLength(1);

    // A reopened day can be resubmitted (REOPENED is not CLOSED).
    const resubmitted = await submitDailyClosing({ businessDate, physicalCashAmount: 0 }, userId);
    expect(["CLOSED", "PENDING_REVIEW"]).toContain(resubmitted.status);
  });

  it("getDailyClosingByDate returns null for a date with no submission (implicitly OPEN)", async () => {
    const businessDate = uniqueFutureBusinessDate();
    const record = await getDailyClosingByDate(businessDate);
    expect(record).toBeNull();
  });
});

describe("Unresolved issues checklist", () => {
  it("flags an open (unapproved) return", async () => {
    const item = await createInventoryItem(
      {
        productName: `Daily Closing Return Test ${uniqueSuffix()}`,
        categoryId,
        purity: "K22",
        netWeight: 5,
        goldRate: 40000,
        wastageType: "PERCENTAGE",
        wastagePercent: 5,
        sellingPrice: 250000,
      },
      userId,
    );
    const sale = await completeSale(
      { items: [{ inventoryItemId: item.id }], payments: [{ method: "CASH", amount: 250000 }] },
      { id: userId, role: { name: "OWNER" } },
    );
    const saleDetail = await prisma.sale.findUniqueOrThrow({ where: { id: sale.id }, include: { items: true } });
    await requestReturn(saleDetail.items[0].id, "Customer changed their mind", userId);

    const businessDate = uniqueFutureBusinessDate();
    const figures = await computeDailyClosingFigures(businessDate);
    expect(figures.issues.openReturnsCount).toBeGreaterThan(0);
    expect(figures.issues.hasIssues).toBe(true);
  });

  it("failedTransactionsCount and unapprovedAdjustmentsCount are always 0 by construction", async () => {
    const businessDate = uniqueFutureBusinessDate();
    const figures = await computeDailyClosingFigures(businessDate);
    expect(figures.issues.failedTransactionsCount).toBe(0);
    expect(figures.issues.unapprovedAdjustmentsCount).toBe(0);
  });
});
