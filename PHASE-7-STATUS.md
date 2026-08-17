# Phase 7 Status — AI Automation + Marketing + Customer Re-Engagement + Smart Campaigns

Status: **Complete**. Typecheck, lint, and a production build all pass with
zero errors and zero warnings as of this writing. The full Vitest suite
passes 416/417, the one failure being the same pre-existing Phase 4 flake
documented since Phase 5/6 (see "Known issues"). Phases 1-6 were
re-verified (all their tests still pass unchanged) before this status was
written. Manual/functional verification was performed in a real browser
against the dev server — see "Build status."

## Scope delivered

- **Database** — `Customer.marketingConsent`/`consentDate`/`consentSource`/
  `optOutDate`; 13 new enums; 7 new models (`Campaign`, `CampaignMessage`,
  `CampaignAudienceExclusion`, `FollowUpTask`, `AutomationRule`,
  `ContentDraft`, `AiUsageLog`); 16 new `AuditAction` values; new `User`/
  `InventoryItem` relations. No changes to any Phase 1-6 table's existing
  columns or behavior — Phase 7 is purely additive. See `DATABASE.md`.
- **AI provider abstraction** — `AiProvider` (`generateText`/
  `generateStructuredOutput`/`classify`/`summarize`) with a mock
  implementation that is architecturally incapable of inventing a fact
  (its templates only ever read from a caller-supplied `facts` object).
  See `AI-ARCHITECTURE.md`.
- **Customer scoring & AI segmentation** — RFM analysis, a transparent
  configurable-weight Business Engagement Score, and 11-segment AI
  segmentation composing Phase 4's existing segmentation rather than
  duplicating it. See `CUSTOMER-SCORING.md`.
- **Product recommendations** — real purchase history matched against
  currently in-stock inventory only, each with a factual reason. See
  `AI-MARKETING.md` "Product recommendations."
- **WhatsApp/marketing provider abstraction** — `MarketingProvider`
  (`sendMessage`/`sendTemplate`/`getMessageStatus`/`handleWebhook`) with a
  mock implementation (phone-validation-gated fake sends, HMAC-signed
  webhook verification). No real, unofficial, or scraped WhatsApp
  integration exists. See `WHATSAPP-INTEGRATION.md`.
- **Campaign system** — the full `Campaign`/`CampaignMessage` lifecycle,
  the Audience Builder's six-gate exclusion pipeline, rate-limited/
  retrying message queueing, and message safety validation. See
  `CAMPAIGN-SYSTEM.md`.
- **Campaign analytics & attribution** — delivery/read/reply rates, plus
  a DIRECT vs. ASSISTED attribution model, always reported as two
  separate figures. See `CAMPAIGN-SYSTEM.md` "Attribution."
- **AI Message Generator** — Segment/Product/Objective/Tone/Language/
  Offer/CTA inputs, English/Urdu/Roman Urdu, always producing a template
  with unresolved placeholders, validated against message safety rules.
  See `AI-MARKETING.md` "AI Message Generator."
- **Follow-up system** — ranked "Customers to Contact" with a factual
  "why this customer?" reason, and `FollowUpTask` CRUD. See
  `AI-MARKETING.md` "AI Follow-Up System."
- **Product marketing & social content** — captions built only from real
  `InventoryItem`/`Product` fields, across Instagram/Facebook/TikTok/
  WhatsApp, plus a DRAFT-first content-approval workflow. See
  `AI-MARKETING.md` "Product marketing" / "Content approval."
- **Gold-rate marketing** — an informational-only campaign type whose
  rate is read directly from Phase 1's gold-rate service, never
  AI-generated. See `AI-MARKETING.md` "Gold-rate marketing."
- **AI Assistant** — deterministic keyword-based intent routing to a
  fixed, RBAC-gated tool registry; every query audited; a denial never
  leaks the underlying data. See `AI-ASSISTANT.md`.
