# Campaign System *(Phase 7)*

The `Campaign` entity, the Audience Builder, the message queue, and
attribution — the machinery behind sending a marketing message to a
chosen set of customers, with compliance and human approval built in at
every step. For message content generation, see `AI-MARKETING.md`. For
the provider abstraction the queue sends through, see
`WHATSAPP-INTEGRATION.md`.

## Statuses

```
DRAFT -> PENDING_APPROVAL -> SCHEDULED -> RUNNING -> COMPLETED
                                             |
                                          PAUSED (-> RUNNING)
Any of DRAFT/PENDING_APPROVAL/SCHEDULED/RUNNING/PAUSED -> CANCELLED
```

`campaign.service.ts` enforces every transition explicitly — there is no
generic "update status" function. Each transition function checks the
campaign's current status and throws `InvalidCampaignStatusTransitionError`
on any attempt to skip a step (e.g. approving a `DRAFT` campaign directly,
or launching one that's merely `PENDING_APPROVAL`). The **only** thing
that can shortcut the human `PENDING_APPROVAL` gate is a human-enabled
Automation Rule's `CREATE_CAMPAIGN_DRAFT` action — and even that still
produces an ordinary `DRAFT` campaign requiring the full approve →
schedule → launch pipeline like any other; see `AUTOMATION-RULES.md`.

- `submitCampaignForApproval()` (DRAFT → PENDING_APPROVAL) refuses a
  message template that fails `validateMessageSafety()` — see
  `AI-MARKETING.md` "Message safety."
- `approveCampaign()` (PENDING_APPROVAL → SCHEDULED) records
  `approvedById`/`approvedAt`; gated at the action layer by
  `marketing:campaigns_approve`.
- `launchCampaign()` (SCHEDULED → RUNNING) is the compliance gate: it
  calls `resolveAudience()` and throws `NoEligibleAudienceError` if zero
  customers are eligible — a campaign can never launch to nobody by
  accident. Actually queuing messages is a **separate** call
  (`message-queue.service.ts`'s `queueCampaignMessages()`), so a
  successful launch and a queueing failure are never conflated into one
  all-or-nothing step.
- `pauseCampaign()` / `resumeCampaign()` toggle RUNNING ↔ PAUSED.
- `cancelCampaign()` is available from any non-terminal status and cancels
  every still-`QUEUED`/`PROCESSING` message in the same call.
- `markCampaignCompletedIfFinished()` flips RUNNING → COMPLETED once no
  message remains `QUEUED`/`PROCESSING` — called by the queue processor,
  not by user action.

## Campaign types

`NEW_ARRIVAL`, `VIP`, `INACTIVE_CUSTOMER`, `BIRTHDAY`, `ANNIVERSARY`,
`FESTIVAL`, `SPECIAL_OFFER`, `NEW_COLLECTION`, `GOLD_RATE_UPDATE`,
`FOLLOW_UP`. `GOLD_RATE_UPDATE` is paired with the `INFORMATIONAL`
objective and must never carry an investment/return claim — see
`AI-MARKETING.md` "Gold-rate marketing."

## Campaign Builder — the 10-step wizard

`/ai-marketing/campaigns/new`: Name → Objective → Audience → Product →
Offer → Message → Preview → Approval → Schedule → Launch. The wizard
cannot reach Launch without the compliance/consent gates above being
satisfied — Preview and Approval are not decorative steps, they're where
the audience count and message-safety check are actually shown/enforced
before a human can proceed.

## Audience Builder — the exclusion pipeline

`audience-builder.service.ts`'s `resolveAudience(filters, campaignId?)`
runs each exclusion reason as a **separate bucket**, never double-counting
a customer, so a preview can show exactly: *Audience: 127 → Opted out: 12
→ Blocked: 3 → Invalid number: 2 → Manually excluded: 1 → Recently
contacted: 4 → Eligible: 105.*

**Filters (all AND-combined)** — `AudienceFilters`:

```ts
{
  customerType?: string[];
  vipOnly?: boolean;
  lastPurchaseWithinDays?: number;
  lastPurchaseOlderThanDays?: number;
  minTotalSpending?: number;
  minPurchaseCount?: number;
  categoryIds?: string[];
  purities?: string[];
  city?: string;
  requireOptedIn?: boolean;      // defaults to true
  minEngagementScore?: number;
  customerIds?: string[];        // manual hand-picked list, still AND-ed with every other filter
}
```

`matchesStaticFilters()` checks every filter except engagement score (a
pure, synchronous, unit-testable function); engagement score is checked
in a second pass since it requires an async per-customer score lookup.

**Then, in order, for every filter-matched customer:**

1. **Not opted in** (`marketingConsent !== "OPTED_IN"`) — excluded.
   `UNKNOWN` is not consent; see `WHATSAPP-INTEGRATION.md` "Consent."
2. **Blocked** (`status === "BLOCKED"`) — excluded.
3. **Invalid phone number** (fails `isPlausiblePhoneNumber()`) — excluded.
4. **Manually excluded** for this specific campaign
   (`CampaignAudienceExclusion`) — excluded.
5. **Frequency-limited** — excluded if the customer already received
   ≥`maxPerDay` messages today, ≥`maxPerWeek` this week, or any message
   within the configured minimum campaign gap — see
   `MARKETING-ANALYTICS.md` "Frequency control."

Everyone who survives all five gates is `eligibleCustomerIds` — exactly
who `queueCampaignMessages()` will queue a message for.

## Message queue

`message-queue.service.ts`. One `CampaignMessage` row per recipient,
states `QUEUED → PROCESSING → SENT → DELIVERED/READ`, or
`FAILED`/`OPTED_OUT`/`CANCELLED` at any point.

- **`queueCampaignMessages(campaignId)`** — for each eligible customer,
  personalizes `campaign.messageTemplate` via `substitutePlaceholders()`
  with real data: `customer_name` (the customer's actual name),
  `product_name` (the campaign's linked product, if any), `shop_name`
  (configured shop name), `gold_rate` (today's real rate — see
  `AI-ARCHITECTURE.md` "The gold-rate guarantee"), `offer` (the campaign's
  own offer text), `expiry_date` (the campaign's own `expiryDate`). This
  is the **only** place placeholder substitution happens — templates
  never carry resolved values.
- **`processMessageQueue(limit)`** — rate-limited (see
  `WHATSAPP-INTEGRATION.md` "Rate limiting"), sends each due message
  through `getMarketingProvider().sendMessage()`, and applies retry logic
  (exponential backoff, permanent-failure detection) on failure — see
  `WHATSAPP-INTEGRATION.md` "Retry logic."
- **Webhook ingestion** — `handleWebhook()` events update
  `deliveredAt`/`readAt`/`repliedAt`/`FAILED` on the matching
  `CampaignMessage` (looked up by `providerMessageId`), and a `reply`
  event's text is checked for a STOP keyword before being discarded — see
  `WHATSAPP-INTEGRATION.md`.

Message content itself is not retained indefinitely beyond operational
need — see `AI-MARKETING.md` "Privacy."

## Campaign exclusions (recap)

Opted out, blocked, invalid number, recently contacted (frequency cap),
and manually excluded customers — computed above; there is no separate
"unresolved issue" exclusion category in Phase 7 (that concept exists in
Phase 6's Daily Closing, not here).

## Analytics

`campaign-analytics.service.ts`'s `getCampaignAnalytics(campaignId)`
returns Audience/Queued/Sent/Delivered/Read/Failed/Opted-out/Cancelled/
Replies counts plus Delivery Rate (`(delivered+read)/sentTotal`), Read
Rate (`read/(delivered+read)`), and Reply Rate (`replies/sentTotal`) — all
computed live from that campaign's own `CampaignMessage` rows, never
cached into a stale summary column.

## Attribution — DIRECT vs. ASSISTED

`getCampaignAttribution(campaignId)`, computed live, never stored:

For each message with a `sentAt`, look at the customer's **next completed
sale** within the configured attribution window (`marketing.
attribution_window_days`, default 7 days):

- No sale in the window → not attributed at all.
- A sale exists, and **no other campaign** also messaged that customer
  between the message and the sale → **DIRECT**.
- A sale exists, but another campaign also touched that customer in that
  interval → **ASSISTED**.

DIRECT and ASSISTED order counts and revenue are always reported as two
separate, clearly labeled numbers — **never summed into one "campaign
revenue" figure** that would overstate what the campaign alone caused.
`averageOrderValue` and `conversionRate` (`totalAttributedOrders /
totalMessagesSent`) are derived from the combined total but the
direct/assisted split itself is never lost. See `MARKETING-ANALYTICS.md`
"Marketing revenue" for how this feeds the dashboard.
