export type CandleColor = "bullish" | "bearish";

/** A single candle's geometry in pixel space. y grows downward, so a
 * numerically smaller y is a higher price. */
export interface PixelCandle {
  index: number;
  xStart: number;
  xEnd: number;
  xCenter: number;
  color: CandleColor;
  /** topmost colored pixel row (highest price) */
  highY: number;
  /** bottommost colored pixel row (lowest price) */
  lowY: number;
  /** top of the candle body */
  bodyTopY: number;
  /** bottom of the candle body */
  bodyBottomY: number;
  /** open price expressed as a y pixel */
  openY: number;
  /** close price expressed as a y pixel */
  closeY: number;
}

export type PatternDirection = "bullish" | "bearish" | "neutral";

export interface DetectedPattern {
  name: string;
  direction: PatternDirection;
  /** 0-100, how strongly this instance matches the textbook pattern shape */
  strength: number;
  /** index into the candle series of the pattern's final (most recent) candle */
  atIndex: number;
  description: string;
}

export interface SRLevel {
  /** price proxy expressed as a y pixel */
  priceY: number;
  isResistance: boolean;
  touches: number;
  /** 0-100 */
  score: number;
  firstIndex: number;
  lastIndex: number;
}

export interface LevelContext {
  levels: SRLevel[];
  nearestSupport: SRLevel | null;
  nearestResistance: SRLevel | null;
  /** distance from last close to nearest level, as % of recent price range */
  distanceToSupportPct: number | null;
  distanceToResistancePct: number | null;
}

export interface TrendContext {
  shortSma: number;
  longSma: number;
  slopeDirection: PatternDirection;
  streak: { color: CandleColor; length: number };
  bodyMomentum: "expanding" | "contracting" | "flat";
}

export type SignalDirection = "CALL" | "PUT" | "WAIT";

export interface SignalFactor {
  label: string;
  direction: PatternDirection;
  /** points contributed toward the final confidence, can be negative */
  weight: number;
  detail: string;
}

export interface ProjectedCandle extends PixelCandle {
  /** why this projected candle looks the way it does */
  note: string;
}

export interface AnalysisResult {
  candleCount: number;
  candles: PixelCandle[];
  imageWidth: number;
  imageHeight: number;
  patterns: DetectedPattern[];
  levels: LevelContext;
  trend: TrendContext;
  factors: SignalFactor[];
  signal: SignalDirection;
  confidence: number;
  /** Illustrative 2-candle sketch of where the signal + trend + nearest
   * level would point next. This is the same read as `signal`/`confidence`
   * drawn forward, not a separate or more certain prediction — it is not
   * a guarantee of what the market will do. */
  projection: ProjectedCandle[];
  narrative?: string;
  narrativeError?: string;
  warnings: string[];
}
