export type Pair =
  | "EUR/USD OTC"
  | "GBP/USD OTC"
  | "USD/JPY OTC"
  | "EUR/JPY OTC"
  | "GBP/JPY OTC"
  | "AUD/CAD OTC"
  | "USD/CAD OTC"
  | "NZD/USD OTC";

export const PAIRS: Pair[] = [
  "EUR/USD OTC",
  "GBP/USD OTC",
  "USD/JPY OTC",
  "EUR/JPY OTC",
  "GBP/JPY OTC",
  "AUD/CAD OTC",
  "USD/CAD OTC",
  "NZD/USD OTC",
];

export type ExpiryKey = "15s" | "1m";

export const EXPIRIES: { key: ExpiryKey; label: string; seconds: number }[] = [
  { key: "15s", label: "15 Seconds", seconds: 15 },
  { key: "1m", label: "1 Minute", seconds: 60 },
];

export type Direction = "CALL" | "PUT";

export type SignalStrength = "Strong" | "Good" | "Normal" | "Risky";

export type RiskLevel = "Low" | "Medium" | "High";

export interface Candle {
  time: number; // unix seconds
  open: number;
  high: number;
  low: number;
  close: number;
}

export interface SignalScoreBreakdown {
  trend: number;
  emaAlignment: number;
  rsi: number;
  macd: number;
  candlePressure: number;
  wickRejection: number;
  supportResistance: number;
  volatilityQuality: number;
}

export interface GeneratedSignal {
  pair: Pair;
  expiry: ExpiryKey;
  direction: Direction;
  confidence: number;
  signalStrength: SignalStrength;
  riskLevel: RiskLevel;
  trendDirection: string;
  candlePressure: string;
  reason: string;
  entryTime: number;
  expiryTime: number;
  callScore: number;
  putScore: number;
  breakdownCall: SignalScoreBreakdown;
  breakdownPut: SignalScoreBreakdown;
}
