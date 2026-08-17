# Profit & Loss (Phase 6)

## The formula

```
Gross Sales − Discounts = Net Sales
Net Sales − COGS = Gross Profit                    (Gross Margin % = Gross Profit / Net Sales × 100)
Gross Profit + Other Income − Operating Expenses = Net Profit   (Net Margin % = Net Profit / Net Sales × 100)
```

`getProfitAndLoss(preset, custom?)` (`profit-loss.service.ts`) computes all
of this from three aggregates, run in parallel, for a resolved date range
(`resolveReportDateRange()` — see `ACCOUNTING.md` "Report date presets"):

1. **Sales aggregate** — `SaleItem.aggregate()` over every item whose sale
   falls in range **and** is not currently returned (see "Returns policy"
   below): `originalSellingPrice` sums to Gross Sales, `discountAmount`
   sums to Discounts, `finalPrice` sums to Net Sales, and
   `goldValue + makingCharge + stoneCharge + diamondCharge + otherCharge`
   sums to COGS.
2. **Other income** — `Income.aggregate()`, `status: ACTIVE`, in range.
3. **Operating expenses** — `Expense.aggregate()`, `status: ACTIVE`, in
   range.

## COGS methodology — the item's own recorded cost, never today's rate

COGS is built entirely from `SaleItem`'s own copied cost columns
(`goldValue`, `makingCharge`, `stoneCharge`, `diamondCharge`,
`otherCharge`) — the exact snapshot `InventoryItem.totalCost` was built
from at sale time (Phase 2/3). It is **never** recalculated using today's
gold rate, and never reads `GoldRate` at all. Selling an item bought when
gold was cheaper always reports the same profit it actually earned,
regardless of how much gold rates have moved since — see
`ARCHITECTURE.md` "Precision & money handling" and `INVENTORY.md` for why
that cost snapshot exists in the first place.
`tests/profit-loss.service.integration.test.ts`'s "COGS methodology"
test verifies this directly: an item costed at a fixed gold rate reports
the exact same COGS delta regardless of whatever the system's actual
current gold rate setting is at test time.

## Discounts

`Gross Sales − Discounts = Net Sales` is always shown as three explicit
numbers, never collapsed into one. COGS is **never** affected by a
discount — the item's recorded cost doesn't change because it sold for
less, so a bigger discount shows up entirely as lower Gross Profit, never
as a phantom change to cost.

## Returns policy — reverses both revenue and COGS together

A `SaleItem` is included in the P&L for its sale's date range **unless**
its linked `Return` has `status: RETURNED` — regardless of when the return
was actually processed. A fully returned item is treated as though it
never sold at all: both its revenue (Gross/Net Sales) and its COGS drop out
of the report together. This is deliberately **not** "subtract the refund
cash from profit" — that would leave COGS overstated and understate gross
profit incorrectly. One documented consequence: re-running a *past*
period's P&L can show a different number after a later return is approved,
since the return retroactively changes which `SaleItem`s count — this is
intentional, not a caching bug.

## Worked examples (verified by the test suite)

**CRITICAL PROFIT TEST** — Sale 500,000, Inventory Cost 400,000, Discount
20,000:

```
Net Sales    = 500,000 − 20,000 = 480,000
COGS         = 400,000
Gross Profit = 480,000 − 400,000 = 80,000
Expense 30,000 recorded
Net Profit   = 80,000 − 30,000 = 50,000
```

**PROFIT TEST** — two items (cost 400,000 + 300,000 = 700,000 total),
Gross Sales 1,000,000, Discounts 50,000, Other Income 20,000, Operating
Expenses 100,000:

```
Net Sales    = 1,000,000 − 50,000 = 950,000
Gross Profit = 950,000 − 700,000 = 250,000
Net Profit   = 250,000 + 20,000 − 100,000 = 170,000
```

Both are asserted exactly in `tests/profit-loss.service.integration.test.ts`.

### Delta-testing against a shared database

`getProfitAndLoss()` aggregates **every** matching row in the database —
there is no way to scope it to "just this test's data," since `Sale.saleDate`
can never be backdated into an isolated window the way `Expense.expenseDate`/
`Income.incomeDate` can. Every P&L test therefore reads the report once
**before** its scenario, once **after**, and asserts the **delta** matches
the expected figure exactly. This is immune to all pre-existing/retroactive
pollution in the shared dev database, but remains theoretically racy
against another test file's concurrent write landing in the exact instant
between the two reads — addressed at the infrastructure level by
`vitest.config.mts`'s `fileParallelism: false` (see `ARCHITECTURE.md` "Test
infrastructure").

## Margins

`grossMarginPercent = grossProfit / netSales × 100`,
`netMarginPercent = netProfit / netSales × 100`, both rounded to 2 decimal
places. Zero net sales returns `"0"` for both — never `NaN` or `Infinity`.

## Date presets

Same shared preset vocabulary as every other report — `today`, `yesterday`,
`this_week`, `last_7_days`, `this_month`, `last_month`, `this_year`,
`custom` — resolved server-side in the configured business timezone. See
`ACCOUNTING.md` "Report date presets".

## Permissions

`accounting:reports:view` gates the Profit & Loss page.
`accounting:export` additionally gates its CSV export — see
`FINANCIAL-REPORTS.md` "Export architecture".
