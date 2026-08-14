-- =============================================================================
-- Lumenex — Phase 7: trading setups, risk management & journal
--
-- trading_setups and trade_journal (plus their RLS policies and indexes)
-- already exist and are already correctly scoped from 0001_init.sql:
--   - trade_journal is fully private to its owner.
--   - trading_setups is private to its owner, except system/AI setups
--     (user_id is null) which are readable by any authenticated user as a
--     shared "signals feed" — no rows like that exist yet since setup
--     creation wasn't built until this phase, and this phase only ever
--     inserts with source = 'user' (owner-only).
-- This migration only adds the columns this phase's UI needs.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- trading_setups: quality rating, invalidation condition, and the two extra
-- terminal statuses the brief asks for (completed, invalidated) alongside
-- the existing active/triggered/expired. `cancelled` is left in the enum
-- for backward compatibility (Postgres enums can't drop values) but the
-- app no longer writes it — `invalidated` is the equivalent going forward.
-- -----------------------------------------------------------------------------

alter type public.setup_status add value if not exists 'completed';
alter type public.setup_status add value if not exists 'invalidated';

create type public.setup_quality as enum ('poor', 'fair', 'good', 'excellent');

alter table public.trading_setups
  add column if not exists setup_quality public.setup_quality,
  add column if not exists invalidation text;

-- -----------------------------------------------------------------------------
-- trade_journal: risk amount actually taken on the trade (so avg-R and other
-- risk-normalized stats in Phase 7's performance page are computable without
-- guessing), a free-text strategy tag, and a screenshot reference URL.
-- -----------------------------------------------------------------------------

alter table public.trade_journal
  add column if not exists risk_amount_cents integer,
  add column if not exists strategy text,
  add column if not exists screenshot_url text;

create index if not exists trade_journal_user_opened_idx
  on public.trade_journal (user_id, opened_at desc);
