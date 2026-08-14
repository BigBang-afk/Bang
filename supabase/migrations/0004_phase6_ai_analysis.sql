-- =============================================================================
-- Lumenex — Phase 6: AI market analysis engine
--
-- Adds a `timeframe` column to ai_analyses so the analyzed timeframe is a
-- queryable/displayable column (not buried in input_context jsonb), which
-- the spec's auditability requirement calls out explicitly alongside
-- user/symbol/input snapshot/output/timestamp/model — all of which
-- ai_analyses already had columns for since Phase 1 (user_id, asset_id,
-- input_context, output_json, model, created_at).
--
-- No RLS changes: the existing "users read their own ai analyses" /
-- "users create their own ai analyses" policies from 0001_init.sql already
-- match this phase's requirement exactly (owner-only read, insert scoped to
-- auth.uid() = user_id).
-- =============================================================================

alter table public.ai_analyses add column if not exists timeframe text;

create index if not exists ai_analyses_asset_timeframe_idx
  on public.ai_analyses (asset_id, timeframe, created_at desc);
