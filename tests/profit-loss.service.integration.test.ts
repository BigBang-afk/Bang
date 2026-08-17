import { describe, expect, it, beforeAll } from "vitest";
import Decimal from "decimal.js";
import { prisma } from "@/lib/db/prisma";
import { getProfitAndLoss } from "@/services/profit-loss.service";
import { createInventoryItem } from "@/services/inventory-item.service";
import { completeSale } from "@/services/sale-transaction.service";
import { requestReturn, approveReturn } from "@/services/returns.service";
import { createExpense } from "@/services/expense.service";
import { createExpenseCategory } from "@/services/expense-category.service";
import { createIncome } from "@/services/income.service";
import { getSeededOwnerId, getTestCategoryId, uniqueSuffix } from "./helpers/db-fixtures";

let userId: string;
let categoryId: string;

beforeAll(async () => {
  userId = await getSeededOwnerId();
  categoryId = await getTestCategoryId();
});

/**
 * Builds a sellable item with an EXACT, known cost: netWeight 10g @ Rs. 40,000/g, FIXED_GRAMS
 * wastage of 0 (so grossWeight stays 10) and zero making/stone/diamond/other charges — goldValue
 * = totalCost = 400,000 exactly, matching the spec's CRITICAL TEST inventory cost.
 */
async function createKnownCostItem(sellingPrice: number, overrides: { netWeight?: number; goldRate?: number } = {}) {
  const netWeight = overrides.netWeight ?? 10;
  const goldRate = overrides.goldRate ?? 40000;
  return createInventoryItem(
    {
      productName: `P&L Test Item ${uniqueSuffix()}`,
      categoryId,
      purity: "K22",
      netWeight,
      goldRate,
      wastageType: "FIXED_GRAMS",
      wastageGrams: 0,
      sellingPrice,
    },
    userId,
  );
}

function decimalDelta(after: string, before: string): string {
  return new Decimal(after).sub(before).toString();
}

describe("CRITICAL PROFIT TEST — Sale 500,000 / Cost 400,000 / Discount 20,000 -> Gross Profit 80,000; Expense 30,000 -> Net Profit 50,000", () => {
  it("matches every figure in the spec's worked example exactly, via before/after deltas (see note on shared-DB isolation below)", async () => {
    // getProfitAndLoss aggregates system-wide, and this integration suite runs against a shared,
    // persistent dev database (see PHASE-5-STATUS.md "Tests passed" for the documented,
    // pre-existing limitation) — so absolute totals are not test-controlled, and a before/after
    // delta is immune to anything retroactive. It is NOT immune to another test file writing a
    // Sale/Expense/Income in the exact moment between the two reads below when the full suite
    // runs with maximum parallelism (Sale.saleDate can never be backdated into an isolated
    // window, unlike Expense/Income). Passes reliably in isolation/small groups; see
    // PHASE-6-STATUS.md "Known issues" for this same class of accepted flakiness.
    const before = await getProfitAndLoss("this_month");

    const item = await createKnownCostItem(500000);
    expect(item).toBeDefined();
    const created = await prisma.inventoryItem.findUniqueOrThrow({ where: { id: item.id } });
    expect(new Decimal(created.totalCost.toString()).toNumber()).toBe(400000);
    expect(new Decimal(created.goldValue.toString()).toNumber()).toBe(400000);

    await completeSale(
      {
        items: [{ inventoryItemId: item.id, discountType: "FIXED", discountValue: 20000 }],
        payments: [{ method: "CASH", amount: 480000 }],
      },
      { id: userId, role: { name: "OWNER" } },
    );

    const category = await createExpenseCategory({ name: `Critical Profit Test ${uniqueSuffix()}` }, userId);
    await createExpense(
      { categoryId: category.id, description: "Critical test expense", amount: 30000, paymentMethod: "CASH", expenseDate: new Date() },
      userId,
    );

    const after = await getProfitAndLoss("this_month");

    expect(decimalDelta(after.netSales, before.netSales)).toBe("480000");
    expect(decimalDelta(after.cogs, before.cogs)).toBe("400000");
    expect(decimalDelta(after.grossProfit, before.grossProfit)).toBe("80000");
    expect(decimalDelta(after.operatingExpenses, before.operatingExpenses)).toBe("30000");
    expect(decimalDelta(after.netProfit, before.netProfit)).toBe("50000");
  });
});

