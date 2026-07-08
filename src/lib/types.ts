export type Pair =
  // Majors
  | "EUR/USD OTC"
  | "GBP/USD OTC"
  | "USD/JPY OTC"
  | "USD/CHF OTC"
  | "USD/CAD OTC"
  | "AUD/USD OTC"
  | "NZD/USD OTC"
  // Crosses
  | "EUR/JPY OTC"
  | "GBP/JPY OTC"
  | "EUR/GBP OTC"
  | "EUR/CHF OTC"
  | "EUR/AUD OTC"
  | "EUR/CAD OTC"
  | "EUR/NZD OTC"
  | "GBP/AUD OTC"
  | "GBP/CAD OTC"
  | "GBP/CHF OTC"
  | "GBP/NZD OTC"
  | "AUD/CAD OTC"
  | "AUD/CHF OTC"
  | "AUD/JPY OTC"
  | "AUD/NZD OTC"
  | "CAD/CHF OTC"
  | "CAD/JPY OTC"
  | "CHF/JPY OTC"
  | "NZD/CAD OTC"
  | "NZD/CHF OTC"
  | "NZD/JPY OTC"
  // Popular exotics
  | "USD/INR OTC"
  | "USD/BRL OTC"
  | "USD/MXN OTC"
  | "USD/ZAR OTC"
  | "USD/TRY OTC"
  | "USD/PHP OTC"
  | "USD/EGP OTC"
  | "USD/PKR OTC"
  | "USD/BDT OTC"
  | "USD/NGN OTC"
  | "USD/COP OTC"
  | "USD/DZD OTC"
  // Metals
  | "XAU/USD OTC"
  | "XAG/USD OTC";

export interface PairGroup {
  label: string;
  pairs: Pair[];
}

export const PAIR_GROUPS: PairGroup[] = [
  {
    label: "Majors",
    pairs: [
      "EUR/USD OTC",
      "GBP/USD OTC",
      "USD/JPY OTC",
      "USD/CHF OTC",
      "USD/CAD OTC",
      "AUD/USD OTC",
      "NZD/USD OTC",
    ],
  },
  {
    label: "Crosses",
    pairs: [
      "EUR/JPY OTC",
      "GBP/JPY OTC",
      "EUR/GBP OTC",
      "EUR/CHF OTC",
      "EUR/AUD OTC",
      "EUR/CAD OTC",
      "EUR/NZD OTC",
      "GBP/AUD OTC",
      "GBP/CAD OTC",
      "GBP/CHF OTC",
      "GBP/NZD OTC",
      "AUD/CAD OTC",
      "AUD/CHF OTC",
      "AUD/JPY OTC",
      "AUD/NZD OTC",
      "CAD/CHF OTC",
      "CAD/JPY OTC",
      "CHF/JPY OTC",
      "NZD/CAD OTC",
      "NZD/CHF OTC",
      "NZD/JPY OTC",
    ],
  },
  {
    label: "Exotics",
    pairs: [
      "USD/INR OTC",
      "USD/BRL OTC",
      "USD/MXN OTC",
      "USD/ZAR OTC",
      "USD/TRY OTC",
      "USD/PHP OTC",
      "USD/EGP OTC",
      "USD/PKR OTC",
      "USD/BDT OTC",
      "USD/NGN OTC",
      "USD/COP OTC",
      "USD/DZD OTC",
    ],
  },
  {
    label: "Metals",
    pairs: ["XAU/USD OTC", "XAG/USD OTC"],
  },
];

export const PAIRS: Pair[] = PAIR_GROUPS.flatMap((g) => g.pairs);

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
