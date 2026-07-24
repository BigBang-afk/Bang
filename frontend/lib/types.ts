export type SignalDirection = "long" | "short";
export type SignalStatus = "active" | "invalidated" | "tp_hit" | "sl_hit" | "expired";
export type TradingMode = "scalping" | "intraday";

export interface Signal {
  id: string;
  symbol: string;
  direction: SignalDirection;
  status: SignalStatus;
  trading_mode: TradingMode;
  timeframe: string;
  entry_price: number;
  stop_loss: number;
  take_profit_1: number;
  take_profit_2: number;
  take_profit_3: number;
  invalidation_level: number;
  risk_reward_ratio: number;
  confidence_score: number;
  score_breakdown: Record<string, number>;
  reasons: string[];
  market_structure_summary: string;
  expected_scenario: string;
  estimated_holding_time: string;
  higher_timeframe_confirmed: boolean;
  created_at: string;
  expires_at: string | null;
}

export interface Trade {
  id: string;
  symbol: string;
  side: "long" | "short";
  status: "open" | "closed" | "cancelled";
  entry_price: number;
  exit_price: number | null;
  stop_loss: number | null;
  take_profit_1: number | null;
  take_profit_2: number | null;
  take_profit_3: number | null;
  quantity: number;
  leverage: number;
  risk_percent: number;
  risk_reward_ratio: number | null;
  pnl: number | null;
  pnl_percent: number | null;
  trading_mode: string;
  timeframe: string;
  screenshot_url: string | null;
  mistakes: string | null;
  notes: string | null;
  reasons: string | null;
  opened_at: string;
  closed_at: string | null;
}

export interface User {
  id: string;
  email: string;
  full_name: string | null;
  role: "admin" | "trader" | "viewer";
  is_active: boolean;
  is_verified: boolean;
  totp_enabled: boolean;
  subscription_tier: string;
  subscription_expires_at: string | null;
  created_at: string;
}

export interface PerformanceSummary {
  total_trades: number;
  win_rate: number;
  profit_factor: number;
  expectancy: number;
  sharpe_ratio: number;
  average_win: number;
  average_loss: number;
  max_drawdown_pct: number;
  best_pairs: { symbol: string; pnl: number }[];
  best_hours: { hour: number; pnl: number }[];
}

export interface RiskProfileConfig {
  account_size: number;
  risk_per_trade_pct: number;
  max_daily_loss_pct: number;
  max_weekly_loss_pct: number;
  max_drawdown_pct: number;
  max_simultaneous_trades: number;
  trading_mode: TradingMode;
}
