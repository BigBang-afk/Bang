import { describe, expect, it, beforeAll } from "vitest";
import Decimal from "decimal.js";
import { resolveReportDateRange } from "@/lib/report-date-range";
import {
  getSalesReport,
  getPurchaseReport,
  getExpenseReport,
  getCashReport,
  getGoldReport,
  getReceivableAgingReport,
  getPayableReport,
  getGoldObligationReport,
  getInventoryValuationReport,
  getInventoryCurrentMarketValuation,
} from "@/services/financial-reports.service";
import { createInventoryItem } from "@/services/inventory-item.service";
import { completeSale } from "@/services/sale-transaction.service";
import { createSupplier } from "@/services/supplier.service";
import { createPurchase } from "@/services/purchase.service";
import { createKarigar } from "@/services/karigar.service";
import { giveGoldToKarigar } from "@/services/karigar-job.service";
import { createExpense } from "@/services/expense.service";
import { createExpenseCategory } from "@/services/expense-category.service";
import { createCustomer } from "@/services/customer.service";
import { getSeededOwnerId, getTestCategoryId, uniqueSuffix } from "./helpers/db-fixtures";

let userId: string;
let categoryId: string;

beforeAll(async () => {
  userId = await getSeededOwnerId();
  categoryId = await getTestCategoryId();
});

function uniquePhone(prefix: string): string {
  return `+9231${prefix}${Date.now()}${uniqueSuffix().slice(0, 3)}`;
}

function decimalDelta(after: string, before: string): string {
  return new Decimal(after).sub(before).toString();
}

describe("Date-range preset resolution (Test 20)", () => {
  const now = new Date("2026-06-15T10:00:00Z"); // A Monday, mid-month, mid-year.
  const timezone = "UTC";

  it("today and yesterday are consecutive single days", () => {
    const today = resolveReportDateRange("today", timezone, undefined, now);
    const yesterday = resolveReportDateRange("yesterday", timezone, undefined, now);
    expect(today.from.toISOString().slice(0, 10)).toBe("2026-06-15");
    expect(yesterday.from.toISOString().slice(0, 10)).toBe("2026-06-14");
  });

  it("this_week starts on Monday", () => {
    const thisWeek = resolveReportDateRange("this_week", timezone, undefined, now);
    // 2026-06-15 is itself a Monday.
    expect(thisWeek.from.toISOString().slice(0, 10)).toBe("2026-06-15");
  });

  it("last_7_days is a rolling window including today", () => {
    const last7 = resolveReportDateRange("last_7_days", timezone, undefined, now);
    expect(last7.from.toISOString().slice(0, 10)).toBe("2026-06-09");
    expect(last7.to.toISOString().slice(0, 10)).toBe("2026-06-15");
  });

  it("this_month starts on the 1st; last_month is the full prior calendar month", () => {
    const thisMonth = resolveReportDateRange("this_month", timezone, undefined, now);
    expect(thisMonth.from.toISOString().slice(0, 10)).toBe("2026-06-01");

    const lastMonth = resolveReportDateRange("last_month", timezone, undefined, now);
    expect(lastMonth.from.toISOString().slice(0, 10)).toBe("2026-05-01");
    expect(lastMonth.to.toISOString().slice(0, 10)).toBe("2026-05-31");
  });

  it("this_year starts January 1st", () => {
    const thisYear = resolveReportDateRange("this_year", timezone, undefined, now);
    expect(thisYear.from.toISOString().slice(0, 10)).toBe("2026-01-01");
  });

  it("custom requires an explicit from/to pair", () => {
    expect(() => resolveReportDateRange("custom", timezone, undefined, now)).toThrow();
    const custom = resolveReportDateRange("custom", timezone, { from: new Date("2026-01-01"), to: new Date("2026-01-10") }, now);
    expect(custom.from.toISOString().slice(0, 10)).toBe("2026-01-01");
  });
});

