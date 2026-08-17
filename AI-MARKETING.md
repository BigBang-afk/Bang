# AI Marketing *(Phase 7)*

The product-level overview of Phase 7: segmentation, the AI Marketing
Dashboard, message generation, product marketing/social content, content
approval, gold-rate marketing, follow-ups, privacy, and settings. For the
underlying AI provider design see `AI-ARCHITECTURE.md`; for campaigns see
`CAMPAIGN-SYSTEM.md`; for WhatsApp specifics see
`WHATSAPP-INTEGRATION.md`; for scoring/segmentation internals see
`CUSTOMER-SCORING.md`; for the internal assistant see `AI-ASSISTANT.md`;
for automations see `AUTOMATION-RULES.md`; for analytics/settings see
`MARKETING-ANALYTICS.md`.

## Guiding principle

AI assists staff; it never acts unilaterally. Nothing in Phase 7 sends a
WhatsApp message, publishes social content, changes a price, or issues a
discount without an explicit human step. Every AI output — a
recommendation, a message template, a caption, a follow-up suggestion —
lands in front of a person to review, edit, approve, or discard.

## Navigation

**AI MARKETING** — 11 sub-nav items: AI Dashboard, Campaigns, Customers to
Contact, AI Message Generator, Product Marketing, Customer Insights,
Follow-Ups, Marketing Analytics, Automation Rules, AI Assistant, Settings.

## AI Dashboard

`ai-marketing-dashboard.service.ts` builds every card from real queries —
Customers / VIP / Inactive / Ready-for-Follow-Up / Campaigns Active /
Messages Sent / Delivered / Read / Responses / Conversions — plus:

- **Customers to Contact** — top-ranked entries from `follow-up.service.ts`.
- **High-Value Opportunities** — VIP/high-value segment members.
- **Inactive Customers** — from Phase 4's segmentation.
- **Upcoming Birthdays/Anniversaries** — Phase 4's existing reminder data.
- **Campaign Performance** — recent campaigns' analytics.
- **AI Recommendations / Content Drafts / Pending Approvals** — counts
  reflecting real, currently-pending items, never a placeholder number.

"AI INSIGHTS" sentences are built the same way every other AI-facing
feature is: assembled from real DB aggregates via the facts-only pattern
(see `AI-ARCHITECTURE.md`) — e.g. "3 VIP customers have not purchased in
over 60 days" is only ever shown when that is literally true of the
current data, never a stock phrase shown regardless of the numbers.

## Customer segmentation

Eleven segments — `NEW_CUSTOMER`, `RECENT_BUYER`, `REGULAR`, `VIP`,
`HIGH_VALUE`, `INACTIVE`, `BRIDAL_INTEREST`, `GOLD_BUYER`,
`DIAMOND_BUYER`, `REPEAT_CUSTOMER`, `CREDIT_CUSTOMER` — computed entirely
from purchasing behavior (spending, recency, frequency, product
category/purity purchased). See `CUSTOMER-SCORING.md` "AI
segmentation" for exactly how each is derived and why this composes
Phase 4's segmentation rather than replacing it. **No segment is ever
derived from anything that isn't a recorded business transaction** — no
inference from name, religion, appearance, or any other sensitive
personal attribute.

## Customer scoring — Business Engagement Score & RFM

See `CUSTOMER-SCORING.md` in full. In one sentence: a transparent,
four-factor (Recency/Frequency/Monetary/Engagement), configurable-weight
0-100 score, always labeled `BUSINESS ENGAGEMENT SCORE`, never presented
as a personality or private-characteristic prediction.

## AI Customer Insights — the AI Customer Summary

The individual customer profile (`/customers/[id]`) shows an "AI Customer
Summary" card, built by `ai-customer-insight.service.ts` using **only**
factual data already in the database — purchase history, recency,
spending total, outstanding balance, segment membership. It never invents
a preference, a purchase, an interaction, a family detail, or a financial
circumstance that isn't literally a recorded field.

## Product recommendations

