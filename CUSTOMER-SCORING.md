# Customer Scoring — RFM & Business Engagement Score *(Phase 7)*

`src/services/customer-scoring.service.ts` computes two related things:
an RFM (Recency/Frequency/Monetary) profile, and a single, transparent,
configurable-weight **BUSINESS ENGAGEMENT SCORE**. Both are built entirely
from real purchasing-behavior data — never from an inferred personal
characteristic.

## Why "Business Engagement Score," explicitly

Every place this score is shown, it is labeled `BUSINESS ENGAGEMENT
SCORE` — never "loyalty," never anything implying a prediction about the
customer as a person. It measures how a customer has behaved
commercially (how recently, how often, how much, how positively they've
responded to marketing) — not who they are.

## RFM analysis

`getRfmProfile(customerId)` looks back over a configurable window
(`marketing.rfm_period_days` setting, default 365 days) at the customer's
completed (non-`RETURNED`) sales and computes:

- **Recency** — days since the most recent purchase in the window (`null`
  if none). Scored 1-5 via `scoreRecency()`: ≤30 days → 5, ≤60 → 4, ≤90 →
  3, ≤180 → 2, otherwise (or no purchase) → 1.
- **Frequency** — count of purchases in the window. Scored 1-5 via
  `scoreFrequency()`: ≥10 → 5, ≥5 → 4, ≥3 → 3, ≥1 → 2, 0 → 1.
- **Monetary** — sum of `grandTotal` across those purchases. Scored 1-5
  via `scoreMonetary()`, relative to the *same* configurable VIP spending
  threshold `CUSTOMER-SEGMENTS.md`'s VIP rule uses (≥ threshold → 5, ≥50%
  → 4, ≥25% → 3, >0 → 2, 0 → 1) — so "high monetary value" means the
  identical thing everywhere in the app, not two different numbers for
  two different features.

Each band is a plain 1-5 integer with a documented, inspectable
threshold — never an opaque model output.

## Business Engagement Score

`getBusinessEngagementScore(customerId)` combines four 0-100 subscores:

| Subscore | Source |
| --- | --- |
| Recency | `recencyScore * 20` (RFM recency band, rescaled to 0-100) |
| Frequency | `frequencyScore * 20` |
| Monetary | `monetaryScore * 20` |
| Engagement | % of the customer's last 50 campaign messages that reached `DELIVERED`/`READ` (neutral 50 if the customer has no campaign history yet — silence isn't evidence of disengagement) |

The four subscores are combined via **configurable weights**
(`marketing.engagement_score_weights` setting, JSON `{recency, frequency,
monetary, engagement}`, default equal 25/25/25/25) into one 0-100 score:

```
score = Σ(subscore × weight) / Σ(weights)
```

Malformed or missing weight configuration falls back to the equal-weight
default rather than throwing — a scoring feature must never break a page
because of a bad settings row.

## Where it's used

- The customer profile's AI-related panels show the score alongside its
  four subscores and the weights that produced it — the whole calculation
  is visible, not just the final number.
- `audience-builder.service.ts`'s `minEngagementScore` filter lets a
  campaign target only customers above a chosen threshold.
- `follow-up.service.ts` uses the score (along with recency and purchase
  history) as one ranking input for "Customers to Contact" — see
  `AI-MARKETING.md` "Follow-up system."

## AI segmentation — composing Phase 4, not duplicating it

`ai-segmentation.service.ts`'s `computeAiSegments()` builds the spec's
11-segment list by **calling Phase 4's existing
`computeCustomerSegments()`** and remapping its 7-segment output
(`REGULAR_CUSTOMER` → `REGULAR`, others pass through unchanged), then
adding four new segments computed from real `SaleItem` data:

| AI segment | Computed from |
| --- | --- |
| `GOLD_BUYER` | Purchased any item whose purity is not `SILVER` |
| `DIAMOND_BUYER` | Purchased an item that carried a diamond charge |
| `BRIDAL_INTEREST` | Purchased a product whose name matches `%bridal%` |
| `REPEAT_CUSTOMER` | 2 or more completed purchases |

All eleven segments (`NEW_CUSTOMER`, `RECENT_BUYER`, `REGULAR`, `VIP`,
`HIGH_VALUE`, `INACTIVE`, `BRIDAL_INTEREST`, `GOLD_BUYER`,
`DIAMOND_BUYER`, `REPEAT_CUSTOMER`, `CREDIT_CUSTOMER`) are computed from
one shared raw-SQL aggregate query, `getCustomerMarketingProfiles()`,
which is also the data source the Audience Builder and follow-up ranking
use — one query, several consumers, never a duplicated or drifting
definition of "what counts as this segment."

A customer can carry multiple segments simultaneously (e.g. `VIP` +
`GOLD_BUYER` + `REPEAT_CUSTOMER`) — segments are a set of true facts about
purchasing behavior, not a mutually-exclusive classification.

## Where the segment constants live

`AI_SEGMENTS` and `AI_SEGMENT_LABELS` are defined in `src/types/marketing.ts`
— a plain module with no `server-only` import — specifically so a
`"use client"` component can import the label list without pulling
`ai-segmentation.service.ts`'s server-only code along with it.
`ai-segmentation.service.ts` re-exports both for backward compatibility.
See `ARCHITECTURE.md` "Server/Client boundary — server-only re-exports."