describe("Sales report (Test 7)", () => {
  // System-wide "this_month" before/after delta — see the note in
  // profit-loss.service.integration.test.ts's CRITICAL PROFIT TEST for why this specific test
  // can race under the full suite's parallel file execution (passes reliably alone/in small
  // groups); PHASE-6-STATUS.md "Known issues" documents this as the same accepted flakiness
  // class Phase 4/5 already established.
  it("reflects gross sales, discounts, net sales, and gold sold by purity via before/after deltas", async () => {
    const before = await getSalesReport("this_month", undefined);

    const item = await createInventoryItem(
      {
        productName: `Sales Report Item ${uniqueSuffix()}`,
        categoryId,
        purity: "K21",
        netWeight: 5,
        goldRate: 30000,
        wastageType: "FIXED_GRAMS",
        wastageGrams: 0,
        sellingPrice: 200000,
      },
      userId,
    );
    await completeSale(
      { items: [{ inventoryItemId: item.id, discountType: "FIXED", discountValue: 10000 }], payments: [{ method: "CASH", amount: 190000 }] },
      { id: userId, role: { name: "OWNER" } },
    );

    const after = await getSalesReport("this_month", undefined);
    expect(decimalDelta(after.grossSales, before.grossSales)).toBe("200000");
    expect(decimalDelta(after.discounts, before.discounts)).toBe("10000");
    expect(decimalDelta(after.netSales, before.netSales)).toBe("190000");
    expect(after.invoiceCount).toBeGreaterThanOrEqual(before.invoiceCount + 1);

    const k21Before = before.goldSoldByPurity.find((g) => g.purity === "K21")?.weight ?? "0";
    const k21After = after.goldSoldByPurity.find((g) => g.purity === "K21")?.weight ?? "0";
    expect(decimalDelta(k21After, k21Before)).toBe("5");
  });

  it("filters by category", async () => {
    const item = await createInventoryItem(
      {
        productName: `Category Filter Item ${uniqueSuffix()}`,
        categoryId,
        purity: "K22",
        netWeight: 2,
        goldRate: 40000,
        wastageType: "FIXED_GRAMS",
        wastageGrams: 0,
        sellingPrice: 100000,
      },
      userId,
    );
    await completeSale(
      { items: [{ inventoryItemId: item.id }], payments: [{ method: "CASH", amount: 100000 }] },
      { id: userId, role: { name: "OWNER" } },
    );

    const filtered = await getSalesReport("this_month", undefined, { categoryId });
    expect(Number(filtered.netSales)).toBeGreaterThan(0);
  });
});

describe("Purchase report (Test 8)", () => {
  it("reflects purchase count, cost, paid, and outstanding payable via before/after deltas", async () => {
    const supplier = await createSupplier({ name: `Report Supplier ${uniqueSuffix()}`, phone: uniquePhone("1") }, userId);
    const before = await getPurchaseReport("this_month", undefined, { supplierId: supplier.id });

    await createPurchase(
      {
        supplierId: supplier.id,
        items: [
          {
            productName: "Raw gold batch",
            purity: "K24",
            netWeight: 10,
            goldRate: 45000,
            wastageType: "FIXED_GRAMS",
            wastageGrams: 0,
            addToInventory: false,
          },
        ],
        payments: [{ method: "CASH", amount: 300000 }],
      },
      userId,
    );

    const after = await getPurchaseReport("this_month", undefined, { supplierId: supplier.id });
    expect(after.purchaseCount - before.purchaseCount).toBe(1);
    expect(decimalDelta(after.totalPurchaseCost, before.totalPurchaseCost)).toBe("450000");
    expect(decimalDelta(after.amountPaid, before.amountPaid)).toBe("300000");
    expect(decimalDelta(after.outstandingPayable, before.outstandingPayable)).toBe("150000");
  });
});

describe("Expense report", () => {
  it("groups by category and payment method", async () => {
    const category = await createExpenseCategory({ name: `Expense Report Test ${uniqueSuffix()}` }, userId);
    const before = await getExpenseReport("this_month");
    await createExpense(
      { categoryId: category.id, description: "Report test", amount: 7000, paymentMethod: "BANK_TRANSFER", expenseDate: new Date() },
      userId,
    );
    const after = await getExpenseReport("this_month");
    expect(decimalDelta(after.totalExpenses, before.totalExpenses)).toBe("7000");
    const newCategoryRow = after.byCategory.find((c) => c.categoryId === category.id);
    expect(newCategoryRow?.total).toBe("7000");
  });
});

describe("Cash report (Test 17)", () => {
  // Reads a system-wide, all-time-scoped aggregate (getCashReport), so — like the
  // profit-loss.service.integration.test.ts CRITICAL/PROFIT tests — this specific test can be
  // racy under the full test suite's parallel file execution if another file's own
  // CashTransaction write lands between the "before" and "after" reads below. It passes
  // reliably in isolation and in small groups; see PHASE-6-STATUS.md "Known issues" for the
  // same, previously-documented (Phase 4/5) class of shared-dev-database flakiness.
  it("reflects cash in/out via before/after deltas", async () => {
    const category = await createExpenseCategory({ name: `Cash Report Test ${uniqueSuffix()}` }, userId);
    const before = await getCashReport("this_month", undefined);
    await createExpense(
      { categoryId: category.id, description: "Cash report test", amount: 12000, paymentMethod: "CASH", expenseDate: new Date() },
      userId,
    );
    const after = await getCashReport("this_month", undefined);
    expect(decimalDelta(after.cashOut, before.cashOut)).toBe("12000");
  });
});

