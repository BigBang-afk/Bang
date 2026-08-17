# Customer Segmentation (Phase 4)

## One rule set, computed centrally

`computeCustomerSegments(stats, config, now)` (`src/services/customer-analytics.service.ts`)
is a **pure function** — no database access, no side effects — and is the
single place every segmentation rule lives. Every page and every analytics
function that shows a segment (VIP Customers, Inactive Customers, Customer
Segments, the profile page's segment badges, the dashboard summary) calls
this function; none of them re-implements "what counts as VIP" or "what
counts as inactive" itself.

```ts
type SegmentableCustomerStats = {
  createdAt: Date;
  lastPurchaseAt: Date | null;
  totalSpending: Decimal | string | number;
  outstandingBalance: Decimal | string | number;
  purchaseCount: number;
};

function computeCustomerSegments(
  stats: SegmentableCustomerStats,
  config: SegmentationConfig, // { vipThreshold, inactivityDays }
  now?: Date,
): Segment[]
```

A customer can belong to several segments simultaneously (e.g. `VIP` and
`RECENT_BUYER` at once) — the function returns an array, not a single
label.

## The seven segments

| Segment | Rule |
| ------- | ---- |
| `NEW_CUSTOMER` | Created within the last 30 days **and** has made at most 1 purchase. |
| `VIP` | Lifetime spending ≥ the configurable VIP threshold (default Rs. 2,000,000). |
| `HIGH_VALUE` | Not already VIP, but spending ≥ 50% of the VIP threshold — the "approaching VIP" band. |
| `INACTIVE` | No purchase within the configurable inactivity window (default 90 days). For a customer who has *never* purchased, falls back to `createdAt` — a brand-new customer with zero purchases is not yet "inactive," but an old account that's never bought anything is. |
| `CREDIT_CUSTOMER` | `outstandingBalance > 0`. |
| `RECENT_BUYER` | Purchased within the last 30 days. |
| `REGULAR_CUSTOMER` | Fallback — assigned only when none of `NEW_CUSTOMER`, `VIP`, `HIGH_VALUE`, `INACTIVE` apply (a customer is never left with zero segments). |

`NEW_CUSTOMER`/`RECENT_BUYER`'s 30-day windows and the `HIGH_VALUE`
50%-of-VIP-threshold fraction are fixed constants
(`NEW_CUSTOMER_WINDOW_DAYS`, `RECENT_BUYER_WINDOW_DAYS`,
`HIGH_VALUE_FRACTION_OF_VIP`) — not currently exposed as `SystemSetting`
rows, unlike the VIP threshold and inactivity window below.

## Configuration

Two `SystemSetting` keys, read by `getSegmentationConfig()`:

| Key | Setting | Default |
| --- | ------- | ------- |
| `customer.vip_spending_threshold` | `VIP_SPENDING_THRESHOLD` | 2,000,000 |
| `customer.inactivity_days` | `CUSTOMER_INACTIVITY_DAYS` | 90 |

Both are parsed defensively — an unparseable or missing value falls back to
the default rather than throwing, since segmentation must never hard-fail a
page render because of a bad setting.

A third key, `customer.overpayment_allowed`
(`CUSTOMER_OVERPAYMENT_ALLOWED`, default `"false"`), configures the payment
flow (see `CUSTOMER-LEDGER.md`), not segmentation, but lives alongside the
other two in `SystemSetting`.

## VIP badge vs. `CustomerType`

**These are two independent things.** `Customer.customerType` (`REGULAR`,
`VIP`, `WHOLESALE`, `CORPORATE`) is a manually-set field — staff pick it
explicitly when creating or editing a customer, and it is never
automatically changed by the spending-based `VIP` segment. A customer whose
lifetime spending crosses the VIP threshold shows a **VIP badge** (driven
by `computeCustomerSegments()`) on their profile regardless of what
`customerType` says, and a customer manually set to `customerType: VIP`
does not bypass the threshold to earn the badge. This split is deliberate,
per the spec's explicit instruction: "But do not automatically change the
customer type."

## `CustomerStatus.INACTIVE` vs. the `INACTIVE` segment

Also fully independent, and easy to conflate:

- **`CustomerStatus`** (`ACTIVE`/`INACTIVE`/`BLOCKED`) is an **account**
  status, changed only by an explicit `changeCustomerStatus()` call (or by
  `archiveCustomer()`, which sets it to `INACTIVE`). It affects nothing
  about segmentation.
- **The `INACTIVE` segment** is a **computed marketing label** — no
  purchase within the inactivity window. A customer can be `status:
  ACTIVE` and still appear in the Inactive segment (they just haven't
  bought anything recently), and a customer marked `status: INACTIVE`
  (account disabled) is not automatically excluded from segment
  calculations — the two states are never cross-referenced.

Neither one ever changes the other. The inactivity window configuration
(`customer.inactivity_days`) affects only the segment, never the account
status — no code path auto-deactivates a customer's account for being
inactive.

## Segment pages

- **`/customers/vip`** — `listVipCustomers()`, everyone whose live spending
  clears the threshold, sorted by spending descending.
- **`/customers/inactive`** — `listInactiveCustomers()`, everyone with no
  purchase inside the inactivity window (including never-purchased-but-old
  accounts), sorted by last purchase ascending (longest-inactive first).
- **`/customers/segments`** — `getSegmentCounts()` for the overview cards,
  drilling into `listCustomersInSegment(segment)` per segment.

`listVipCustomers()`/`listInactiveCustomers()` use dedicated SQL
`HAVING` clauses for their one condition (cheaper than materializing every
customer); `listCustomersInSegment()`/`getSegmentCounts()`, which need the
full rule set rather than one condition, pull every customer's raw stats
once and run `computeCustomerSegments()` in application code.

## Tests

`tests/customer-analytics.integration.test.ts` covers every segment rule
individually (including the never-purchased-but-old and
brand-new-with-zero-purchases edge cases for `INACTIVE`/`NEW_CUSTOMER`),
and proves the VIP badge never mutates `customerType`.
