export interface OhlcBar {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

export interface ConfidenceBucket {
  range: string;
  trades: number;
  wins: number;
  winRatePct: number | null;
}

export interface StrategyStat {
  name: string;
  trades: number;
  wins: number;
  winRatePct: number | null;
}

export interface BacktestResult {
  source: string;
  barsUsed: number;
  tradesTaken: number;
  waits: number;
  flats: number;
  wins: number;
  losses: number;
  winRatePct: number | null;
  buckets: ConfidenceBucket[];
  /** Each named strategy's own standalone accuracy, independent of whether
   * the blended engine signal was CALL/PUT/WAIT — this is what answers
   * "does this specific strategy actually work" directly. */
  namedStrategies: StrategyStat[];
  baseline: {
    label: string;
    winRatePct: number | null;
    trades: number;
  }[];
  expectancyPerTrade: number | null;
  warnings: string[];
}
