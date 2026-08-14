-- =============================================================================
-- Lumenex — Phase 1 database schema
-- Normalized PostgreSQL schema for Supabase (Postgres 15+)
--
-- Conventions:
--   - Primary keys are UUIDs (uuid_generate_v4()/gen_random_uuid()).
--   - Every table has created_at; mutable tables also have updated_at,
--     kept current by the shared set_updated_at() trigger.
--   - Money is stored as integer cents to avoid floating point drift.
--   - Row Level Security (RLS) is enabled on every table. Policies are
--     "deny by default" — access is granted explicitly per table below.
--   - No secrets (API keys, tokens) are ever stored in this schema. Payment
--     provider identifiers are opaque references only (see payments/
--     subscriptions), never the secret keys themselves.
-- =============================================================================

create extension if not exists "pgcrypto";

-- -----------------------------------------------------------------------------
-- Shared helpers
-- -----------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- roles
-- Small, explicit catalog of platform roles. Kept as a table (rather than a
-- hard-coded enum) so new roles can be introduced without a migration.
-- -----------------------------------------------------------------------------

create table public.roles (
  id smallint primary key,
  name text not null unique,
  description text not null default ''
);

insert into public.roles (id, name, description) values
  (1, 'user', 'Standard authenticated trader'),
  (2, 'admin', 'Platform administrator with access to the admin dashboard'),
  (3, 'superadmin', 'Full platform control, including admin management');

-- -----------------------------------------------------------------------------
-- profiles
-- One row per auth.users row. Never stores credentials — Supabase Auth owns
-- those. This table only holds application-level profile/role data.
-- -----------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role_id smallint not null default 1 references public.roles (id),
  full_name text,
  display_name text,
  avatar_url text,
  timezone text not null default 'UTC',
  country text,
  onboarded_at timestamptz,
  is_suspended boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index profiles_role_id_idx on public.profiles (role_id);

create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Auto-create a profile row — and a Free-plan subscription — whenever a new
-- auth user is created. References public.plans/public.subscriptions, which
-- are defined later in this file; that's fine, since the lookup happens at
-- execution time (first real signup), not at function-creation time.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  free_plan_id uuid;
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;

  select id into free_plan_id from public.plans where code = 'free' limit 1;

  if free_plan_id is not null then
    insert into public.subscriptions (user_id, plan_id, status, current_period_end)
    values (new.id, free_plan_id, 'active', null)
    on conflict do nothing;
  end if;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- security-definer helper used inside RLS policies to avoid recursive RLS
-- lookups against profiles from within a profiles policy.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    join public.roles r on r.id = p.role_id
    where p.id = auth.uid()
      and r.name in ('admin', 'superadmin')
  );
$$;

create or replace function public.current_role_name()
returns text
language sql
stable
security definer set search_path = public
as $$
  select r.name
  from public.profiles p
  join public.roles r on r.id = p.role_id
  where p.id = auth.uid();
$$;

-- -----------------------------------------------------------------------------
-- plans / plan_features
-- Subscription tiers are data, not constants baked into the app.
-- -----------------------------------------------------------------------------

create table public.plans (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text not null default '',
  price_monthly_cents integer not null default 0,
  price_yearly_cents integer,
  currency text not null default 'usd',
  is_active boolean not null default true,
  is_public boolean not null default true,
  sort_order integer not null default 0,
  trial_days integer not null default 0,
  limits jsonb not null default '{}'::jsonb,
  stripe_product_id text,
  stripe_price_id_monthly text,
  stripe_price_id_yearly text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint plans_price_monthly_nonnegative check (price_monthly_cents >= 0)
);

create trigger set_plans_updated_at
  before update on public.plans
  for each row execute function public.set_updated_at();

create table public.plan_features (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.plans (id) on delete cascade,
  feature_key text not null,
  label text not null,
  is_included boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique (plan_id, feature_key)
);

create index plan_features_plan_id_idx on public.plan_features (plan_id);

