# WhatsApp / Marketing Provider Integration *(Phase 7)*

Campaign messages are sent through a provider-agnostic abstraction —
`src/services/marketing/marketing-provider.ts` — never through a
hardcoded vendor SDK. Phase 7 ships exactly one implementation of it,
`MockMarketingProvider`, which sends nothing over the network. This
document covers the abstraction's shape, the mock implementation, consent,
and what a real integration would still need to add.

## Why not real WhatsApp automation now

The spec is explicit, and this build honors it: **no unofficial WhatsApp
automation, no WhatsApp Web scraping, and no automating a personal
WhatsApp account.** Those approaches violate WhatsApp's terms of service
and are unreliable (account bans, no delivery guarantees). The only
acceptable path to real sending is the official WhatsApp Business
Platform API, which requires a Meta Business account, phone number
verification, and template approval — none of which is a code change this
repository can make for you. Phase 7 therefore builds the abstraction and
stops there.

## `MarketingProvider` interface

```ts
interface MarketingProvider {
  readonly providerName: string;
  sendMessage(input: SendMessageInput): Promise<SendResult>;
  sendTemplate(input: SendTemplateInput): Promise<SendResult>;
  getMessageStatus(providerMessageId: string): Promise<MessageStatusResult>;
  handleWebhook(rawBody: string, signatureHeader: string | null): WebhookEvent[];
}
```

- `sendMessage` / `sendTemplate` — `SendResult` reports `SENT` or `FAILED`;
  a `FAILED` result carries an `error` string and a `retryable` boolean so
  the queue processor (`message-queue.service.ts`) can tell a transient
  provider hiccup from a permanent failure (invalid number, opted out)
  without the provider needing to know anything about *our* retry policy.
- `getMessageStatus` — polls a provider for a message's current delivery
  state, for providers that don't push webhooks.
- `handleWebhook` — parses an inbound webhook payload into normalized
  `WebhookEvent`s (`delivered` | `read` | `failed` | `reply`).
  **Implementations must verify the payload's authenticity per the
  provider's own signing scheme before trusting it** — never process an
  unverified request body. Returns `[]` for an unrecognized or
  unauthenticated payload rather than throwing, so one bad event can't
  take the whole webhook endpoint down.

`getMarketingProvider()` is the singleton resolver every campaign/queue
service calls — currently always returns the mock. Swapping in a real
provider later means implementing this interface and changing what this
one function returns; no other file in the codebase needs to change.

## `MockMarketingProvider`

- **Never touches the network.** Deterministic given its input, so tests
  never depend on timing or an external service being reachable.
- **Phone validation gates the fake send**: `/^\+?[0-9]{7,15}$/` against
  the number with spaces/hyphens stripped. A number that doesn't match
  fails immediately with `{ status: "FAILED", error: "INVALID_NUMBER",
  retryable: false }` — mirroring how a real provider rejects a malformed
  number, and letting retry-logic tests exercise the "never retry a
  permanent failure" rule without a live provider.
- A valid number resolves synchronously to `{ status: "SENT",
  providerMessageId: "mock-<uuid>" }`.
- `simulateNextTransientFailure()` is a test-only hook that makes the next
  `sendMessage()` call return a retryable `TEMPORARY_PROVIDER_ERROR`, used
  to exercise the exponential-backoff retry path deterministically.
- **Webhook signature validation**: `handleWebhook()` computes
  `HMAC-SHA256(secret, rawBody)` (secret from
  `MARKETING_MOCK_WEBHOOK_SECRET`, default `"mock-webhook-secret"`) and
  rejects (`[]`) any payload whose `signatureHeader` doesn't match — even
  in mock form, the "never trust an unverified request" requirement is
  real and tested, not merely asserted in a comment.

## Consent — opt-in / opt-out

`Customer.marketingConsent` is one of `OPTED_IN` / `OPTED_OUT` / `UNKNOWN`
(default `UNKNOWN`), with `consentDate`, `consentSource`, and
`optOutDate`. **`UNKNOWN` is deliberately not treated as consent** — only
`OPTED_IN` customers are eligible for any campaign message. This is
enforced in `audience-builder.service.ts`'s `resolveAudience()`, which
buckets every non-opted-in customer into the audience preview's
"Opted out" count rather than silently dropping them — see
`CAMPAIGN-SYSTEM.md` "Audience builder."

`marketing-consent.service.ts` provides `setMarketingConsent()` (staff
recording a customer's stated preference, with an audited
`CUSTOMER_OPTED_OUT` action on an opt-out) and `handleStopKeyword()`,
which checks an inbound reply's text against a STOP/UNSUBSCRIBE keyword
list (case-insensitive, matches common equivalents) and immediately flips
the customer to `OPTED_OUT` — a real opt-out request is honored the
moment it's seen, never batched or delayed.

## Rate limiting

`message-queue.service.ts`'s `processMessageQueue()` computes
`allowedByMinute` / `allowedByHour` by **counting real `CampaignMessage`
rows** with `sentAt` in the last 60 seconds / 3600 seconds — a live count
against the actual send history, not a token-bucket approximation — then
caps the batch it processes to `min(requestedLimit, allowedByMinute,
allowedByHour)` before even querying for due messages. Limits are read
from `marketing-settings.service.ts` (configurable, never hardcoded) —
see `MARKETING-ANALYTICS.md` "Frequency control."

## Retry logic

- `computeBackoffDelayMs(attempt) = min(30 minutes, 1000 * 2^attempt)`,
  stored in `CampaignMessage.nextRetryAt`.
- `processMessageQueue()` only picks up `QUEUED` rows where `nextRetryAt`
  is `null` or already in the past.
- A failure is **permanent** (goes straight to `FAILED`/`OPTED_OUT`,
  never requeued) when the provider reports `retryable: false`, when the
  error is one of `OPTED_OUT` / `INVALID_NUMBER` / `PERMANENT_FAILURE`, or
  when the configured max-retry count is exhausted.
- Every other failure is requeued with the next backoff delay applied.

## Webhook endpoint

Prepared for `delivered` / `read` / `failed` / `reply` events. A `reply`
event's text is checked against the STOP-keyword list for consent
handling and then discarded — **it is never persisted** (see
`AI-MARKETING.md` "Privacy"); only the fact that a reply occurred, and
when, is recorded (`CampaignMessage.repliedAt`) for the campaign's Reply
Rate metric.

## What real integration still requires (not built here)

- A real WhatsApp Business API account, phone number, and Meta app
  credentials.
- Message template submission and approval through Meta.
- Provider API keys/secrets in environment variables — **never** in
  frontend code or committed to the repository.
- A real `MarketingProvider` implementation wired to that account, plus
  its own webhook signature verification per Meta's documented scheme.
- Consent-flow configuration matching the chosen provider's opt-in
  requirements.

None of the above is built in Phase 7 — only the abstraction that a real
integration would plug into.
