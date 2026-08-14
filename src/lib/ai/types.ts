import type { MarketType } from "@/types/database";
import type { Timeframe } from "@/lib/market-data/types";
import type { SupportResistanceLevel } from "@/lib/technical-analysis/levels";
import type { IndicatorReadout, Trend, Volatility, VolumeState } from "@/lib/technical-analysis/scoring";

/**
 * The ONLY data the AI is given. Every field here traces back to a real
 * value computed elsewhere in the app (market-data providers, the
 * technical-analysis engine) — nothing on this type is ever invented to
 * fill a gap. If a value genuinely isn't available (e.g. a provider gives
 * no volume), it's `null` here too, and the prompt tells the model to treat
 * `null` as "not available" rather than guessing.
 */
export interface AnalysisInputSnapshot {
  symbol: string;
  displayName: string;
  marketType: MarketType;
  timeframe: Timeframe;
  /** ISO timestamp of the last CLOSED candle this snapshot is based on. */
  asOfCandleTime: string;
  /** Close of the last closed candle — see analyze.ts for why the live ticker price is kept separate. */
  price: number;
  change24hPercent: number | null;
  marketStatus: "open" | "closed" | "unknown";
  /** Bounded to the most recent closed candles — see MAX_CANDLES_IN_SNAPSHOT. */
  recentCandles: Array<{
    time: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number | null;
  }>;
  indicators: IndicatorReadout;
  trend: Trend;
  momentum: Trend;
  volatility: Volatility;
  volumeState: VolumeState;
  /** 0-100 transparent technical score from the Phase 5 scanner engine. */
  technicalScore: number;
  setupType: string | null;
  supportingConditions: string[];
  conflictingConditions: string[];
  supportResistanceLevels: SupportResistanceLevel[];
}
