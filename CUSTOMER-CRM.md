# Customer CRM (Phase 4)

## Why `name` survives alongside `firstName`/`lastName`

The spec wants a proper `firstName`/`lastName` split on the add/edit forms,
but Phase 3's `Customer.name` is already read everywhere — POS's customer
picker, every `Sale`/`Invoice` render, sale history search. Rather than
rename `name` and chase down every caller, Phase 4 adds `firstName` and
`lastName` as new nullable columns and keeps `name` as the one canonical
display field, recombined from them at create/update time:

```ts
const name = [input.firstName.trim(), input.lastName?.trim()].filter(Boolean).join(" ");
```

Every Phase 3 read path is untouched. Every Phase 4 write path goes through
`createCustomer()`/`updateCustomer()`, so `name` and `firstName`/`lastName`
can never drift out of sync.

## Customer code — `ZJC-NNNNNN`

`Customer.customerCode` is a Postgres-native `Int @default(autoincrement())`
column — the real identity, race-free under concurrent inserts by the
database itself, never re-derived or reused even if a customer record is
later archived. `src/lib/customer-code.ts` only formats/parses it to and
from the display string, exactly mirroring `barcode-code.ts`
(`ZJ-NNNNNN`) and `invoice-number.ts` (`ZJ-INV-NNNNNN`):

```
formatCustomerCode(1)        -> "ZJC-000001"
parseCustomerCode("ZJC-000001") -> 1
parseCustomerCode("42")      -> 42   (bare numbers also parse)
parseCustomerCode("ZJ-000001")  -> null  (wrong prefix — never confused with a barcode)
```

A separate table (the way `Barcode`/`Invoice` track document-print
lifecycle for `InventoryItem`/`Sale`) wasn't needed here — a customer code
has no print count, no "last printed" timestamp, nothing beyond the number
itself, so the autoincrement column lives directly on `Customer`.

## Duplicate detection — one hard rule, one soft warning

`Customer.phone` carries the same `@unique` constraint it had in Phase 3 —
a second customer with the exact same primary phone is a hard error
(`DuplicateCustomerPhoneError`), not a warning, both at the database level
and in `createCustomer()`/`updateCustomer()`.

Above that, `findPossibleDuplicates({ phone, secondaryPhone?, email? })`
does a *soft* check: does any existing customer's `phone` or
`secondaryPhone` match the entered `phone` or `secondaryPhone`, or does any
existing customer's `email` match? A match here is not blocked — the Add
Customer form shows a "Possible duplicate customer" dialog listing every
match (name, phone, total spending, last purchase) with two explicit
actions:

- **Use Existing Customer** — navigates to the matched customer's profile
  instead of creating a new record.
- **Create New Customer Anyway** — submits the create anyway. This only
  fails if the *primary* phone is an exact duplicate (the hard rule above);
  a shared `secondaryPhone` or `email` alone can never block a legitimate
  create (e.g. a spouse buying under a shared home phone number).

## Why spending isn't cached

`Customer.outstandingBalance` is a cached column because it's a *balance*
— something written to transactionally by ledger events and read
constantly; caching it and keeping it consistent via
`appendCustomerLedgerEntry()` (see `CUSTOMER-LEDGER.md`) is both correct and
necessary for POS to check it fast.

