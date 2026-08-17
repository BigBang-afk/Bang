# Branch Architecture (Phase 8)

The multi-branch foundation: the `Branch`/`UserBranch` models, the
branch-authorization primitives, and — just as importantly — an honest
account of what this phase deliberately does **not** wire up yet. See
`ARCHITECTURE.md` "The branch-authorization pattern" and "The
nullable-branchId foundation, not full wiring" for the implementation
rationale; this file is the product-facing reference.

## `Branch`

`id`, `branchCode` (Postgres autoincrement, formatted "ZJB-001" via
`src/lib/branch-code.ts` — exactly the Barcode/Customer/Karigar identity
pattern, never a redundant stored string), `name`, `address`, `city`,
`phone`, `status` (`ACTIVE`/`INACTIVE`), `createdById`, timestamps.
`branch.service.ts` provides `createBranch()`, `updateBranch()`,
`listBranches()`, and `getBranchById()`.

## Branch access

Every `User` gained `branchAccessMode` (`ALL_BRANCHES` — the default —
or `SPECIFIC_BRANCHES`) and an optional `primaryBranchId` (display-only,
**never itself an authorization boundary** — it just seeds "which branch
should this user's dashboard default to"). `UserBranch` is the
specific-branch grant table, only consulted when `branchAccessMode` is
`SPECIFIC_BRANCHES`. `branch.service.ts`'s `setUserBranchAccess(userId,
mode, branchIds, actingUserId)` is the one write path for changing both
fields together, so a user can never end up with `SPECIFIC_BRANCHES` mode
and zero grants without that being an explicit, intentional state (which
`branchWhereClause()` then correctly treats as "sees nothing," not "sees
everything" — see below).

### The authorization primitives

`branch-access.service.ts` exports exactly two functions, and every
branch-sensitive BI query goes through both:

- **`resolveAuthorizedBranchIds(user)`** → `"ALL" | string[]`. `OWNER`
  always resolves to `"ALL"`, unconditionally. Anyone else resolves to
  `"ALL"` if their `branchAccessMode` is `ALL_BRANCHES`, or to the
  concrete list of branch ids from their `UserBranch` rows if it's
  `SPECIFIC_BRANCHES` — which can be an **empty array**, and that empty
  array is a real, distinct outcome (see below), not a bug.
- **`branchWhereClause(authorized, branchIdFilter?)`** → a Prisma `where`
  fragment. `"ALL"` with no filter returns `{}` (unrestricted); `"ALL"`
  with an explicit `branchId` scopes to exactly that branch; a specific
  array with no filter returns `{branchId: {in: [...]}}`; a specific
  array with an authorized filter returns `{branchId: X}`; and — the
  critical case — **a specific array with a filter that isn't in that
  array throws `BranchAccessDeniedError`**, never silently returning
  empty results or (worse) unrestricted ones.

No BI service function ever accepts a frontend-supplied `branchId` and
trusts it directly. It always passes through `branchWhereClause()` first.
This is what makes "a user authorized for Branch A can never see Branch
B's financial data" a property enforced by the query layer itself — see
the CRITICAL TEST in `tests/branch-access.service.integration.test.ts`,
which posts real `CashTransaction` rows to two different branches and
proves a Branch-A-only user's unscoped query excludes Branch B entirely,
and an explicit request for Branch B's data is rejected outright.

## Branch dashboard

Wherever a BI analytics function accepts an optional `branchId` (e.g.
`bi-cash-analytics.service.ts`'s `getBranchCashTotals()`), the Branch
Management / Executive Dashboard branch selector lets an authorized owner
compare Branch A vs. Branch B vs. All Branches across Sales, Profit,
Expenses, Customers, Inventory, Gold, and Cash — each comparison is just
the same underlying function called once per branch (or once unscoped for
"All Branches"), never a separate parallel computation.

## Branch inventory

`InventoryItem.branchId` exists (nullable) so a future phase can associate
stock with a specific location. Phase 8 does **not** implement stock
transfers between branches — the spec explicitly defers "complex stock
transfer workflows." The column is prepared architecture, not a working
feature yet.

## Global vs. branch data

Explicitly documented, per the spec's own categorization:

- **GLOBAL** (shared across every branch, no `branchId`): Customer
  identity, Product definitions, `ProductCategory`, `SystemSetting`. A
  customer can transact at multiple branches, so `Customer` deliberately
  has **no** `branchId` column — a per-branch customer relationship, if
  ever needed, belongs on the transactional side (e.g. `Sale.branchId`),
  never duplicated onto the customer record itself.
- **BRANCH** (scoped to one location, nullable `branchId` today): Stock
  (`InventoryItem`), Sales (`Sale`), Cash (`CashTransaction`), Expenses
  (`Expense`), Purchases (`Purchase`), Gold positions
  (`KarigarGoldJob`), and local operations (`Karigar`, `Supplier`).

## What Phase 8 does not wire up

Eight existing transactional models (`InventoryItem`, `Sale`, `Karigar`,
`Supplier`, `CashTransaction`, `Purchase`, `KarigarGoldJob`, `Expense`)
each gained an additive, **nullable** `branchId` column — but **no
existing creation-flow service function was modified to populate it**.
`createInventoryItem()`, `completeSale()`, `createExpense()`, and every
other Phase 1-7 write path still create rows with `branchId = null`
exactly as before. This is a deliberate scope boundary, not an oversight:
the spec asks Phase 8 to "prepare the database for multiple branches"
(satisfied — the column exists, and every BI query can already group/
filter on it) while also saying "do not rebuild the app" (which ruled out
touching eight already-tested, already-shipped creation flows in this
phase). A future phase that adds a branch picker to POS/Add Stock/
Purchases/Expenses/etc. is a pure, additive follow-up — no schema change
needed, since the column is already there.

## Permissions

`bi:branch_manage` gates creating a branch and changing a user's branch
access — deliberately its own key, separate from every `bi:*_view`
permission, since it's a materially bigger blast radius than viewing one
branch's numbers. See `ARCHITECTURE.md` "Authorization design."