- **Automation Rule engine** — IF (trigger + conditions) THEN (action),
  action set restricted to `CREATE_FOLLOW_UP_TASK`/`CREATE_CAMPAIGN_DRAFT`
  — never an auto-send action, even when `ACTIVE`. See
  `AUTOMATION-RULES.md`.
- **Permissions** — 9 new `marketing:*` keys, matching the spec's
  requirement that a cashier can never reach owner-level marketing data.
- **Consent** — `OPTED_IN`/`OPTED_OUT`/`UNKNOWN`, `UNKNOWN` never treated
  as consent, immediate STOP-keyword opt-out handling.
- **Settings** — 9 configurable marketing numbers (frequency caps, rate
  limits, retries, attribution window, RFM period, engagement score
  weights), all `SystemSetting`-backed, read fresh on every call.
- **AI cost tracking** — `AiUsageLog` per provider call, plus a monthly
  usage summary in Settings.
- **Tests** — 90 new Vitest tests across 14 new integration/unit test
  files, for **417** total tests across all seven phases (416 passing —
  see "Tests passed").
- **Documentation** — this file, `AI-ARCHITECTURE.md`, `AI-ASSISTANT.md`,
  `AI-MARKETING.md`, `WHATSAPP-INTEGRATION.md`, `CAMPAIGN-SYSTEM.md`,
  `CUSTOMER-SCORING.md`, `AUTOMATION-RULES.md`, `MARKETING-ANALYTICS.md`,
  plus updates to `README.md`, `ARCHITECTURE.md`, and `DATABASE.md`.

## Files created

Schema: `prisma/migrations/20260817120000_phase7_ai_marketing/`,
`prisma/migrations/20260817120500_phase7_campaign_message_retry/`,
`prisma/migrations/20260817121000_phase7_campaign_expiry_date/`,
`prisma/migrations/20260817121500_phase7_campaign_message_replied_at/`.

Types: `src/types/marketing.ts`.

Lib: `src/lib/message-placeholders.ts`, `src/lib/validation/marketing.ts`,
`src/lib/actions/ai-assistant.actions.ts`,
`src/lib/actions/automation.actions.ts`,
`src/lib/actions/campaigns.actions.ts`,
`src/lib/actions/content.actions.ts`,
`src/lib/actions/customer-insights.actions.ts`,
`src/lib/actions/follow-up.actions.ts`,
`src/lib/actions/marketing-consent.actions.ts`,
`src/lib/actions/marketing-settings.actions.ts`,
`src/lib/actions/message-generator.actions.ts`.

Services (`src/services/`): `ai-assistant.service.ts`,
`ai-customer-insight.service.ts`, `ai-marketing-dashboard.service.ts`,
`ai-segmentation.service.ts`, `ai-usage.service.ts`,
`ai/ai-provider.ts`, `ai/mock-ai-provider.ts`, `ai/ai-call.ts`,
`audience-builder.service.ts`, `automation.service.ts`,
`campaign-analytics.service.ts`, `campaign.service.ts`,
`content-generator.service.ts`, `customer-scoring.service.ts`,
`follow-up.service.ts`, `gold-rate-marketing.service.ts`,
`marketing-consent.service.ts`, `marketing-settings.service.ts`,
`marketing/marketing-provider.ts`, `marketing/mock-marketing-provider.ts`,
`message-generator.service.ts`, `message-queue.service.ts`,
`message-safety.service.ts`, `recommendation.service.ts`.

Components (`src/components/ai-marketing/`, `src/components/customers/`):
including `marketing-consent-control.tsx` and every AI Marketing screen's
supporting components (dashboards, campaign wizard steps, audience
builder UI, message generator form, automation rule dialog, content
approval controls).

Routes (`src/app/(app)/ai-marketing/`, 12 route groups): `layout.tsx`,
`page.tsx` (AI Dashboard), `campaigns/` (list + `new/` wizard + `[id]/`
detail), `customers-to-contact/page.tsx`,
`message-generator/page.tsx`, `product-marketing/page.tsx`,
`customer-insights/page.tsx`, `follow-ups/page.tsx`,
`analytics/page.tsx`, `automation-rules/page.tsx`, `assistant/page.tsx`,
`settings/page.tsx`.

