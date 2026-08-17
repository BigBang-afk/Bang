# Marketing Analytics & Settings *(Phase 7)*

Campaign performance, attribution-based revenue, and the configurable
settings that govern frequency, rate limits, and retries. For per-campaign
analytics/attribution mechanics, see `CAMPAIGN-SYSTEM.md` "Analytics" /
"Attribution" — this document covers the dashboard-level rollups and the
settings themselves.

## Marketing revenue — attributed vs. assisted, never conflated

`/ai-marketing/analytics` rolls up `getCampaignAttribution()` across
campaigns to show total DIRECT and total ASSISTED attributed order
count/revenue, plus the blended average order value — **always as two
labeled figures, never one summed "marketing revenue" number** that would
overstate what campaigns caused. A purchase that isn't traceable to any
campaign message within the configured attribution window (default 7
days) is not included in either figure — the dashboard never counts an
unrelated purchase toward campaign performance just because the customer
happened to also receive a campaign message at some unrelated time.

## Message safety

Every AI-generated (or human-edited) message template is checked by
`message-safety.service.ts`'s `validateMessageSafety()` before a campaign
can leave `DRAFT` — pure, synchronous, dependency-free rule matching:

| Rule | Blocks |
| --- | --- |
| `fake_scarcity` | "only N left/remaining" |
| `guaranteed_returns` | "guaranteed return/profit/value" |
| `risk_free_investment` | "risk-free", "100% guaranteed", "double your money" |
| `investment_advice` | "best investment", "invest now", "gold price will rise" |
| `pressure_tactics` | "hurry", "act now", "don't miss out", "last chance", "offer ends today" |
| `misleading_certainty` | "guaranteed lowest price", "cheapest in town/Pakistan" |
| `unauthorized_discount` | Any `N%`/discount mention not present verbatim in the campaign's own authorized `offer` field |

A campaign whose template fails any rule cannot reach `PENDING_APPROVAL`
— `submitCampaignForApproval()` throws with the specific violated rule's
message, so the person editing the template knows exactly what to fix.

## Frequency control

`marketing-settings.service.ts` — every limit is a `SystemSetting` row,
read fresh on every call, never hardcoded:

| Setting | Default | Enforced by |
| --- | --- | --- |
| Max messages / customer / day | 1 | `audience-builder.service.ts` frequency gate |
| Max messages / customer / week | 2 | same |
| Minimum gap between any two campaigns touching the same customer | 48 hours | same |
| Provider send rate limit / minute | 20 | `message-queue.service.ts`'s `processMessageQueue()` |
| Provider send rate limit / hour | 200 | same |
| Max retry attempts | 3 | retry/backoff logic — see `WHATSAPP-INTEGRATION.md` |
| Attribution window (days) | 7 | `campaign-analytics.service.ts` |
| RFM lookback period (days) | 365 | `customer-scoring.service.ts` |
| Business Engagement Score weights | equal 25/25/25/25 | `customer-scoring.service.ts` |

All nine are editable from AI Marketing → Settings (`marketing:settings_manage`),
and every save writes a `SETTINGS_CHANGED` audit entry.

## AI cost tracking

`ai-usage.service.ts` records one `AiUsageLog` row per `AiProvider` call
(provider, model, operation, input/output tokens, `estimatedCost`,
triggering user, timestamp). AI Marketing → Settings shows a monthly usage
summary so spend is visible rather than growing silently — see
`AI-ARCHITECTURE.md` "AI cost control."

## Audit log coverage

Every one of the following writes a distinct `AuditLog` row: AI
recommendation generated, AI content generated, campaign created /
approved / launched / paused / cancelled, message queued, customer opted
out, automation enabled / disabled, and every AI assistant query
(allowed or denied) — see `AI-ASSISTANT.md` "How a question is answered"
step 3 for why a denial's audit entry never includes the underlying data.