describe("PROFIT TEST — Gross Sales 1,000,000 / Discount 50,000 / COGS 700,000 / Other Income 20,000 / Expenses 100,000 -> Net Profit 170,000", () => {
  // Same before/after-delta isolation strategy and the same accepted race window under full-suite
  // parallelism as the CRITICAL PROFIT TEST above.
  it("matches every figure via before/after deltas", async () => {
    const before = await getProfitAndLoss("this_month");

    // Item 1: cost 400,000, sold at 500,000 with a 20,000 discount.
    const item1 = await createKnownCostItem(500000);
    // Item 2: cost 300,000 (7.5g @ 40,000), sold at 500,000 with a 30,000 discount.
    const item2 = await createKnownCostItem(500000, { netWeight: 7.5 });

    await completeSale(
      {
        items: [
          { inventoryItemId: item1.id, discountType: "FIXED", discountValue: 20000 },
          { inventoryItemId: item2.id, discountType: "FIXED", discountValue: 30000 },
        ],
        payments: [{ method: "CASH", amount: 950000 }],
      },
      { id: userId, role: { name: "OWNER" } },
    );

    await createIncome(
      { incomeType: "OTHER_INCOME", description: "Profit test income", amount: 20000, paymentMethod: "CASH", incomeDate: new Date() },
      userId,
    );

    const category = await createExpenseCategory({ name: `Profit Test ${uniqueSuffix()}` }, userId);
    await createExpense(
      { categoryId: category.id, description: "Profit test expense", amount: 100000, paymentMethod: "CASH", expenseDate: new Date() },
      userId,
    );

    const after = await getProfitAndLoss("this_month");

    expect(decimalDelta(after.grossSales, before.grossSales)).toBe("1000000");
    expect(decimalDelta(after.discounts, before.discounts)).toBe("50000");
    expect(decimalDelta(after.netSales, before.netSales)).toBe("950000");
    expect(decimalDelta(after.cogs, before.cogs)).toBe("700000");
    expect(decimalDelta(after.grossProfit, before.grossProfit)).toBe("250000");
    expect(decimalDelta(after.otherIncome, before.otherIncome)).toBe("20000");
    expect(decimalDelta(after.operatingExpenses, before.operatingExpenses)).toBe("100000");
    expect(decimalDelta(after.netProfit, before.netProfit)).toBe("170000");
  });
});

describe("Discounts (Test 12)", () => {
  it("a discount reduces revenue but never touches COGS — gross profit falls by exactly the discount", async () => {
    const before = await getProfitAndLoss("this_month");
    const item = await createKnownCostItem(500000);

    await completeSale(
      {
        items: [{ inventoryItemId: item.id, discountType: "FIXED", discountValue: 100000 }],
        payments: [{ method: "CASH", amount: 400000 }],
      },
      { id: userId, role: { name: "OWNER" } },
    );

    const after = await getProfitAndLoss("this_month");
    expect(decimalDelta(after.netSales, before.netSales)).toBe("400000");
    expect(decimalDelta(after.cogs, before.cogs)).toBe("400000");
    expect(decimalDelta(after.grossProfit, before.grossProfit)).toBe("0");
  });
});

describe("Returns (Test 13)", () => {
  it("an approved return reverses BOTH revenue and COGS together, never just subtracting refund cash from profit", async () => {
    const before = await getProfitAndLoss("this_month");
    const item = await createKnownCostItem(500000);

    const sale = await completeSale(
      { items: [{ inventoryItemId: item.id }], payments: [{ method: "CASH", amount: 500000 }] },
      { id: userId, role: { name: "OWNER" } },
    );

    const afterSale = await getProfitAndLoss("this_month");
    expect(decimalDelta(afterSale.netSales, before.netSales)).toBe("500000");
    expect(decimalDelta(afterSale.cogs, before.cogs)).toBe("400000");
    expect(decimalDelta(afterSale.grossProfit, before.grossProfit)).toBe("100000");

    const saleDetail = await prisma.sale.findUniqueOrThrow({ where: { id: sale.id }, include: { items: true } });
    const returnRow = await requestReturn(saleDetail.items[0].id, "Wrong size", userId);
    await approveReturn(returnRow.id, userId);

    const afterReturn = await getProfitAndLoss("this_month");
    // Fully reversed relative to the pre-sale baseline — not just "sale minus refund cash".
    expect(decimalDelta(afterReturn.netSales, before.netSales)).toBe("0");
    expect(decimalDelta(afterReturn.cogs, before.cogs)).toBe("0");
    expect(decimalDelta(afterReturn.grossProfit, before.grossProfit)).toBe("0");
  });
});

describe("Margins", () => {
  it("gross and net margin percent are internally consistent with the reported absolute figures", async () => {
    const item = await createKnownCostItem(500000);
    await completeSale(
      { items: [{ inventoryItemId: item.id }], payments: [{ method: "CASH", amount: 500000 }] },
      { id: userId, role: { name: "OWNER" } },
    );

    const report = await getProfitAndLoss("this_month");
    const expectedGrossMargin = new Decimal(report.grossProfit).div(report.netSales).mul(100).toDecimalPlaces(2);
    const expectedNetMargin = new Decimal(report.netProfit).div(report.netSales).mul(100).toDecimalPlaces(2);
    expect(report.grossMarginPercent).toBe(expectedGrossMargin.toString());
    expect(report.netMarginPercent).toBe(expectedNetMargin.toString());
  });

  it("handles zero revenue safely — never NaN or Infinity", async () => {
    // A custom range guaranteed to contain no sales.
    const report = await getProfitAndLoss("custom", { from: new Date("1999-01-01"), to: new Date("1999-01-02") });
    expect(report.netSales).toBe("0");
    expect(report.grossMarginPercent).toBe("0");
    expect(report.netMarginPercent).toBe("0");
  });
});

describe("COGS methodology (Test 9)", () => {
  // Same before/after-delta isolation strategy and the same accepted race window under full-suite
  // parallelism as the CRITICAL PROFIT TEST above.
  it("uses the item's own recorded cost snapshot, never today's gold rate", async () => {
    const item = await createKnownCostItem(500000, { goldRate: 40000 });
    const before = await getProfitAndLoss("this_month");

    await completeSale(
      { items: [{ inventoryItemId: item.id }], payments: [{ method: "CASH", amount: 500000 }] },
      { id: userId, role: { name: "OWNER" } },
    );

    const after = await getProfitAndLoss("this_month");
    // COGS delta is exactly the item's recorded totalCost (400,000), regardless of whatever
    // today's actual gold rate setting is.
    expect(decimalDelta(after.cogs, before.cogs)).toBe("400000");
  });
});
