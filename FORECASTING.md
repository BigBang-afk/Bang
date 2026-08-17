# Forecasting (Phase 8)

`forecast.service.ts`, surfaced at `(app)/business-intelligence/forecasting/page.tsx`.
Every forecast type shares two primitives — `classifyDataSufficiency()`
and `projectSeries()` — and every forecast's headline number carries three
things without exception: an `"ESTIMATE"` label, a `basis` string
explaining what it's based on, and a `confidence` classification. See
`ARCHITECTURE.md` "The bounded forecast projection model" for the
implementation detail; this file covers the product-facing contract and
the safety guarantees behind it.

## The one rule that matters most

**A forecast is never presented as guaranteed.** Every forecast card in
the UI displays the literal text "Every number below is an ESTIMATE,
based on historical data. Never guaranteed, never certain, never 100%
accurate." No forecast type, anywhere in the codebase, ever renders the
words "Guaranteed," "Certain," or "100% accurate" as a claim about its own
number — those words appear exactly once, in that disclaimer, always
negated.

## Data sufficiency

`classifyDataSufficiency(historyDaysAvailable)` reads two configurable
`SystemSetting` thresholds and returns one of three values:

| Days of history available | Classification | Behavior |
| --- | --- | --- |
| below `BI_FORECAST_MIN_DAYS_INSUFFICIENT` (default 30) | `INSUFFICIENT_DATA` | the forecast's headline number is `null` — **never a fabricated figure** |
| between the two thresholds | `LOW_CONFIDENCE` | a number is shown, flagged as low-confidence |
| at/above `BI_FORECAST_MIN_DAYS_STANDARD` (default 90) | `STANDARD_CONFIDENCE` | a number is shown at standard confidence |

This is the mechanism behind the spec's CRITICAL FORECAST TEST: give
`getSalesForecast()` (or any of the other four forecast functions) too
little history, and its headline field (`forecastTotal`, `projectedCash`,
`forecastOrderCount`, ...) is `null`, not a best-effort guess. See the
CRITICAL FORECAST TEST in `tests/forecast.service.integration.test.ts`,
which forces this deterministically by temporarily raising the threshold
settings to an unreachable value — a technique that works regardless of
how much real history has actually accumulated in the shared dev
database.

## The projection model

`projectSeries()` is the one function every forecast type's trend
component calls. It splits the historical daily series into oldest/recent
thirds, derives a **daily** compounding growth rate from the ratio of
their averages, **clamps that rate to ±5% per day**, and optionally
applies a day-of-week seasonality factor — but only when every weekday has
at least 3 historical occurrences to derive one from reliably. The clamp
is deliberate: a short or noisy window can imply an extreme daily growth
rate, and without a bound that rate compounding forward over a 7/30/90-day
horizon could produce an absurd number. This makes "conservative rather
than dramatic" a structural property of the projection, not a matter of
hoping the input data behaves.

## The five forecast types

All accept a `periodDays` of 7, 30, or 90 (`ForecastPeriodDays`):

- **`getSalesForecast(periodDays)`** — projected total sales from
  historical completed sales, considering trend and day-of-week
  seasonality when enough data exists.
- **`getExpenseForecast(periodDays)`** — separates a **recurring
  monthly estimate** from a **variable monthly estimate**, each clearly
  labeled as an assumption rather than a single blended number.
- **`getCashForecast(periodDays)`** — `openingCash` (always the real,
  live cash balance — never itself an estimate) plus
  `expectedSalesReceipts`, `expectedCustomerPayments`,
  `expectedSupplierPayments`, `expectedExpenses`, and known obligations,
  combining to a `projectedCash` figure. Every *component* feeding into
  that total is itself an estimate — an uncertain future transaction is
  never counted as guaranteed cash.
- **`getInventoryDemandForecast(lookbackDays, minSalesForEstimate)`** —
  only for products/categories with at least `minSalesForEstimate`
  historical sales (default 5) in the lookback window; reports average
  sales rate, current stock, estimated days-of-stock remaining, and a
  plain **boolean** `suggestedReplenishment` flag. This is a
  recommendation surface only — **no purchase order is ever
  automatically created**, and for unique, one-of-a-kind jewelry pieces
  (where "reorder the same SKU" often doesn't even make sense) the flag
  is deliberately just a signal, not an action.
- **`getCustomerPurchaseForecast(periodDays)`** — a forecast order-count
  and expected-spend estimate from historical purchase frequency.

## What a caller can rely on

Every forecast type's return object includes `label: "ESTIMATE"` (a
literal TypeScript const, not a formatted string that could drift) and a
human-readable `basis` string. When `confidence` is `INSUFFICIENT_DATA`,
every headline numeric field on that forecast is `null` — a caller can
check `=== null` rather than parsing text to decide whether to show a
number.

## Audit log

Every forecast view is expected to be audited (`FORECAST_VIEWED`/
`FORECAST_GENERATED` `AuditAction` values exist for this) so an owner can
later see which forecasts were consulted before a decision was made — see
`BUSINESS-INTELLIGENCE.md` "Audit log."
