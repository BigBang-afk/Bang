export type AssetType = "forex" | "commodity" | "crypto";

export interface Asset {
  id: string;
  symbol: string;
  display_name: string;
  asset_type: AssetType;
  pip_precision: number;
  is_enabled: boolean;
}

export interface Candle {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  is_complete: boolean;
}

export interface ExpiryAvailability {
  seconds: number;
  enabled: boolean;
  reason: string | null;
}

export interface Strategy {
  id: string;
  strategy_code: string;
  name: string;
  description: string;
  version: number;
  configuration_json: Record<string, unknown>;
  supported_assets_json: string[];
  supported_timeframes_json: string[];
  supported_expiries_json: number[];
  is_enabled: boolean;
}

export type SignalDirection = "CALL" | "PUT" | "NO_TRADE";
export type ConfidenceType = "rule_based" | "ml_calibrated";
export type MarketCondition =
  | "strong_bullish_trend"
  | "weak_bullish_trend"
  | "strong_bearish_trend"
  | "weak_bearish_trend"
  | "range"
  | "volatility_squeeze"
  | "breakout"
  | "high_volatility"
  | "low_volatility"
  | "unclear";

export type SignalStatus =
  | "PENDING_ENTRY"
  | "ENTRY_WINDOW_CLOSED"
  | "ACTIVE"
  | "EXPIRING"
  | "CHECKING_RESULT"
  | "COMPLETED"
  | "DATA_ERROR";

export type SignalResult = "WIN" | "LOSS" | "DRAW" | "DATA_ERROR" | "PENDING";

export interface SignalReason {
  reason_code: string;
  reason_text: string;
  score: number;
}

export interface Signal {
  public_signal_id: string;
  asset_symbol: string;
  strategy_code: string;
  strategy_name: string;
  direction: SignalDirection;
  timeframe: string;
  expiry_seconds: number;
  generated_at: string;
  entry_time: string;
  entry_window_end: string;
  entry_price: number | null;
  expiry_time: string;
  expiry_price: number | null;
  confidence: number;
  confidence_type: ConfidenceType;
  market_condition: MarketCondition;
  status: SignalStatus;
  result: SignalResult;
  strategy_version: number;
  model_version: string | null;
  provider: string;
  data_latency_ms: number;
  ai_auto_mode: boolean;
  supporting_strategies: string[];
  reasons: SignalReason[];
}

export type TimerState =
  | "WAITING_FOR_ENTRY"
  | "ENTER_NOW"
  | "ENTRY_WINDOW_CLOSED"
  | "TRADE_ACTIVE"
  | "EXPIRING"
  | "CHECKING_RESULT"
  | "WIN"
  | "LOSS"
  | "DRAW"
  | "DATA_ERROR";

export interface CountdownSnapshot {
  type: "countdown";
  public_signal_id: string;
  state: TimerState;
  server_time: string;
  generated_at: string;
  entry_time: string;
  entry_window_end: string;
  expiry_time: string;
  remaining_ms: number;
  total_window_ms: number;
  progress_pct: number;
}

export interface SignalStatistics {
  total_completed: number;
  wins: number;
  losses: number;
  draws: number;
  data_errors: number;
  win_rate: number;
  win_rate_excluding_draws: number;
  max_losing_streak: number;
  max_winning_streak: number;
  by_strategy: Record<string, { total: number; wins: number; losses: number; draws: number; win_rate: number }>;
  by_asset: Record<string, { total: number; wins: number; losses: number; draws: number; win_rate: number }>;
  by_expiry: Record<string, { total: number; wins: number; losses: number; draws: number; win_rate: number }>;
}

export interface User {
  id: string;
  full_name: string;
  email: string;
  role: "user" | "admin";
  subscription_plan: "free" | "basic" | "pro" | "elite";
  subscription_expires_at: string | null;
  timezone: string;
  is_active: boolean;
  email_verified: boolean;
  created_at: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}
