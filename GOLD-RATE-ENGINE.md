# Daily Gold Rate System & Jewelry Weight Calculation Engine

## Part 1 — Daily Gold Rate System

### Flow

1. An owner/admin logs in.
2. `(app)/layout.tsx` checks, server-side, whether today's business date has
   any gold rate rows (`todaysRatesExist()`).
3. If not, and the user holds the `gold_rate:create` permission, the
   `GoldRateGate` modal renders — a blocking dialog (no close button, no
   click-outside dismiss) with the exact fields from the spec: 24K, 22K,
   21K, 18K (required) and Silver (optional), each "per gram".
4. Submitting calls the `setTodaysGoldRates` Server Action, which
   re-validates everything with Zod, re-checks the permission, re-checks
   that today's rates still don't exist (defends against a race between two
   admins opening the modal at once), then persists one row per purity in a
   single transaction and writes a `GOLD_RATE_CREATED` audit log entry.
5. Once saved, the modal never reappears for that business date — every
   subsequent page load finds existing rows and skips the gate.

### Why rows are never updated or deleted

The spec requires: *"Never overwrite historical rates... When a new day's
rate is entered, create a new record. Historical records must remain
unchanged."*

The service layer has no update/delete path for a `GoldRate` row —
`createTodaysGoldRates` only ever calls `prisma.goldRate.create(...)`.
"Today's rate" is therefore not a single mutable value; it's whichever row
for a given `(businessDate, purity)` has the latest `createdAt` — the
*effective* rate:

```ts
// getEffectiveRatesForDate — src/services/gold-rate.service.ts
prisma.goldRate.findMany({
  where: { businessDate },
  orderBy: [{ purity: "asc" }, { createdAt: "desc" }],
  distinct: ["purity"],
  ...
})
```

This gives owners a path to fix a same-day typo (insert a new row with a
corrected rate — the older row becomes invisible to "today's effective
rate" but is never touched) without ever running an `UPDATE` on financial
history. Reports and audits can always reconstruct exactly what rate was in
effect at any past moment.

### Business date

`toBusinessDate()` / `getTodayBusinessDate()`
(`src/lib/business-date.ts`) always derive "today" from the **server**, at
UTC midnight for the server's local calendar day — never from a
client-supplied value, so a manipulated request can't backdate a rate
entry. (Known Phase 1 limitation: no per-store timezone setting yet — see
`README.md`.)

### History

`Settings → Gold Rates → History` (`/settings/gold-rates/history`) shows
one row per business date with a column per purity, filterable by date
range via a plain `GET` form (no client JS required). Gated behind the
`gold_rate:read` permission.

## Part 2 — Jewelry Weight Calculation Engine

`src/services/gold-calculation.service.ts` — pure, framework-agnostic,
fully unit-tested (`tests/gold-calculation.service.test.ts`).

### Core formulas

```
wastageWeight (percentage mode) = netWeight × wastagePercent / 100
wastageWeight (fixed grams mode) = the given value, as-is
grossWeight                      = netWeight + wastageWeight
```

### Pricing modes

The engine supports three pricing strategies, selected via
`pricingMode` (defaults to `MODE_A`):

| Mode     | Formula                              |
| -------- | -------------------------------------- |
| `MODE_A` | `grossWeight × goldRate`               |
| `MODE_B` | `(netWeight + wastage) × goldRate` — numerically identical to `MODE_A`, kept as a distinct named mode so calling code can express intent explicitly |
| `MODE_C` | `netWeight × goldRate + makingCharges` |

### Worked example (from the spec)

```
Net Weight = 10.000 g
Wastage    = 5%
Gold Rate  = Rs. 40,000/g

Wastage Weight = 10 × 5 / 100        = 0.500 g
Gross Weight   = 10 + 0.500          = 10.500 g
Gold Value     = 10.500 × 40,000     = Rs. 420,000
```

This exact scenario is `tests/gold-calculation.service.test.ts` → "Test 1".

### Wastage types

- `PERCENTAGE` — `wastagePercent` must be `0 <= x <= 100`.
- `FIXED_GRAMS` — `wastageGrams` must be `>= 0`.

### Precision policy

- All arithmetic uses `decimal.js` (`Decimal`), never native JS
  floating-point. `tests/gold-calculation.service.test.ts` includes a
  dedicated test proving `0.1 + 0.2` style inputs don't drift.
- The engine **does not round its own output**. `calculateGoldValue`
  returns full-precision `Decimal` values for every field
  (`netWeight`, `wastageWeight`, `grossWeight`, `goldRate`, `goldValue`,
  ...) — rounding only happens in `src/lib/format.ts` at display time
  (`formatWeight` → 3 decimal places, `formatCurrency` → 2 decimal places,
  half-up). This matters once these values are persisted in a future
  phase: the stored figure is never a value that was silently truncated
  for a UI label.
- Weights support at least 3 decimal places end-to-end (e.g. `1.250 g`,
  `25.375 g`); the engine itself has no artificial precision ceiling.

### Validation & error handling

Every input is validated inside the engine itself (not just at the HTTP/UI
boundary), and throws a typed `GoldCalculationError` with a `field` so
callers can surface a precise, field-level message:

- Missing net weight, gold rate, or wastage details.
- Net weight `<= 0`, or an unrealistically large value (`> 1,000,000 g`,
  a sanity ceiling against fat-finger input).
- Gold rate `<= 0`.
- Wastage percentage outside `[0, 100]`.
- Negative fixed-gram wastage.
- Negative making charges (`MODE_C`).
- Non-numeric input of any kind.

### Server-side enforcement

`calculateGoldValueAction` (`src/lib/actions/gold-calculation.actions.ts`)
is a Server Action that wraps the engine with Zod input parsing and error
serialization. The reusable `<GoldCalculator>` component
(`src/components/calculator/gold-calculator.tsx`) calls this action —
debounced ~200ms — on every field change, so the number shown on screen is
always the server's answer, never a value the browser computed (and could
therefore be tampered with) on its own. See `ARCHITECTURE.md` for the
rationale.

### Tests

`tests/gold-calculation.service.test.ts` covers, in addition to the three
worked examples from the spec:

- Percentage vs. fixed-gram wastage, including the zero-wastage edge case.
- All three pricing modes, including `MODE_C`'s default-zero making charges.
- Zero / negative / missing net weight and gold rate.
- Wastage percentage `< 0` and `> 100`; negative fixed-gram wastage;
  negative making charges.
- Non-numeric input and unrealistically large input.
- Very small weights (`0.001 g`), large weights (`50,000 g`), 3+ decimal
  precision, and the classic floating-point drift case.

Run with `npm test`.