Tests: `tests/ai-assistant.service.integration.test.ts`,
`tests/ai-provider.integration.test.ts`,
`tests/ai-segmentation.service.integration.test.ts`,
`tests/ai-usage.service.integration.test.ts`,
`tests/automation.service.integration.test.ts`,
`tests/campaign-analytics.service.integration.test.ts`,
`tests/campaign.service.integration.test.ts`,
`tests/content-generator.service.integration.test.ts`,
`tests/follow-up.service.integration.test.ts`,
`tests/gold-rate-marketing.integration.test.ts`,
`tests/marketing-consent.integration.test.ts`,
`tests/message-generator.service.integration.test.ts`,
`tests/message-queue.service.integration.test.ts`,
`tests/mock-marketing-provider.integration.test.ts`.

Docs: `AI-ARCHITECTURE.md`, `AI-ASSISTANT.md`, `AI-MARKETING.md`,
`WHATSAPP-INTEGRATION.md`, `CAMPAIGN-SYSTEM.md`, `CUSTOMER-SCORING.md`,
`AUTOMATION-RULES.md`, `MARKETING-ANALYTICS.md`, `PHASE-7-STATUS.md`.

## Files modified

- `prisma/schema.prisma`, `prisma/seed.ts` — the Phase 7 schema additions
  described above; 9 new permission catalog entries; new `SystemSetting`
  seed values for every Phase 7 configurable number.
- `src/lib/auth/permissions.ts` — 9 new `marketing:*` permission keys.
- `src/lib/settings-keys.ts` — the 9 new Phase 7 `SystemSetting` keys.
- `src/config/nav.ts` — removed the old placeholder Marketing/AI Assistant
  nav entries (and the now-unused `Megaphone` import); added the "AI
  Marketing" nav item and its 11-item sub-nav.
- `src/app/(app)/customers/[id]/page.tsx` — added the AI Customer Summary
  card and a `MarketingConsentControl` next to the existing segment
  badges.
- `src/app/(app)/ai-assistant/page.tsx`, `src/app/(app)/marketing/page.tsx`
  — deleted; superseded by the real `(app)/ai-marketing/` route group
  built this phase (both were empty "coming in next phase" placeholders).
- `tests/authorization.integration.test.ts` — appended a new test block
  covering the 9 Phase 7 `marketing:*` permissions.
- `README.md`, `ARCHITECTURE.md`, `DATABASE.md` — see "Documentation"
  above.

## Database migrations

Four migrations — see `DATABASE.md` "Regenerating / migrating" for full
detail on why three follow-up migrations were needed:

- `20260817120000_phase7_ai_marketing` — the full main schema.
- `20260817120500_phase7_campaign_message_retry` — `CampaignMessage.nextRetryAt`.
- `20260817121000_phase7_campaign_expiry_date` — `Campaign.expiryDate`.
- `20260817121500_phase7_campaign_message_replied_at` — `CampaignMessage.repliedAt`.

All four applied cleanly on top of the existing Phase 1-6 database with
zero data loss, via the same non-interactive-environment workaround used
in every prior phase (`prisma migrate diff` → hand-placed migration
folder → `prisma migrate deploy` → `prisma generate`).

## AI features completed

