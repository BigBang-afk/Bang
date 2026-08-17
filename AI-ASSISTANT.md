# AI Assistant *(Phase 7)*

An internal staff assistant that answers operational questions ("How much
did we sell this month?", "Which customers are inactive?", "Which campaign
performed best?") by routing to a fixed set of server-side tools — never
by handing a free-form question and the whole database to a language
model. See `AI-ARCHITECTURE.md` for the provider abstraction this sits on
top of.

## Why not "just ask an LLM"

Two hard requirements rule that out: (1) a cashier must never be able to
extract owner-level financial data or another customer's private details
just by phrasing a question cleverly, and (2) the system must never send
the entire database, or an unbounded slice of it, to an AI provider. Both
are satisfied by making "what data can this question see" a **routing**
decision enforced by the same RBAC the rest of the app already has, not a
prompt-level instruction a language model could be talked out of.

## How a question is answered

`src/services/ai-assistant.service.ts` → `askAiAssistant(question, user, args)`:

1. **`resolveIntent(question)`** — deterministic, keyword-based regex
   matching (not an LLM call) maps the question text to one `AiToolName`,
   or `null` if nothing matches. Matching is ordered most-specific-first
   (e.g. "gold with karigars" is checked before the generic "gold rate"
   pattern) so an ambiguous question resolves predictably every time.
2. **Permission check** — the matched tool's `permission` (a
   `PermissionKey`, the exact same enum every page/Server Action uses) is
   checked via `userHasPermission(user, permission)` — the identical
   function and the identical permission key the equivalent nav page
   already requires. There is no separate, weaker "AI access" permission
   system.
3. **Audit log** — every query is recorded to `AuditLog` with action
   `AI_ASSISTANT_QUERY`, including the question text, which tool matched
   (or `null`), and whether it was denied. **A denial never includes the
   underlying data in the audit metadata** — only the fact that access was
   denied.
4. **Tool execution** — if allowed, the tool's `run()` function is called.
   Each tool function calls existing, already-tested service functions
   (`getSalesReport`, `getSegmentCounts`, `getInventorySummary`, etc.) —
   Phase 7 introduces no new raw-data access path; it reuses Phase 1-6's
   own service layer.
5. **Answer summarization** — `summarizeAnswer()` turns the tool's return
   value into one or two factual sentences (e.g. "Today's net sales:
   Rs 45,000. This month's net sales so far: Rs 1,230,000."), built from
   real numbers only, never a generated guess.

## Tool registry

| Tool | Permission required | Data source |
| --- | --- | --- |
| `getSalesSummary` | `accounting:reports:view` | Today's + this month's sales report, top 5 products this month |
| `getCustomerSegments` | `customers:view` | Segment counts, up to 20 inactive/VIP customers |
| `getCustomerProfile` | `customers:view` | One customer's profile by ID |
| `getInventoryAvailability` | `inventory:view` | Inventory summary (in-stock counts) |
| `getGoldRates` | `gold_rate:read` | Today's effective gold rates by purity |
| `getGoldPosition` | `gold_ledger:view` | Gold currently held by karigars/suppliers |
| `getCampaignPerformance` | `marketing:view` | Recent campaigns + their analytics |
| `getReceivables` | `accounting:reports:view` | Receivable aging report |
| `getPayables` | `accounting:reports:view` | Payable report |

The spec's own illustrative list of tools ("such as `getSalesSummary()`/
`getCustomerSegments()`/...") is explicitly non-exhaustive ("such as"); the
9th tool, `getGoldPosition`, was added because the spec's own example
question — "How much gold is currently with karigars?" — has no home in
the literal 8-item list otherwise.

A question that matches no tool gets a generic, honest "I can help with
X, Y, Z — try asking about one of those" response — never a fabricated
answer to a question the assistant can't actually route.

## Security model

- **RBAC, not prompt-based safety.** A cashier asking "What's our total
  profit this month?" is checked against `accounting:reports:view` exactly
  as if they'd clicked the Profit & Loss page — if they lack the
  permission, the answer is `ACCESS DENIED`, the same wording used
  elsewhere in the app for a denied action, and the underlying figures are
  never computed or returned.
- **No arbitrary data access.** The assistant cannot query anything
  outside the fixed `TOOLS` registry — there is no "escape hatch" free-form
  query mode. Widening what the assistant can answer means adding a new,
  reviewed tool with its own permission gate, not relaxing an existing one.
- **Every query audited**, allowed or denied, with the question text and
  outcome — see "How a question is answered" step 3.
- **CRITICAL TEST** (see `PHASE-7-STATUS.md` "Tests passed"): a user
  without `accounting:reports:view` asking a receivables/payables question
  receives `ACCESS DENIED` and the tool function is never invoked — verified
  by asserting `data` is `undefined` on a denied response, not just that
  the answer text says "denied."

## UI

`/ai-marketing/assistant` presents a small set of suggested questions
(matching the spec's own examples) plus a free-text input. Every answer
shows the tool that was used (or "no matching tool") so staff can see
*why* they got the answer they did, not just the answer itself.