-- Seed the four launch plans described in the product spec. Prices are in
-- cents and are the single source of truth for pricing across the app.
insert into public.plans (code, name, description, price_monthly_cents, sort_order, trial_days, limits) values
  ('free', 'Free', 'Get started with the essentials.', 0, 0, 0,
    '{"watchlists": 1, "watchlist_items": 10, "alerts": 3, "ai_analyses_per_day": 3, "journal_entries": 25, "markets": ["crypto"]}'),
  ('starter', 'Starter', 'For traders building a routine.', 1900, 1, 7,
    '{"watchlists": 3, "watchlist_items": 50, "alerts": 15, "ai_analyses_per_day": 15, "journal_entries": 250, "markets": ["crypto", "forex"]}'),
  ('pro', 'Pro', 'Full analytics for active traders.', 4900, 2, 7,
    '{"watchlists": 10, "watchlist_items": 200, "alerts": 50, "ai_analyses_per_day": 50, "journal_entries": null, "markets": ["crypto", "forex", "gold", "indices"]}'),
  ('elite', 'Elite', 'Maximum coverage and priority AI.', 9900, 3, 7,
    '{"watchlists": null, "watchlist_items": null, "alerts": null, "ai_analyses_per_day": 200, "journal_entries": null, "markets": ["crypto", "forex", "gold", "indices"]}');

-- -----------------------------------------------------------------------------
-- subscriptions / payments
-- Written only by trusted server-side code (service role / webhooks) in
-- later phases. Users may only ever read their own rows.
-- -----------------------------------------------------------------------------

create type public.subscription_status as enum (
  'trialing', 'active', 'past_due', 'canceled', 'incomplete', 'expired'
);

create type public.billing_interval as enum ('month', 'year');

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  plan_id uuid not null references public.plans (id),
  status public.subscription_status not null default 'trialing',
  billing_interval public.billing_interval not null default 'month',
  trial_ends_at timestamptz,
  current_period_start timestamptz not null default now(),
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  canceled_at timestamptz,
  payment_provider text,
  payment_provider_customer_id text,
  payment_provider_subscription_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index subscriptions_user_id_idx on public.subscriptions (user_id);
create index subscriptions_status_idx on public.subscriptions (status);
create unique index subscriptions_one_active_per_user_idx
  on public.subscriptions (user_id)
  where status in ('trialing', 'active', 'past_due');

create trigger set_subscriptions_updated_at
  before update on public.subscriptions
  for each row execute function public.set_updated_at();

create type public.payment_status as enum ('pending', 'succeeded', 'failed', 'refunded');

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  subscription_id uuid references public.subscriptions (id) on delete set null,
  amount_cents integer not null,
  currency text not null default 'usd',
  status public.payment_status not null default 'pending',
  payment_provider text not null,
  payment_provider_payment_id text,
  invoice_url text,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  constraint payments_amount_nonnegative check (amount_cents >= 0)
);

create index payments_user_id_idx on public.payments (user_id);
create index payments_subscription_id_idx on public.payments (subscription_id);

-- -----------------------------------------------------------------------------
-- market_assets
-- Deliberately market-agnostic: crypto, forex, gold/metals and indices all
-- live in one table, discriminated by market_type, so no market is
-- hard-coded into the schema or the app.
-- -----------------------------------------------------------------------------

create type public.market_type as enum ('crypto', 'forex', 'metals', 'indices', 'stocks');