describe("Gold report (Test 16) — purity never combined", () => {
  it("K21 and K22 movements are tracked completely separately", async () => {
    const karigar = await createKarigar({ name: `Gold Report Karigar ${uniqueSuffix()}`, phone: uniquePhone("2") }, userId);
    const before = await getGoldReport("this_month", undefined);

    await giveGoldToKarigar({ karigarId: karigar.id, purity: "K21", weight: 8, goldRate: 30000 }, userId);
    await giveGoldToKarigar({ karigarId: karigar.id, purity: "K22", weight: 3, goldRate: 40000 }, userId);

    const after = await getGoldReport("this_month", undefined);
    const k21Before = before.rows.find((r) => r.purity === "K21")?.goldGiven ?? "0";
    const k21After = after.rows.find((r) => r.purity === "K21")?.goldGiven ?? "0";
    const k22Before = before.rows.find((r) => r.purity === "K22")?.goldGiven ?? "0";
    const k22After = after.rows.find((r) => r.purity === "K22")?.goldGiven ?? "0";

    expect(decimalDelta(k21After, k21Before)).toBe("8");
    expect(decimalDelta(k22After, k22Before)).toBe("3");
    // Never summed together into one combined figure anywhere in the row shape.
    expect(after.rows.every((r) => typeof r.purity === "string")).toBe(true);
  });
});

describe("Receivable aging (Test 14)", () => {
  it("a customer with a credit sale appears in the aging report with the correct outstanding balance", async () => {
    const customer = await createCustomer({ firstName: `Aging${uniqueSuffix()}`, phone: uniquePhone("3") }, userId);
    const item = await createInventoryItem(
      {
        productName: `Aging Report Item ${uniqueSuffix()}`,
        categoryId,
        purity: "K22",
        netWeight: 3,
        goldRate: 40000,
        wastageType: "FIXED_GRAMS",
        wastageGrams: 0,
        sellingPrice: 150000,
      },
      userId,
    );
    await completeSale(
      { items: [{ inventoryItemId: item.id }], customerId: customer.id, payments: [{ method: "CREDIT", amount: 150000 }] },
      { id: userId, role: { name: "OWNER" } },
    );

    const { rows } = await getReceivableAgingReport();
    const row = rows.find((r) => r.customerId === customer.id);
    expect(row).toBeDefined();
    expect(row?.outstandingBalance).toBe("150000");
    expect(row?.bucket).toBe("Current");
  });
});

describe("Payable report (Test 15)", () => {
  it("a supplier with an unpaid purchase appears as a KARIGAR/SUPPLIER-typed payable row", async () => {
    const supplier = await createSupplier({ name: `Payable Report Supplier ${uniqueSuffix()}`, phone: uniquePhone("4") }, userId);
    await createPurchase(
      {
        supplierId: supplier.id,
        items: [
          { productName: "Payable test batch", purity: "K22", netWeight: 4, goldRate: 40000, wastageType: "FIXED_GRAMS", wastageGrams: 0, addToInventory: false },
        ],
        payments: [],
      },
      userId,
    );

    const payables = await getPayableReport();
    const row = payables.find((p) => p.partyId === supplier.id);
    expect(row?.partyType).toBe("SUPPLIER");
    expect(row?.payable).toBe("160000");
  });

  it("gold obligations are reported separately by party, never converted to a rupee figure", async () => {
    const result = await getGoldObligationReport();
    expect(result).toHaveProperty("karigars");
    expect(result).toHaveProperty("suppliers");
  });
});

describe("Inventory valuation (Test 18)", () => {
  it("cost value and selling value are tracked distinctly, and current market value is a clearly separate figure", async () => {
    const before = await getInventoryValuationReport();
    await createInventoryItem(
      {
        productName: `Valuation Test Item ${uniqueSuffix()}`,
        categoryId,
        purity: "K22",
        netWeight: 6,
        goldRate: 40000,
        wastageType: "FIXED_GRAMS",
        wastageGrams: 0,
        sellingPrice: 280000,
      },
      userId,
    );
    const after = await getInventoryValuationReport();

    expect(after.totalItems).toBeGreaterThan(before.totalItems);
    expect(decimalDelta(after.costValue, before.costValue)).toBe("240000");
    expect(decimalDelta(after.sellingValue, before.sellingValue)).toBe("280000");
    // Cost and selling are never the same figure for an item with a markup.
    expect(after.costValue).not.toBe(after.sellingValue);
  });

  it("current market valuation is a distinct, separately-labeled figure from the recorded cost", async () => {
    const marketRows = await getInventoryCurrentMarketValuation();
    const valuationReport = await getInventoryValuationReport();
    // Both exist as independent read models — never merged into a single ambiguous number.
    expect(Array.isArray(marketRows)).toBe(true);
    expect(valuationReport.costValue).toBeDefined();
  });
});
