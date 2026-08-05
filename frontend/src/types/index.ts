export interface TickerEntry {
  symbol: string;
  price: number;
  change_percent: number;
  volume: number;
  quote_volume: number;
  high_24h: number;
  low_24h: number;
  range_percent: number;
  opportunity_score: number;
}

export interface OpportunityEntry extends TickerEntry {
  atr: number | null;
  atr_expanding: boolean;
  volatility_regime: string;
  adx: number | null;
  trend_direction: string;
  rsi: number | null;
  patterns: string[];
  updated_at: string;
}

export interface SignalOut {
  symbol: string;
  timeframe: string;
  direction: "BUY" | "SELL";
  entry_low: number;
  entry_high: number;
  stop_loss: number;
  take_profit_1: number;
  take_profit_2: number;
  take_profit_3: number;
  risk_reward_ratio: number;
  confidence_score: number;
  confidence_breakdown: Record<string, number>;
  reasons: string[];
  expected_holding_minutes: number;
  suggested_leverage_min: number;
  suggested_leverage_max: number;
  suggested_risk_percent: number;
  mtf_confluence: Record<string, unknown>;
  updated_at?: string;
}

export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface ChartSeriesPoint {
  time: number;
  value: number;
}

export interface AnalysisResult {
  price: number;
  trend: { direction: string; price_above_ema200: boolean; ema_stack_aligned: boolean };
  momentum: Record<string, unknown>;
  volatility: Record<string, unknown>;
  volume: Record<string, unknown>;
  supertrend: { value: number | null; direction: string };
  structure: Record<string, unknown>;
  pivots: Record<string, number>;
  patterns: string[];
  ema: Record<string, number>;
}

export type Timeframe = "1m" | "3m" | "5m" | "15m" | "30m" | "1h" | "4h" | "1d" | "1w";

export interface JournalEntryOut {
  id: string;
  symbol: string;
  side: "long" | "short";
  entry_price: number;
  exit_price: number | null;
  quantity: number;
  leverage: number;
  stop_loss: number | null;
  take_profit: number | null;
  opened_at: string;
  closed_at: string | null;
  pnl: number | null;
  pnl_percent: number | null;
  confidence_at_entry: number | null;
  reason: string | null;
  mistakes: string | null;
  lessons: string | null;
  screenshots: string[];
  tags: string[];
}

export interface PerformanceSummary {
  daily_pnl: number;
  weekly_pnl: number;
  monthly_pnl: number;
  overall_win_rate: number | null;
  average_rr: number | null;
  average_hold_minutes: number | null;
  best_pair: { symbol: string; pnl: number } | null;
  worst_pair: { symbol: string; pnl: number } | null;
  best_session: { session: string; pnl: number } | null;
  worst_session: { session: string; pnl: number } | null;
  total_trades: number;
}

export interface BacktestResult {
  symbol: string;
  timeframe: string;
  initial_capital: number;
  final_capital: number;
  total_return_percent: number;
  metrics: {
    win_rate: number | null;
    profit_factor: number | null;
    expectancy: number | null;
    max_drawdown_percent: number | null;
    sharpe_ratio: number | null;
    average_win: number | null;
    average_loss: number | null;
    number_of_trades: number;
  };
  equity_curve: number[];
  trades: Array<Record<string, unknown>>;
  monthly_returns: Array<{ month: string; pnl: number }>;
}