`recommendation.service.ts`'s `getRecommendationsForCustomer()` — see the
function's own docstring for the exact algorithm. In short: matches the
customer's real purchase history (category, purity, price band) against
currently `IN_STOCK`, non-archived inventory only (never sold-out stock
unless explicitly reconfigured), scores each candidate, and attaches an
explicit, non-vague, factual reason (e.g. "Recommended because this
customer previously purchased Rings and the price is within this
customer's usual purchase range."). Returns an empty list — never a
guess — for a customer with no purchase history.

## AI Message Generator

`/ai-marketing/message-generator` and `message-generator.service.ts`.
Inputs: Segment, Product, Objective, Campaign Type, Tone (friendly /
formal / promotional / informational), Language, Offer, Call to Action,
whether an expiry date applies. Output is always a **template** — see
"Message personalization" below — run through message safety validation
before being returned (see `MARKETING-ANALYTICS.md` "Message safety").

**Languages**: English, Urdu, Roman Urdu — passed as a `style.language`
parameter to the AI provider, with the architecture left open for adding
more without a shape change (`MessageLanguage` is a Prisma enum; adding a
value is additive).

## Message personalization — the placeholder set

Exactly six tokens, defined once in `src/lib/message-placeholders.ts`:

```
{{customer_name}} {{product_name}} {{shop_name}} {{gold_rate}} {{offer}} {{expiry_date}}
```

`substitutePlaceholders()` replaces only these — an unrecognized token or
one with no supplied value is left as **literal, visible text**, so a
reviewer notices a template/context mismatch before a campaign launches
rather than silently sending a blank. No placeholder ever carries
sensitive information (no balance, no private note, no ledger detail).

## Message safety, WhatsApp architecture, campaigns

Covered in full in `MARKETING-ANALYTICS.md` "Message safety" and
`WHATSAPP-INTEGRATION.md` / `CAMPAIGN-SYSTEM.md` respectively.

## Consent

`Customer.marketingConsent` (`OPTED_IN`/`OPTED_OUT`/`UNKNOWN`, default
`UNKNOWN`) plus `consentDate`/`consentSource`/`optOutDate`. **Only
`OPTED_IN` customers are ever eligible for a campaign message.** A
STOP/UNSUBSCRIBE reply (or a recognized equivalent) flips the customer to
`OPTED_OUT` immediately. See `WHATSAPP-INTEGRATION.md` "Consent" for the
implementation.

## AI Follow-Up System

`follow-up.service.ts`'s `getCustomersToContact()` ranks candidates by
recency + purchase history (engagement score is a separate, complementary
input used by the Audience Builder — see `CUSTOMER-SCORING.md`), each
with an explicit "Why this customer?" reason sentence built from real
numbers (e.g. "Customer has not purchased in 145 days and previously made
3 purchases."). Turning a recommendation into a `FollowUpTask` is always a
separate, explicit human action — nothing here ever contacts a customer
by itself. See `CAMPAIGN-SYSTEM.md` and `AUTOMATION-RULES.md` for how
this feeds automation.

## Gold-rate marketing

`gold-rate-marketing.service.ts`'s `buildGoldRateNotice()` builds an
informational notice (paired with `CampaignType.GOLD_RATE_UPDATE` and
`CampaignObjective.INFORMATIONAL`) whose rate is read **directly** from
Phase 1's `getEffectiveRatesForDate(getTodayBusinessDate())` — the same
source of truth every other module uses — and always carries a visible
timestamp (`asOf`). The message generator never receives a numeric gold
rate as a fact (see `AI-ARCHITECTURE.md` "The gold-rate guarantee"), so an
AI-generated template can never contain a fabricated rate; the real
number is substituted only at send time.

## Product marketing & social content

`content-generator.service.ts`. `generateProductCaptions()` builds a
Title/Description/CTA/hashtag set per platform (Instagram, Facebook,
TikTok, WhatsApp) from **only** the `InventoryItem`/`Product`'s own
recorded fields — name, category, purity, net weight. It cannot invent a
stone type, diamond quality, certification, or origin, because this
schema doesn't record those fields for a caption to draw from in the
first place — the constraint is structural, not just instructional.

`generateSocialContent()` covers the eight content types (New Arrival,
Product Spotlight, Educational, Gold Knowledge, Jewelry Care, Festival,
Behind The Scenes, Customer Appreciation) across the three social
platforms — no unsupported financial claims (the same
`message-safety`-style discipline applies conceptually, though social
captions are reviewed by a human before publishing rather than
auto-validated the way a campaign template is).

## Content approval

Every `ContentDraft` starts `DRAFT`. Only `APPROVED` content can be marked
`PUBLISHED` (a record-keeping action — Phase 7 never actually publishes to
a social platform itself). `REJECTED` is a terminal state. Approving or
rejecting requires an authorized user; `approvedById`/`approvedAt` record
who made the decision either way (see `content-generator.service.ts`'s
own note on why there's no separate `rejectedById` column). **Nothing is
ever auto-published in Phase 7.**

## Privacy

- Consent tracking and immediate opt-out honoring (above).
- RBAC on every AI Marketing action — see `AI-ASSISTANT.md` "Security
  model" for the pattern; the same `userHasPermission()` gate is used
  throughout AI Marketing's own Server Actions.
- Audit logging on every AI-touching action — see `MARKETING-ANALYTICS.md`
  "Audit log coverage."
- **Minimum necessary data**: AI-facing services build a narrow `facts`
  object containing only what a specific generation task needs (e.g. a
  message generator never receives a customer's outstanding balance) —
  see `AI-ARCHITECTURE.md` "The facts-only AI design."
- No customer data appears in frontend debug logs; all AI-facing logic
  runs server-side (`"server-only"` imports throughout).
- **Message content retention**: an inbound reply's raw text is used only
  to check for a STOP keyword and is never persisted — only the fact and
  timestamp of the reply (`repliedAt`) is kept, for the campaign's Reply
  Rate metric. A sent `CampaignMessage.message` (the personalized text)
  is retained only as long as operationally useful for delivery status
  and analytics — not an indefinite private-message archive by design
  intent, even though Phase 7 does not yet ship an automated purge job
  (see `PHASE-7-STATUS.md` "Known issues").

## Settings

AI Marketing → Settings exposes every configurable number from
`MARKETING-ANALYTICS.md` "Frequency control" (frequency caps, rate
limits, retry count, attribution window, RFM period, engagement score
weights) plus the monthly AI usage summary — nothing in Phase 7 hardcodes
a limit that the spec asked to be configurable.

## What Phase 7 explicitly does not build

Real WhatsApp credentials/API integration, unofficial WhatsApp automation
or WhatsApp Web scraping, automatic social-media publishing,
AI-generated fake product info, AI-generated fake gold rates, AI
financial/trading advice, automatic discounts/refunds/financial
adjustments, customer sensitive profiling, tax filing, payroll, or full
ERP accounting. See `PHASE-7-STATUS.md` "Known issues" for the complete
list.
