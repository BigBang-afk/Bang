# AI Architecture *(Phase 7)*

Phase 7 adds an AI-assisted layer on top of Phases 1-6. This document
covers the provider abstraction, the "facts-only" design that makes fact
invention structurally impossible (not just prompt-discouraged), structured
output validation, permission-aware tool access, and cost tracking. For the
marketing-specific product (segments, campaigns, message generation), see
`AI-MARKETING.md`. For the internal assistant, see `AI-ASSISTANT.md`.

## Guiding principle

AI assists humans; it never acts unilaterally. Every AI-generated artifact
(a recommendation, a message template, a social caption, a follow-up
suggestion) is written to a table or returned to a screen for a human to
review, edit, approve, or discard. Nothing Phase 7 builds sends a message,
publishes content, changes a price, or issues a discount by itself.

## `AiProvider` — the abstraction

`src/services/ai/ai-provider.ts` defines the interface every AI-backed
feature in this codebase is built against:

```ts
interface AiProvider {
  generateText(input: { prompt: string; facts: AiFacts }): Promise<string>;
  generateStructuredOutput<T>(input: { prompt: string; facts: AiFacts; schema: ZodType<T> }): Promise<T>;
  classify(input: { text: string; categories: string[]; facts?: AiFacts }): Promise<string>;
  summarize(input: { facts: AiFacts; maxSentences?: number }): Promise<string>;
}
```

`getAiProvider()` is the single seam a real vendor integration (OpenAI,
Anthropic, etc.) would plug into later — every call site in this codebase
goes through it, never a hardcoded SDK call. No feature imports a vendor
SDK directly.

### `MockAiProvider` — the only implementation built in Phase 7

`src/services/ai/mock-ai-provider.ts` is a deterministic, template-based
implementation used in development and by every automated test. It is
**architecturally incapable of inventing a fact**: its template functions
only ever read from the caller-supplied `facts` object — there is no free
-text generation path that could hallucinate a purchase, a preference, a
price, or a family detail. This is a design-level guarantee, not a
prompt-engineering hope: swap in a real LLM-backed provider later and the
"never invent facts" property still has to be re-verified for that
provider, but the mock provider proves the *architecture* (facts in,
template out) supports it.

`generateStructuredOutput()` requires a Zod `schema` and calls
`schema.parse()` on the candidate object, throwing on any malformed shape
— see "Structured output validation" below.

Real provider integration (a real LLM vendor, API keys, rate limits, retry
policy against that vendor) is explicitly **not built** in Phase 7 — the
interface is ready for it, nothing more. API keys, when a real provider is
wired up, must be read from environment variables server-side only —
**never** shipped to or referenced from a Client Component or any code that
runs in the browser.

## The "facts-only" AI design

Every `AiProvider` call that drives user-facing content is preceded by the
calling service assembling a plain `AiFacts` object from real database
rows — never from a prompt template with blanks the model fills in
freely. For example, `message-generator.service.ts` builds:

```ts
type AiFacts = {
  segment?: string;
  productName?: string;
  productCategory?: string;
  productPurity?: string;
  shopName?: string;
  objective?: string;
  tone?: string;
  offer?: string;
};
```

The mock provider's template functions pattern-match on `prompt` (which
selects *which* template to use) and then substitute only from `facts` —
there is no code path where the provider fabricates a field that wasn't in
`facts`. Every AI-facing service in this codebase (message generator,
product marketing/content generator, AI customer summary, AI assistant)
follows the same shape: gather real facts first, generate second.

## Template vs. personalized message — generated once, substituted once

`message-generator.service.ts`'s `generateCampaignMessageTemplate()`
always produces a **template** with literal `{{placeholder}}` tokens
(`{{customer_name}}`, `{{product_name}}`, `{{shop_name}}`,
`{{gold_rate}}`, `{{offer}}`, `{{expiry_date}}`) — even when a specific
product or offer was chosen for the campaign, the product's *name* is
substituted into the facts used to pick a template variant, but the
placeholder tokens themselves are never resolved at generation time.

Actual per-recipient substitution happens exactly once, later, in
`message-queue.service.ts`'s `queueCampaignMessages()`, using each
customer's real name, the campaign's real product, the shop's configured
name, and (for `{{gold_rate}}`) today's real gold rate — see "The
gold-rate guarantee" below. This separation means a campaign's stored
`messageTemplate` is always inspectable/auditable independent of who it
will be sent to.

## The gold-rate "never AI-generated" guarantee

`message-generator.service.ts` **never** passes a numeric gold rate into
`facts`, and no AI-generated template ever contains a literal gold-rate
number — `{{gold_rate}}` stays an unresolved placeholder in every
generated template, always. The real numeric substitution happens only in
`queueCampaignMessages()`, via `getGoldRatePlaceholderValue()`, which
reads directly from Phase 1's `getEffectiveRatesForDate(getTodayBusinessDate())`
— the same gold-rate source of truth every other module in this codebase
uses. This is enforced architecturally (the AI facts object has no field
for it) and covered by a CRITICAL TEST — see "Testing" below.

## Structured AI output validation

Anywhere AI output drives application logic (not just display text), the
caller passes a Zod schema to `generateStructuredOutput()`, and the mock
provider validates the candidate object against it before returning,
throwing on any malformed shape. The follow-up recommendation flow uses
exactly the spec's own example shape:

```ts
const FollowUpRecommendationSchema = z.object({
  customerId: z.string().uuid(),
  reason: z.string().min(1),
  recommendedAction: z.string().min(1),
  confidence: z.number().min(0).max(1),
});
```

No AI-generated text is ever `eval`'d, interpolated into a query, or
otherwise executed as a command — every structured AI output is data,
validated against a schema, that a human reviews before anything happens.

## Permission-aware AI tool routing

The AI Assistant (`ai-assistant.service.ts`) does not send an open-ended
question to a model with database access. It maps a question to one of a
fixed, server-side `TOOLS` registry via deterministic keyword-based intent
resolution, then runs the **exact same** `userHasPermission()` check the
equivalent page/action already enforces for that data. See
`AI-ASSISTANT.md` for the full tool list and the RBAC design.

## AI cost control

Every `AiProvider` call is expected to be tracked in `AiUsageLog`
(provider, model, operation, input/output tokens, `estimatedCost`, the
user who triggered it, timestamp) via `ai-usage.service.ts`. A monthly
usage summary (`getAiUsageSummary()`) is available in AI Marketing →
Settings, so spend stays visible rather than growing silently. The mock
provider records zero-cost usage rows so the tracking pipeline is
exercised even though there is no real vendor bill yet.

## AI cache

Where generation is expensive to repeat (a customer's AI summary, a
product's generated description, a campaign's draft message), the
relevant service may cache the result, but any cache is invalidated when
the underlying source data changes materially (e.g. a new sale for that
customer, a product detail edit) — never served stale against changed
facts. No sensitive customer content is cached insecurely (i.e., never in
a client-readable store).

## What Phase 7 does not build

Per the spec's explicit "DO NOT BUILD YET" list: no real LLM vendor
integration, no AI-generated fake product info, no AI-generated fake gold
rates, no AI financial/trading advice, and no automatic discounts,
refunds, or other financial adjustments driven by AI output. See
`PHASE-7-STATUS.md` "Known issues" for the full list.
