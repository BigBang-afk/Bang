export interface Candle {
  /** Unix time in seconds, marks the candle's open time */
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export type Direction = "BULLISH" | "BEARISH";
export type TradeSignal = "CALL" | "PUT";

export interface Prediction {
  /** Unix time in seconds this forecast candle occupies */
  time: number;
  direction: Direction;
  signal: TradeSignal;
  /** 0-100 */
  confidence: number;
  open: number;
  high: number;
  low: number;
  close: number;
  /** which basis points of the composite score drove this call, for transparency */
  score: number;
}

export type FeedStatus = "idle" | "connecting" | "connected" | "reconnecting" | "error";

export interface SymbolInfo {
  symbol: string;
  label: string;
}

export type Interval = "1m" | "5m";

export const INTERVAL_SECONDS: Record<Interval, number> = {
  "1m": 60,
  "5m": 300,
};
