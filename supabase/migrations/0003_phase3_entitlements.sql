-- =============================================================================
-- Lumenex — Phase 3: subscription & entitlement system
--
-- Adds:
--   - two new numeric limits to plans.limits (scanner_requests_per_day,
--     saved_setups), merged into the existing jsonb so 0001's seed rows
--     don't need to be recreated.
--   - plan_features seed rows: qualitative (non-numeric) capabilities the
--     entitlement system's hasFeatureAccess() checks against, distinct
--     from the numeric caps in plans.limits.
--   - a composite index on usage_tracking for the per-user, per-day
--     lookups the entitlement system runs on every gated action.
--
-- No RLS changes: subscriptions/payments already only grant SELECT to
-- their owner (see 0001_init.sql) — there was never a policy letting a
-- user write their own subscription, which is exactly the "users must
-- never modify their own subscription status" requirement. All writes in
-- this phase continue to go through the service-role client from trusted
-- server code (admin overrides, the signup trigger).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Extend plan limits
-- -----------------------------------------------------------------------------

update public.plans set limits = limits || '{"scanner_requests_per_day": 5, "saved_setups": 5}'::jsonb where code = 'free';
update public.plans set limits = limits || '{"scanner_requests_per_day": 25, "saved_setups": 25}'::jsonb where code = 'starter';
update public.plans set limits = limits || '{"scanner_requests_per_day": 100, "saved_setups": 100}'::jsonb where code = 'pro';
update public.plans set limits = limits || '{"scanner_requests_per_day": null, "saved_setups": null}'::jsonb where code = 'elite';

-- -----------------------------------------------------------------------------
-- Qualitative feature flags (beyond numeric limits)
--
-- Only rows for plans that GRANT the feature are inserted (is_included is
-- always true here) — both the pricing/subscription UI and
-- hasFeatureAccess() treat "no row" as "not included", so there's no need
-- to store negative rows.
-- -----------------------------------------------------------------------------

insert into public.plan_features (plan_id, feature_key, label, is_included, sort_order)
select p.id, f.feature_key, f.label, true, f.sort_order
from public.plans p
join (
  values
    ('starter', 'performance_analytics',    'Performance analytics',    10),
    ('pro',     'performance_analytics',    'Performance analytics',    10),
    ('elite',   'performance_analytics',    'Performance analytics',    10),

    ('pro',     'advanced_scanner_filters', 'Advanced scanner filters', 20),
    ('elite',   'advanced_scanner_filters', 'Advanced scanner filters', 20),

    ('pro',     'csv_export',               'CSV export',               30),
    ('elite',   'csv_export',               'CSV export',               30),

    ('elite',   'priority_ai_queue',        'Priority AI queue',        40),

    ('elite',   'api_access',               'API access',               50)
) as f(plan_code, feature_key, label, sort_order)
  on p.code = f.plan_code
on conflict (plan_id, feature_key) do update
  set label = excluded.label,
      is_included = true,
      sort_order = excluded.sort_order;

-- -----------------------------------------------------------------------------
-- Usage lookups: the entitlement system's checkUsageLimit() runs
-- user_id + usage_type + created_at range queries on every gated action.
-- -----------------------------------------------------------------------------

create index if not exists usage_tracking_user_type_created_idx
  on public.usage_tracking (user_id, usage_type, created_at desc);
