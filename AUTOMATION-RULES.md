# Automation Rules *(Phase 7)*

`src/services/automation.service.ts` implements IF (trigger + conditions)
THEN (action) — never IF...THEN (send). An `AutomationRule` can only ever
create a task or a draft campaign for a human; it can never queue or send
a message by itself, even while `ACTIVE`.

## Why the action set is this narrow

The spec's own safety requirement: an automation must not auto-send
unless the user explicitly enables it — and Phase 7 goes further by never
building an auto-*send* action at all. `AutomationAction` has exactly two
members:

| Action | What happens |
| --- | --- |
| `CREATE_FOLLOW_UP_TASK` | Creates ordinary `FollowUpTask` rows (`source: "AUTOMATION"`) for a human to act on |
| `CREATE_CAMPAIGN_DRAFT` | Creates an ordinary `DRAFT` campaign — still requires the full human approve → schedule → launch pipeline in `CAMPAIGN-SYSTEM.md` before a single message goes out |

There is no `SEND_MESSAGE` action, and there never will be one added
casually — adding real auto-send would be a deliberate, separately
reviewed decision, not a natural extension of this enum.

## Triggers

| Trigger | Condition shape | Data source |
| --- | --- | --- |
| `CUSTOMER_INACTIVE` | `{ inactiveDays?: number }` (default 90) | `follow-up.service.ts`'s `getCustomersToContact()`, filtered to `daysSinceLastPurchase >= inactiveDays` |
| `BIRTHDAY_UPCOMING` | `{ daysAhead?: number }` (default 7) | Phase 4's `getUpcomingBirthdays()` — reused, not duplicated |
| `ANNIVERSARY_UPCOMING` | `{ daysAhead?: number }` (default 7) | Phase 4's `getUpcomingAnniversaries()` |

`conditions` is a plain JSON object interpreted by
`automation.service.ts`'s own trigger handlers — **never evaluated as
arbitrary code** (no `eval`, no dynamic function construction).

## Statuses

`DRAFT` (just created, not yet reviewed) → `ACTIVE` (a human explicitly
turned it on — records `approvedById`) → `PAUSED` / `DISABLED`. Only an
`ACTIVE` rule can be run; `runAutomationRule()` throws on any other
status. Toggling to `ACTIVE` writes `AUTOMATION_ENABLED` to the audit log
(`AUTOMATION_DISABLED` for any transition away from it) — see
"Automation Safety" below.

## What running a rule actually does

`runAutomationRule(ruleId, userId)`:

- **`CUSTOMER_INACTIVE` + `CREATE_FOLLOW_UP_TASK`** — for each qualifying
  candidate without an already-open follow-up task, creates one
  (deduplicated against existing `OPEN`/`IN_PROGRESS` tasks for that
  customer, so re-running the rule never piles up duplicates).
- **`CUSTOMER_INACTIVE` + `CREATE_CAMPAIGN_DRAFT`** — creates one `DRAFT`
  campaign (objective `REACTIVATION`, type `INACTIVE_CUSTOMER`) targeting
  everyone past the inactivity threshold, `requireOptedIn: true` baked
  into its own audience filters (even though the audience builder would
  enforce this anyway at launch time — the draft is honest about its own
  intent from the start).
- **`BIRTHDAY_UPCOMING`/`ANNIVERSARY_UPCOMING` + `CREATE_FOLLOW_UP_TASK`**
  — one deduplicated task per upcoming customer, `LOW` priority.
- **`BIRTHDAY_UPCOMING`/`ANNIVERSARY_UPCOMING` + `CREATE_CAMPAIGN_DRAFT`**
  — one `DRAFT` campaign (objective `ENGAGEMENT`, type `BIRTHDAY` or
  `ANNIVERSARY`) with `requireOptedIn: true`.

Every run updates `lastRunAt` and a naive `nextRunAt` (+24h) —
**informational only**, since Phase 7 ships no background job scheduler.
See "Known limitation" below.

## Birthday / anniversary automation

Reuses Phase 4's existing `Customer.dateOfBirth`/`anniversaryDate` and
their `getUpcomingBirthdays()`/`getUpcomingAnniversaries()` functions —
Phase 7 introduces no new date storage. Consent is still enforced exactly
as for any other campaign: an automation-created draft never bypasses the
opted-in requirement at launch.

## Automation Safety — the required fields

Every rule carries `name`, `trigger`, `conditions`, `action`, `status`,
`createdById`, `approvedById` (set when a human activates it), `lastRunAt`,
`nextRunAt` — matching the spec's field list exactly. Activating a rule
requires `marketing:automation_manage`, the same permission as every other
automation action — there is no separate, weaker "just turn it on" path.

## Frequency and exclusion interaction

An automation-created campaign draft is still an ordinary campaign: when
it's eventually launched, it goes through the exact same
`resolveAudience()` pipeline (consent → blocked → invalid number →
manual exclusion → frequency limits) as a manually-built campaign. An
automation rule cannot bypass frequency caps or exclusions by construction
— it only ever produces a `DRAFT`, never a queued message.

## Known limitation

Phase 7 does not ship a background scheduler/cron. "Run now" (a manual
action, gated by `marketing:automation_manage`) is the only way a rule
actually executes in this phase; `nextRunAt` is stored for a future
phase's scheduler to read, but nothing currently reads it to trigger a
run automatically. See `PHASE-7-STATUS.md` "Known issues."
