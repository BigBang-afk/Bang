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

export interface RiskProfileConfig {
  account_size: number;
  risk_per_trade_pct: number;
  max_daily_loss_pct: number;
  max_weekly_loss_pct: number;
  max_drawdown_pct: number;
  max_simultaneous_trades: number;
  trading_mode: TradingMode;
}