`totalSpending`, `purchaseCount`, `lastPurchaseAt`, and every VIP/
segmentation number derived from them are the opposite: pure read-time
aggregates over `sales` (excluding `RETURNED` sales), computed fresh on
every request via raw SQL (`customer-analytics.service.ts`,
`customer.service.ts`'s `listCustomers()`). There is deliberately no
`totalSpending` column to keep in sync. If a sale is later returned, its
effect on a customer's spending, VIP status, and inactivity disappears the
next time any page reads it — no cache-invalidation code needed anywhere,
because there is no cache to invalidate. See ARCHITECTURE.md "Raw SQL for
aggregate customer stats".

## All Customers — search, filter, sort

`listCustomers()` (`src/services/customer.service.ts`) is one raw-SQL query
built with `Prisma.sql`/`Prisma.join`/`Prisma.empty` fragments (all dynamic
values parameterized, never string-interpolated), joining `sales` for the
live spending/purchase aggregates described above. Supports:

- **Search** — name, phone, secondary phone, email, or `ZJC-NNNNNN` code.
- **Filters** — `customerType`, `status`, `city`, spending range,
  outstanding-balance minimum, purchase-date range.
- **Sort** — Newest, Oldest, Highest Spending, Highest Outstanding, Most
  Purchases, Most Recent Purchase.
- **Pagination** — server-side, page size clamped to 100.

`exportAllCustomers()` is a separate, unpaginated function used only by CSV
export — `listCustomers()`'s page-size clamp would otherwise silently
truncate an export past 100 rows.

## Customer Profile — tab pre-rendering

The profile page (`src/app/(app)/customers/[id]/page.tsx`) fetches the
customer's profile, lifetime value, segments, sales, ledger entries,
payments, notes, and activity in parallel, then pre-renders each of the 8
tabs' content as JSX *on the server* and passes the already-rendered nodes
as children into a thin `"use client"` `<CustomerProfileTabs>` wrapper
(Radix Tabs, just for the interactive tab-switching). This sidesteps the
Prisma `Decimal` Server→Client serialization pitfall entirely (see
ARCHITECTURE.md) — no Decimal value ever needs to cross the boundary, since
every number is already formatted to a string server-side before the tab
content is built.

The 8 tabs: **Overview** (contact info, preferences summary, segment
badges), **Purchases** (sales history for this customer), **Invoices**,
**Ledger** (see `CUSTOMER-LEDGER.md`), **Payments** (history +
"Receive Payment"), **Notes** (multi-entry, see below), **Preferences**,
**Activity** (see below).

## Notes — multi-entry, never overwritten

`CustomerNote` is its own table, one row per note. Adding a note always
inserts a new row (`CUSTOMER_NOTE_CREATED` audit); editing an existing note
updates that same row in place (`CUSTOMER_NOTE_UPDATED` audit) — there is
no delete path and no "latest note replaces the old one" behavior. The
Phase 3 single `Customer.notes` text field still exists in the schema for
backward compatibility but the Phase 4 UI never writes to it.

## Preferences

`CustomerPreference` is 1:1 with `Customer` — preferred categories (free
list), preferred purity/metal, a price range, a preferred contact method,
and free-text notes. These are deliberately jewelry-business preferences
("prefers 21K, usually buys bridal sets"), not a behavioral-profiling or
tracking table.

## Privacy

`gender` and `preferredLanguage` are optional, freeform text fields,
collected only if the customer volunteers them, and are never read by any
segmentation, pricing, or business-rule code — `computeCustomerSegments()`
(`CUSTOMER-SEGMENTS.md`) uses only spending, purchase recency, and
outstanding balance. Every customer-record read/write is server-side and
permission-gated (see "Permissions" below); no customer PII is ever logged
to the client console or included in a thrown client-visible error message.

## Birthday / anniversary

`dateOfBirth`/`anniversaryDate` are stored as plain `date` columns.
`getUpcomingBirthdays()`/`getUpcomingAnniversaries()` (`customer-analytics.service.ts`)
compute "next occurrence" per customer (handling the December→January
year-rollover) and return everyone within a configurable look-ahead window
(default 30 days), rendered as two dashboard widgets. **This is display
only** — there is no automated WhatsApp/SMS sending, per the spec's
explicit "DO NOT BUILD YET." A blocked customer (`status: BLOCKED`) is
excluded from both widgets.

## Customer import (prepared, not exposed)

Per the spec, only the service-layer shape is prepared, with no UI:
`CreateCustomerInput` already matches a natural CSV/Excel row shape
(firstName, lastName, phone, email, address, city, ...), and
`createCustomer()`/`findPossibleDuplicates()` are already the two functions
a bulk-import routine would call per row (duplicate-check, then create).
Building the actual upload UI, file parsing, and row-by-row progress/error
reporting is left to a future phase.

## Customer export

`exportCustomersAction` (`src/lib/actions/customers.actions.ts`), gated by
`customers:export`, builds a CSV from `exportAllCustomers()` and streams it
to the client for download (`export-customers-button.tsx`, a client Blob
download — no server-written temp file). Writes a `CUSTOMER_EXPORTED` audit
log entry with the exporting user and row count.

## Permissions

Eight new permission keys, module `CUSTOMERS`, each independently
grantable — no single "customers" permission bundles all of this, per the
spec's role matrix:

| Key                    | Grants                                                    |
| ----------------------- | ---------------------------------------------------------- |
| `customers:view`        | Search and view customers                                  |
| `customers:create`      | Create new customer records                                |
| `customers:manage`      | Edit, archive, and change status/type of existing customers |
| `customers:notes`       | Add customer notes                                          |
| `customers:ledger`      | View the customer financial ledger                          |
| `customers:payment`     | Record a customer payment against outstanding balance        |
| `customers:export`      | Export customer data to CSV                                  |
| `customers:segments`    | View VIP/inactive/segment analytics                          |

Intended grants per the spec (OWNER bypasses all checks in code; ADMIN is
seeded with every permission today):

- **OWNER** — full, unrestricted.
- **ADMIN** — full customer management.
- **MANAGER** — per-permission, configured individually.
- **CASHIER** — `view`, `create`, `payment` (search/view customers, create
  a walk-in during checkout, record a payment they take at the counter).
- **SALESPERSON** — `view`, `create`, `notes`.
- **ACCOUNTANT** — `ledger`, `payment` (financial info and payments, not
  general profile editing).
- **MARKETING_MANAGER** — `segments` (marketing-facing segmentation info,
  not financial data).

Only `OWNER` and `ADMIN` roles are seeded today (see README "Known
limitations") — every permission above is already scoped exactly per this
table so a future role-management UI can grant it to `MANAGER`/`CASHIER`/
`SALESPERSON`/`ACCOUNTANT`/`MARKETING_MANAGER` without any service-layer
change.

## Audit log actions

`CUSTOMER_UPDATED`, `CUSTOMER_ARCHIVED`, `CUSTOMER_STATUS_CHANGED`,
`CUSTOMER_TYPE_CHANGED`, `CUSTOMER_PAYMENT_RECEIVED`,
`CUSTOMER_NOTE_CREATED`, `CUSTOMER_NOTE_UPDATED`,
`CUSTOMER_LEDGER_ADJUSTED`, `CUSTOMER_EXPORTED`, `VIP_SETTING_CHANGED` —
added to the same `AuditAction` enum Phase 1-3 already use (`CUSTOMER_CREATED`
was added in Phase 3). Always written after the relevant transaction
commits, never inside it — the established pattern, so a rolled-back
transaction never leaves behind a log entry for something that didn't
happen.

## Activity timeline — reusing `AuditLog`

`getCustomerActivity()` (`customer-activity.service.ts`) does not introduce
a parallel "CustomerEvent" table. It queries the existing `AuditLog` two
ways and merges the results by timestamp: directly, for rows where
`entity ∈ {Customer, CustomerNote, CustomerPayment}` and `entityId` is this
customer's id; and indirectly, for rows where `entity ∈ {Sale, Invoice}`
and `entityId` is one of this customer's own sale ids. See ARCHITECTURE.md
"Reusing AuditLog for customer activity."

## Archiving vs. account status vs. segment

Three distinct, deliberately non-overlapping concepts:

- **`archiveCustomer()`** — a service-level action (`CUSTOMER_ARCHIVED`
  audit) that sets `status = INACTIVE`. There is no `archivedAt` soft-delete
  column; `CustomerStatus` alone is sufficient state.
- **`CustomerStatus`** (`ACTIVE`/`INACTIVE`/`BLOCKED`) — the customer's
  *account* status. Never changed by any automated process — only by an
  explicit `changeCustomerStatus()` call.
- **The "Inactive Customers" segment** — a computed, read-time marketing
  label (no purchase within the configurable inactivity window) that has
  nothing to do with `CustomerStatus`. A customer can be `status: ACTIVE`
  and still show up in the Inactive segment, and vice versa. See
  `CUSTOMER-SEGMENTS.md`.

## Dashboard summary

`getCustomerDashboardSummary()` returns Total Customers, New This Month,
Active, VIP, Inactive, and With Outstanding Balance — every number a real
`count()`/aggregate against the database, never a placeholder.

## Known gaps (explicitly out of scope for Phase 4)

WhatsApp automation, SMS automation, AI marketing, AI customer prediction,
an AI assistant, loyalty points, a referral system, advanced marketing
campaigns, AI image generation, and Karigar accounting — all explicitly
listed in the spec as "DO NOT BUILD YET." Returns are not yet wired to the
ledger — see `CUSTOMER-LEDGER.md` "Returns integration".
