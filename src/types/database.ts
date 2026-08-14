/**
 * Hand-written mirror of supabase/migrations/0001_init.sql.
 *
 * In a later phase, replace this with generated types:
 *   npx supabase gen types typescript --project-id <id> > src/types/database.ts
 * Keep the shape (Database.public.Tables.<table>.Row/Insert/Update) so the
 * rest of the app doesn't need to change when that happens.
 */

export type UserRole = "user" | "admin" | "superadmin";
export type SubscriptionStatus =
  | "trialing"
  | "active"
  | "past_due"
  | "canceled"
  | "incomplete"
  | "expired";
export type BillingInterval = "month" | "year";
export type PaymentStatus = "pending" | "succeeded" | "failed" | "refunded";
export type MarketType = "crypto" | "forex" | "metals" | "indices" | "stocks";
export type AiAnalysisType =
  | "market_summary"
  | "setup_generation"
  | "risk_assessment"
  | "chat";
export type AiAnalysisStatus = "completed" | "failed";
export type SetupDirection = "long" | "short";
export type SetupSource = "ai" | "user" | "admin";
export type SetupStatus = "active" | "triggered" | "expired" | "cancelled";
export type TradeStatus = "open" | "closed" | "cancelled";
export type AlertType = "price_above" | "price_below" | "indicator" | "ai_signal";
export type AlertStatus = "active" | "triggered" | "disabled";
export type UsageType = "ai_analysis" | "scanner_run" | "alert_created" | "api_call";

export type PlanLimits = {
  watchlists: number | null;
  watchlist_items: number | null;
  alerts: number | null;
  ai_analyses_per_day: number | null;
  scanner_requests_per_day: number | null;
  saved_setups: number | null;
  journal_entries: number | null;
  markets: string[];
}

type Row<T> = T;
type Insert<T, Optional extends keyof T = never> = Omit<T, Optional> &
  Partial<Pick<T, Optional>>;
type Update<T> = Partial<T>;

// Bundles Row/Insert/Update plus the `Relationships: []` field the
// supabase-js/postgrest-js generics require to type `.from(table)` calls
// correctly (without it, inference silently collapses to `never`).
type Tbl<T, Optional extends keyof T = never> = {
  Row: Row<T>;
  Insert: Insert<T, Optional>;
  Update: Update<T>;
  Relationships: [];
};

export type RoleRow = {
  id: number;
  name: string;
  description: string;
}

export type ProfileRow = {
  id: string;
  role_id: number;
  full_name: string | null;
  display_name: string | null;
  avatar_url: string | null;
  timezone: string;
  country: string | null;
  onboarded_at: string | null;
  is_suspended: boolean;
  created_at: string;
  updated_at: string;
}

export type PlanRow = {
  id: string;
  code: string;
  name: string;
  description: string;
  price_monthly_cents: number;
  price_yearly_cents: number | null;
  currency: string;
  is_active: boolean;
  is_public: boolean;
  sort_order: number;
  trial_days: number;
  limits: PlanLimits;
  stripe_product_id: string | null;
  stripe_price_id_monthly: string | null;
  stripe_price_id_yearly: string | null;
  created_at: string;
  updated_at: string;
}

export type PlanFeatureRow = {
  id: string;
  plan_id: string;
  feature_key: string;
  label: string;
  is_included: boolean;
  sort_order: number;
  created_at: string;
}

export type SubscriptionRow = {
  id: string;
  user_id: string;
  plan_id: string;
  status: SubscriptionStatus;
  billing_interval: BillingInterval;
  trial_ends_at: string | null;
  current_period_start: string;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  canceled_at: string | null;
  payment_provider: string | null;
  payment_provider_customer_id: string | null;
  payment_provider_subscription_id: string | null;
  created_at: string;
  updated_at: string;
}

export type PaymentRow = {
  id: string;
  user_id: string;
  subscription_id: string | null;
  amount_cents: number;
  currency: string;
  status: PaymentStatus;
  payment_provider: string;
  payment_provider_payment_id: string | null;
  invoice_url: string | null;
  paid_at: string | null;
  created_at: string;
}