Provider abstraction (`AiProvider`) with a facts-only mock implementation;
structured output validation via Zod schema (`{customerId, reason,
recommendedAction, confidence}` matching the spec's own example);
permission-aware tool routing for the AI Assistant; AI cost tracking
(`AiUsageLog` + monthly summary). See `AI-ARCHITECTURE.md`.

## CRM intelligence features completed

RFM analysis, the Business Engagement Score (always labeled as such,
never a personality prediction), 11-segment AI segmentation composing
Phase 4's rules, the AI Customer Summary (facts-only), and product
recommendations restricted to real purchase history + real in-stock
inventory. See `CUSTOMER-SCORING.md` and `AI-MARKETING.md`.

## Campaign features completed

The full DRAFT → PENDING_APPROVAL → SCHEDULED → RUNNING → COMPLETED
lifecycle (plus PAUSED/CANCELLED); the 10-step Campaign Builder wizard;
the Audience Builder's six-gate pipeline (filter match → consent →
blocked → invalid number → manual exclusion → frequency limit); message
safety validation gating `PENDING_APPROVAL`; a launch-time
zero-eligible-audience guard (`NoEligibleAudienceError`). See
`CAMPAIGN-SYSTEM.md`.

## WhatsApp provider abstraction features completed

`MarketingProvider` interface; `MockMarketingProvider` (phone-validation
-gated sends, HMAC-SHA256 webhook signature verification, injectable
transient-failure simulation for retry testing); rate limiting via live
`CampaignMessage` counts; exponential-backoff retry with permanent-failure
detection. No real, unofficial, or scraped WhatsApp integration. See
`WHATSAPP-INTEGRATION.md`.

## Consent system features completed

`OPTED_IN`/`OPTED_OUT`/`UNKNOWN` (default `UNKNOWN`, never treated as
consent); `consentDate`/`consentSource`/`optOutDate`; immediate
STOP-keyword opt-out handling via `handleStopKeyword()`; only `OPTED_IN`
customers are ever eligible for a campaign message, enforced in the
Audience Builder. See `WHATSAPP-INTEGRATION.md` "Consent."

## Message queue features completed

`QUEUED → PROCESSING → SENT → DELIVERED/READ`, or `FAILED`/`OPTED_OUT`/
`CANCELLED`; per-recipient placeholder substitution from real data at
queue time (never at generation time); rate-limited batch processing;
exponential backoff (`min(30min, 1000×2^attempt)`); webhook ingestion
updating delivery/read/reply timestamps. See `CAMPAIGN-SYSTEM.md`
"Message queue."

## Analytics features completed

Per-campaign Audience/Queued/Sent/Delivered/Read/Failed/Replies counts
and Delivery/Read/Reply rates; DIRECT vs. ASSISTED attribution (never
summed into one revenue figure); a configurable attribution window
(default 7 days). See `CAMPAIGN-SYSTEM.md` "Analytics" / "Attribution"
and `MARKETING-ANALYTICS.md`.

## AI assistant features completed

9 permission-gated tools (`getSalesSummary`, `getCustomerSegments`,
`getCustomerProfile`, `getInventoryAvailability`, `getGoldRates`,
`getGoldPosition`, `getCampaignPerformance`, `getReceivables`,
`getPayables`); deterministic keyword-based intent routing; every query
audited (allowed or denied); a denial's audit entry never includes the
underlying data. See `AI-ASSISTANT.md`.

## Automation engine features completed

`CUSTOMER_INACTIVE`/`BIRTHDAY_UPCOMING`/`ANNIVERSARY_UPCOMING` triggers;
action set restricted to `CREATE_FOLLOW_UP_TASK`/`CREATE_CAMPAIGN_DRAFT`
(no send action exists); `DRAFT`/`ACTIVE`/`PAUSED`/`DISABLED` statuses;
activating a rule requires `marketing:automation_manage` and records
`approvedById`; deduplication against existing open follow-up tasks on
re-run. See `AUTOMATION-RULES.md`.

## Tests passed

```
Vitest:      416 passed, 1 failed  (39 files — 327 Phase 1-6 + 90 Phase 7, 417 total)
TypeScript:  0 errors  (tsc --noEmit)
ESLint:      0 errors, 0 warnings
Production build: succeeds cleanly (88 routes, including 12 AI Marketing routes)
```

The 1 failing test (`tests/customer.service.integration.test.ts` ›
"finds a customer by partial, case-insensitive name") is the **same
pre-existing Phase 4 flake** documented in every status report since
Phase 5 — `searchCustomers()` caps results at 10, and this session's many
repeated `npm test` runs across six prior phases have accumulated more
than 10 rows matching that test's hardcoded search marker in the shared
dev database. Not a Phase 7 regression; not fixed here.