create table public.market_assets (
  id uuid primary key default gen_random_uuid(),
  symbol text not null unique,
  display_name text not null,
  market_type public.market_type not null,
  base_currency text,
  quote_currency text,
  exchange text,
  is_active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index market_assets_market_type_idx on public.market_assets (market_type);
create index market_assets_is_active_idx on public.market_assets (is_active);

create trigger set_market_assets_updated_at
  before update on public.market_assets
  for each row execute function public.set_updated_at();

-- Seed a small cross-market set so Phase 1 UI has real rows to read.
insert into public.market_assets (symbol, display_name, market_type, base_currency, quote_currency, exchange) values
  ('BTCUSD', 'Bitcoin / US Dollar', 'crypto', 'BTC', 'USD', 'composite'),
  ('ETHUSD', 'Ethereum / US Dollar', 'crypto', 'ETH', 'USD', 'composite'),
  ('EURUSD', 'Euro / US Dollar', 'forex', 'EUR', 'USD', 'composite'),
  ('GBPUSD', 'British Pound / US Dollar', 'forex', 'GBP', 'USD', 'composite'),
  ('XAUUSD', 'Gold / US Dollar', 'metals', 'XAU', 'USD', 'composite'),
  ('US500', 'S&P 500 Index', 'indices', null, 'USD', 'composite');

-- -----------------------------------------------------------------------------
-- watchlists / watchlist_items
-- -----------------------------------------------------------------------------

create table public.watchlists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index watchlists_user_id_idx on public.watchlists (user_id);

create trigger set_watchlists_updated_at
  before update on public.watchlists
  for each row execute function public.set_updated_at();

create table public.watchlist_items (
  id uuid primary key default gen_random_uuid(),
  watchlist_id uuid not null references public.watchlists (id) on delete cascade,
  asset_id uuid not null references public.market_assets (id) on delete cascade,
  notes text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique (watchlist_id, asset_id)
);

create index watchlist_items_watchlist_id_idx on public.watchlist_items (watchlist_id);
create index watchlist_items_asset_id_idx on public.watchlist_items (asset_id);

-- -----------------------------------------------------------------------------
-- ai_analyses
-- Every AI call (market summary, setup generation, chat, etc.) is logged
-- here, both for the user-facing history and for admin AI-usage monitoring.
-- -----------------------------------------------------------------------------

create type public.ai_analysis_type as enum (
  'market_summary', 'setup_generation', 'risk_assessment', 'chat'
);

create type public.ai_analysis_status as enum ('completed', 'failed');

create table public.ai_analyses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete cascade,
  asset_id uuid references public.market_assets (id) on delete set null,
  analysis_type public.ai_analysis_type not null,
  input_context jsonb not null default '{}'::jsonb,
  output_text text,
  output_json jsonb,
  model text not null,
  tokens_used integer,
  latency_ms integer,
  status public.ai_analysis_status not null default 'completed',
  error_message text,
  created_at timestamptz not null default now()
);

create index ai_analyses_user_id_idx on public.ai_analyses (user_id);
create index ai_analyses_asset_id_idx on public.ai_analyses (asset_id);
create index ai_analyses_created_at_idx on public.ai_analyses (created_at desc);

-- -----------------------------------------------------------------------------
-- trading_setups
-- Structured entry/stop-loss/take-profit setups. Either AI- or user-authored;
-- system-wide AI setups have user_id = null and are readable by any
-- authenticated user, mirroring a shared "signals feed".
-- -----------------------------------------------------------------------------

create type public.setup_direction as enum ('long', 'short');
create type public.setup_source as enum ('ai', 'user', 'admin');
create type public.setup_status as enum ('active', 'triggered', 'expired', 'cancelled');

create table public.trading_setups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete cascade,
  asset_id uuid not null references public.market_assets (id) on delete cascade,
  ai_analysis_id uuid references public.ai_analyses (id) on delete set null,
  source public.setup_source not null default 'user',
  direction public.setup_direction not null,
  timeframe text not null default '1h',
  entry_price numeric(18, 8) not null,
  stop_loss numeric(18, 8) not null,
  take_profit_targets numeric(18, 8)[] not null default '{}',
  risk_reward_ratio numeric(6, 2),
  confidence_score numeric(5, 2),
  status public.setup_status not null default 'active',
  rationale text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  expires_at timestamptz
);

create index trading_setups_user_id_idx on public.trading_setups (user_id);
create index trading_setups_asset_id_idx on public.trading_setups (asset_id);
create index trading_setups_status_idx on public.trading_setups (status);