export type MarketAssetRow = {
  id: string;
  symbol: string;
  display_name: string;
  market_type: MarketType;
  base_currency: string | null;
  quote_currency: string | null;
  exchange: string | null;
  is_active: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export type WatchlistRow = {
  id: string;
  user_id: string;
  name: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export type WatchlistItemRow = {
  id: string;
  watchlist_id: string;
  asset_id: string;
  notes: string | null;
  sort_order: number;
  created_at: string;
}

export type AiAnalysisRow = {
  id: string;
  user_id: string | null;
  asset_id: string | null;
  analysis_type: AiAnalysisType;
  timeframe: string | null;
  input_context: Record<string, unknown>;
  output_text: string | null;
  output_json: Record<string, unknown> | null;
  model: string;
  tokens_used: number | null;
  latency_ms: number | null;
  status: AiAnalysisStatus;
  error_message: string | null;
  created_at: string;
}

export type TradingSetupRow = {
  id: string;
  user_id: string | null;
  asset_id: string;
  ai_analysis_id: string | null;
  source: SetupSource;
  direction: SetupDirection;
  timeframe: string;
  entry_price: number;
  stop_loss: number;
  take_profit_targets: number[];
  risk_reward_ratio: number | null;
  confidence_score: number | null;
  status: SetupStatus;
  rationale: string | null;
  created_at: string;
  updated_at: string;
  expires_at: string | null;
}

export type TradeJournalRow = {
  id: string;
  user_id: string;
  asset_id: string | null;
  setup_id: string | null;
  direction: SetupDirection;
  entry_price: number;
  exit_price: number | null;
  position_size: number;
  stop_loss: number | null;
  take_profit: number | null;
  fees_cents: number;
  pnl_cents: number | null;
  pnl_percent: number | null;
  status: TradeStatus;
  opened_at: string;
  closed_at: string | null;
  notes: string | null;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export type AlertRow = {
  id: string;
  user_id: string;
  asset_id: string;
  alert_type: AlertType;
  condition: Record<string, unknown>;
  status: AlertStatus;
  notify_via: string[];
  triggered_at: string | null;
  created_at: string;
  updated_at: string;
}

export type UsageTrackingRow = {
  id: string;
  user_id: string;
  usage_type: UsageType;
  quantity: number;
  metadata: Record<string, unknown>;
  created_at: string;
}

export type AuditLogRow = {
  id: string;
  actor_id: string | null;
  actor_role: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  metadata: Record<string, unknown>;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export type UserSettingsRow = {
  user_id: string;
  email_notifications: boolean;
  marketing_emails: boolean;
  created_at: string;
  updated_at: string;
}

export interface Database {
  public: {
    Tables: {
      roles: Tbl<RoleRow>;
      profiles: Tbl<ProfileRow, "role_id" | "timezone" | "is_suspended" | "created_at" | "updated_at">;
      plans: Tbl<PlanRow>;
      plan_features: Tbl<PlanFeatureRow, "id" | "created_at">;
      subscriptions: Tbl<SubscriptionRow, "id" | "created_at" | "updated_at">;
      payments: Tbl<PaymentRow, "id" | "created_at">;
      market_assets: Tbl<MarketAssetRow, "id" | "created_at" | "updated_at">;
      watchlists: Tbl<WatchlistRow, "id" | "created_at" | "updated_at">;
      watchlist_items: Tbl<WatchlistItemRow, "id" | "created_at" | "notes" | "sort_order">;
      ai_analyses: Tbl<AiAnalysisRow, "id" | "created_at" | "user_id" | "asset_id" | "timeframe" | "output_text" | "output_json" | "tokens_used" | "latency_ms" | "status" | "error_message">;
      trading_setups: Tbl<
        TradingSetupRow,
        | "id"
        | "created_at"
        | "updated_at"
        | "user_id"
        | "ai_analysis_id"
        | "source"
        | "timeframe"
        | "take_profit_targets"
        | "risk_reward_ratio"
        | "confidence_score"
        | "status"
        | "rationale"
        | "expires_at"
      >;
      trade_journal: Tbl<
        TradeJournalRow,
        | "id"
        | "created_at"
        | "updated_at"
        | "asset_id"
        | "setup_id"
        | "exit_price"
        | "stop_loss"
        | "take_profit"
        | "fees_cents"
        | "pnl_cents"
        | "pnl_percent"
        | "status"
        | "opened_at"
        | "closed_at"
        | "notes"
        | "tags"
      >;
      alerts: Tbl<
        AlertRow,
        "id" | "created_at" | "updated_at" | "status" | "notify_via" | "triggered_at"
      >;
      usage_tracking: Tbl<UsageTrackingRow, "id" | "created_at" | "quantity" | "metadata">;
      audit_logs: Tbl<
        AuditLogRow,
        | "id"
        | "created_at"
        | "actor_id"
        | "actor_role"
        | "entity_id"
        | "metadata"
        | "ip_address"
        | "user_agent"
      >;
      user_settings: Tbl<
        UserSettingsRow,
        "email_notifications" | "marketing_emails" | "created_at" | "updated_at"
      >;
    };
    Views: Record<string, never>;
    Functions: {
      is_admin: { Args: Record<string, never>; Returns: boolean };
      current_role_name: { Args: Record<string, never>; Returns: string };
    };
    Enums: {
      subscription_status: SubscriptionStatus;
      billing_interval: BillingInterval;
      payment_status: PaymentStatus;
      market_type: MarketType;
      ai_analysis_type: AiAnalysisType;
      ai_analysis_status: AiAnalysisStatus;
      setup_direction: SetupDirection;
      setup_source: SetupSource;
      setup_status: SetupStatus;
      trade_status: TradeStatus;
      alert_type: AlertType;
      alert_status: AlertStatus;
      usage_type: UsageType;
    };
  };
}