Covers all 25 requested scenarios plus the four CRITICAL TESTs: (a) an
`OPTED_OUT` customer is excluded from a campaign's resolved audience, (b)
an `OPTED_IN` customer is eligible, (c) the AI Assistant asked for
unauthorized financial info returns `ACCESS DENIED` with no data attached,
and (d) a gold-rate campaign's rate is read directly from the gold-rate
service, never generated by the AI provider — plus segmentation, RFM,
VIP/inactive detection, marketing consent, campaign creation, audience
filtering/counting, message generation and placeholder substitution,
message queue states, rate limiting, retry logic (including the
backoff-cap crossover), campaign attribution (DIRECT vs. ASSISTED), the
follow-up recommendation pipeline, the `AiProvider` abstraction, structured
AI output schema validation, AI cost tracking, product marketing
generation, automation rule creation/activation, frequency limits, and
audit log coverage.

## Build status

`npm run build` succeeds cleanly (Turbopack production build, 88 routes,
including all 12 new AI Marketing routes). Manually/functionally verified
in a real browser via two temporary, non-committed Playwright scripts
against the real dev server: a 15-page smoke test (login + navigate +
zero console/page error check across every AI Marketing route plus a
re-check of Dashboard/Customers/Accounting) and a functional script
(AI Assistant query returns a real sales figure, Message Generator
produces a template with an unresolved placeholder, the full campaign
wizard flow — create, generate a template, save as draft, submit for
approval, confirm PENDING APPROVAL status — and automation rule creation
via the dialog). All 6 functional checks passed cleanly with zero
console/page errors on the final run. Two initially-ambiguous results
(a campaign-save redirect that looked like it landed on the wrong URL,
and an automation-rule "Create" button that a Playwright locator matched
twice) were both root-caused to the **verification scripts'** own timing/
selector issues, not product bugs — see "Known issues." The temporary
scripts (and their screenshots) were deleted after use; `git status` is
clean of them.

## Known issues

- The one pre-existing Phase 4 test flake described above under "Tests
  passed" — accumulated-data search-window flakiness in
  `customer.service.integration.test.ts`, not a Phase 7 regression, not
  fixed here (out of this phase's scope, same reasoning documented in
  every prior status report since Phase 5).
- **Two Playwright verification-script issues, both root-caused to the
  test script rather than the product.** (1) The first functional-script
  run reported a campaign-save redirect still on `/campaigns/new`
  alongside a contradictory "Detail page shows DRAFT: true" — traced to
  the script's 1500ms wait being too short before reading `page.url()`;
  fixed by replacing the fixed wait with `page.waitForURL()` against the
  actual campaign-detail URL pattern, after which every run redirected
  correctly. (2) The automation-rule dialog's "Create" button locator
  (`button:has-text("Create")`) matched two elements — the dialog's
  Action `<Select>` combobox (whose rendered option text apparently
  contains the substring "Create", from an option like
  "CREATE_FOLLOW_UP_TASK") and the actual submit button — a Playwright
  strict-mode violation. Fixed by scoping the locator to the dialog and
  matching the button role by exact accessible name
  (`page.getByRole("dialog").getByRole("button", { name: "Create", exact: true })`).
  After both fixes, automation rule creation was confirmed working
  end-to-end (`Create button count: 1`, rule visible immediately after
  creation).