create trigger set_trading_setups_updated_at
  before update on public.trading_setups
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- trade_journal
-- -----------------------------------------------------------------------------

create type public.trade_status as enum ('open', 'closed', 'cancelled');

create table public.trade_journal (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  asset_id uuid references public.market_assets (id) on delete set null,
  setup_id uuid references public.trading_setups (id) on delete set null,
  direction public.setup_direction not null,
  entry_price numeric(18, 8) not null,
  exit_price numeric(18, 8),
  position_size numeric(18, 8) not null,
  stop_loss numeric(18, 8),
  take_profit numeric(18, 8),
  fees_cents integer not null default 0,
  pnl_cents integer,
  pnl_percent numeric(8, 4),
  status public.trade_status not null default 'open',
  opened_at timestamptz not null default now(),
  closed_at timestamptz,
  notes text,
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index trade_journal_user_id_idx on public.trade_journal (user_id);
create index trade_journal_asset_id_idx on public.trade_journal (asset_id);
create index trade_journal_status_idx on public.trade_journal (status);
create index trade_journal_opened_at_idx on public.trade_journal (opened_at desc);

create trigger set_trade_journal_updated_at
  before update on public.trade_journal
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- alerts
-- -----------------------------------------------------------------------------

create type public.alert_type as enum ('price_above', 'price_below', 'indicator', 'ai_signal');
create type public.alert_status as enum ('active', 'triggered', 'disabled');

create table public.alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  asset_id uuid not null references public.market_assets (id) on delete cascade,
  alert_type public.alert_type not null,
  condition jsonb not null default '{}'::jsonb,
  status public.alert_status not null default 'active',
  notify_via text[] not null default '{in_app}',
  triggered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index alerts_user_id_idx on public.alerts (user_id);
create index alerts_asset_id_idx on public.alerts (asset_id);
create index alerts_status_idx on public.alerts (status);

create trigger set_alerts_updated_at
  before update on public.alerts
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- usage_tracking
-- Append-only event log used to enforce plan limits and power admin usage
-- statistics. Aggregate with SQL rather than maintaining running counters.
-- -----------------------------------------------------------------------------

create type public.usage_type as enum (
  'ai_analysis', 'scanner_run', 'alert_created', 'api_call'
);

create table public.usage_tracking (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  usage_type public.usage_type not null,
  quantity integer not null default 1,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index usage_tracking_user_id_idx on public.usage_tracking (user_id);
create index usage_tracking_type_created_idx on public.usage_tracking (usage_type, created_at desc);

-- -----------------------------------------------------------------------------
-- audit_logs
-- Append-only. Sensitive actions (role changes, admin access, plan edits,
-- subscription overrides) must write here from server-side code.
-- -----------------------------------------------------------------------------

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles (id) on delete set null,
  actor_role text,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamptz not null default now()
);

create index audit_logs_actor_id_idx on public.audit_logs (actor_id);
create index audit_logs_entity_idx on public.audit_logs (entity_type, entity_id);
create index audit_logs_created_at_idx on public.audit_logs (created_at desc);

-- =============================================================================
-- Row Level Security
-- =============================================================================

alter table public.roles enable row level security;
alter table public.profiles enable row level security;
alter table public.plans enable row level security;
alter table public.plan_features enable row level security;
alter table public.subscriptions enable row level security;
alter table public.payments enable row level security;
alter table public.market_assets enable row level security;
alter table public.watchlists enable row level security;
alter table public.watchlist_items enable row level security;
alter table public.ai_analyses enable row level security;
alter table public.trading_setups enable row level security;
alter table public.trade_journal enable row level security;
alter table public.alerts enable row level security;
alter table public.usage_tracking enable row level security;
alter table public.audit_logs enable row level security;

-- roles: public read-only reference data.
create policy "roles are readable by everyone"
  on public.roles for select
  using (true);

-- profiles: users manage their own row; admins can read/update all rows.
create policy "profiles are self-readable"
  on public.profiles for select
  using (auth.uid() = id or public.is_admin());

create policy "profiles are self-updatable"
  on public.profiles for update
  using (auth.uid() = id or public.is_admin())
  with check (auth.uid() = id or public.is_admin());

-- plans / plan_features / market_assets: public catalog data, readable by
-- anyone (including signed-out visitors on the pricing page); writes are
-- restricted to the service role (admin API), which bypasses RLS.
create policy "active plans are publicly readable"
  on public.plans for select
  using (is_active = true or public.is_admin());

create policy "plan features are publicly readable"
  on public.plan_features for select
  using (
    exists (
      select 1 from public.plans p
      where p.id = plan_features.plan_id and (p.is_active or public.is_admin())
    )
  );

create policy "market assets are publicly readable"
  on public.market_assets for select
  using (is_active = true or public.is_admin());

-- subscriptions / payments: strictly owner-or-admin read. All writes happen
-- server-side (service role) once payment integration lands in a later
-- phase, so no insert/update/delete policies are granted here.
create policy "users read their own subscriptions"
  on public.subscriptions for select
  using (auth.uid() = user_id or public.is_admin());

create policy "users read their own payments"
  on public.payments for select
  using (auth.uid() = user_id or public.is_admin());

-- watchlists: full CRUD for the owner only.
create policy "users manage their own watchlists"
  on public.watchlists for all
  using (auth.uid() = user_id or public.is_admin())
  with check (auth.uid() = user_id);

create policy "users manage their own watchlist items"
  on public.watchlist_items for all
  using (
    exists (
      select 1 from public.watchlists w
      where w.id = watchlist_items.watchlist_id
        and (w.user_id = auth.uid() or public.is_admin())
    )
  )
  with check (
    exists (
      select 1 from public.watchlists w
      where w.id = watchlist_items.watchlist_id and w.user_id = auth.uid()
    )
  );

-- ai_analyses: owner-only read; inserts happen via server-side code using
-- the caller's session (user_id must match auth.uid()).
create policy "users read their own ai analyses"
  on public.ai_analyses for select
  using (auth.uid() = user_id or public.is_admin());

create policy "users create their own ai analyses"
  on public.ai_analyses for insert
  with check (auth.uid() = user_id);

-- trading_setups: system/AI setups (user_id is null) are visible to any
-- authenticated user; personal setups are owner-only.
create policy "setups are readable by owner or shared"
  on public.trading_setups for select
  using (user_id is null or auth.uid() = user_id or public.is_admin());

create policy "users manage their own setups"
  on public.trading_setups for insert
  with check (auth.uid() = user_id);

create policy "users update their own setups"
  on public.trading_setups for update
  using (auth.uid() = user_id or public.is_admin())
  with check (auth.uid() = user_id or public.is_admin());

create policy "users delete their own setups"
  on public.trading_setups for delete
  using (auth.uid() = user_id or public.is_admin());

-- trade_journal: fully private to the owner.
create policy "users manage their own journal entries"
  on public.trade_journal for all
  using (auth.uid() = user_id or public.is_admin())
  with check (auth.uid() = user_id);

-- alerts: fully private to the owner.
create policy "users manage their own alerts"
  on public.alerts for all
  using (auth.uid() = user_id or public.is_admin())
  with check (auth.uid() = user_id);

-- usage_tracking: owner-readable, admin-readable; inserts are made with the
-- caller's own user_id (server-side code always acts on behalf of a user).
create policy "users read their own usage"
  on public.usage_tracking for select
  using (auth.uid() = user_id or public.is_admin());

create policy "users record their own usage"
  on public.usage_tracking for insert
  with check (auth.uid() = user_id);

-- audit_logs: admin-only visibility. Inserts are expected to come from the
-- service role (server actions/route handlers), which bypasses RLS entirely.
create policy "admins read audit logs"
  on public.audit_logs for select
  using (public.is_admin());