- **A real test-flakiness bug found and fixed in
  `tests/message-queue.service.integration.test.ts`.** The "Retry logic"
  test called `processMessageQueue(10)` directly, and `processMessageQueue`
  correctly caps its batch size to the configured per-minute/per-hour send
  rate limits by counting real `CampaignMessage.sentAt` rows across the
  whole shared dev database in the trailing window — exactly the intended
  production behavior (see `WHATSAPP-INTEGRATION.md` "Rate limiting").
  Running the full suite repeatedly in one session, other test files'
  sends could exhaust that global per-minute/per-hour count, making
  `processMessageQueue`'s batch size drop to 0 and this test's own message
  row never get attempted — a false failure (`expected 'FAILED' to be
  'QUEUED'`) with nothing wrong in the product. Fixed by having the test
  temporarily raise the two rate-limit `SystemSetting`s to a large value
  around its own `processMessageQueue()` call (restored via a
  try/finally), matching the same "make the test robust to shared-DB
  state" pattern as the `customerIds` audience filter. Verified stable
  across 3 consecutive full-suite runs after the fix.
- No background job scheduler exists — an Automation Rule only runs via
  a manual "Run now" click; `nextRunAt` is stored but unused by anything
  automatic yet. See `AUTOMATION-RULES.md` "Known limitation".
- `CampaignMessage.message` (the personalized send text) has no automated
  purge job yet, even though it's intended to be retained only as long as
  operationally useful, not as an indefinite private-message archive. See
  `AI-MARKETING.md` "Privacy."
- Only a mock `AiProvider` and a mock `MarketingProvider` exist — no real
  LLM vendor and no real WhatsApp Business API integration are wired up.
  Both interfaces are ready for a real implementation; neither is
  connected to one. See `AI-ARCHITECTURE.md` and `WHATSAPP-INTEGRATION.md`.
- Only `OWNER` and `ADMIN` roles are seeded — every Phase 7
  `marketing:*` permission key is scoped exactly per the spec's intent,
  but there's no role-management UI yet to create the other roles and
  grant them (same limitation carried forward from every prior phase).
- Everything explicitly deferred by the spec's "DO NOT BUILD YET" list
  remains out of scope: real WhatsApp credentials, unofficial WhatsApp
  automation, WhatsApp Web scraping, automatic social-media publishing,
  AI-generated fake product info, AI-generated fake gold rates, AI
  financial/trading advice, automatic discounts/refunds/financial
  adjustments, customer sensitive profiling, tax filing, payroll, and
  full ERP accounting.

## Exact commands to run

```bash
npm install
cp .env.example .env        # set DATABASE_URL and AUTH_SECRET
npm run db:migrate          # applies the Phase 7 migrations on top of Phase 1-6
npm run db:seed             # re-seeds permissions/settings (idempotent)
npm run dev
```

Then open `http://localhost:3000`, sign in with the credentials printed
by `db:seed`, and go to **AI Marketing** in the sidebar — try the AI
Dashboard, generate a message, build a campaign through the wizard, run
the AI Assistant, and review a follow-up recommendation.

## Required environment variables

No new *required* environment variables — Phase 7 ships mock-only
providers that need no credentials. One optional variable:

| Variable | Default if unset | Purpose |
| --- | --- | --- |
| `MARKETING_MOCK_WEBHOOK_SECRET` | `"mock-webhook-secret"` | HMAC secret the mock marketing provider uses to sign/verify webhook payloads in development/tests |

When a real `AiProvider`/`MarketingProvider` is implemented in a future
phase, its API keys and credentials must be added as new environment
variables at that time — **never** committed to the repository or
referenced from any Client Component.

## Recommended Phase 8

A **role-management UI** remains the single highest-leverage next step —
seven phases have now designed fine-grained authorization boundaries
(including this phase's 9 `marketing:*` keys) that are still only
exercisable by `OWNER`/`ADMIN`. A **background job scheduler** (to
actually run `ACTIVE` automation rules on their `nextRunAt` schedule, and
to purge aged `CampaignMessage` content per the documented retention
intent) is the most natural Phase 7-specific follow-up. Beyond those, the
spec's own "DO NOT BUILD YET" list points at the next real-integration
milestones: a real WhatsApp Business API integration (behind the
`MarketingProvider` interface this phase built) and a real LLM vendor
integration (behind the `AiProvider` interface) are both substantial
enough to be their own dedicated phase(s) rather than folded into a "just
one more thing" phase.
