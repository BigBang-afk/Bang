import { Candle } from "./candles";
import {
  BollingerResult,
  MacdResult,
  atr,
  bollinger,
  ema,
  findAllPivots,
  macd as macdCalc,
  rsi as rsiCalc,
  sma,
  visiblePivots,
} from "./indicators";

export type Vote = 1 | 0 | -1;

export interface StrategyVote {
  key: string;
  name: string;
  vote: Vote;
  weight: number;
  note: string;
}

export interface Indicators {
  ema20: number[];
  ema50: number[];
  ema200: number[];
  rsi14: number[];
  macd: MacdResult;
  bb: BollingerResult;
  atr14: number[];
  volumeSma20: number[];
  pivots: ReturnType<typeof findAllPivots>;
}

export function computeIndicators(candles: Candle[]): Indicators {
  const closes = candles.map((c) => c.close);
  const highs = candles.map((c) => c.high);
  const lows = candles.map((c) => c.low);
  const volumes = candles.map((c) => c.volume);

  return {
    ema20: ema(closes, 20),
    ema50: ema(closes, 50),
    ema200: ema(closes, 200),
    rsi14: rsiCalc(closes, 14),
    macd: macdCalc(closes, 12, 26, 9),
    bb: bollinger(closes, 20, 2),
    atr14: atr(highs, lows, closes, 14),
    volumeSma20: sma(volumes, 20),
    pivots: findAllPivots(highs, lows, 4, 4),
  };
}

/** Earliest index at which every indicator has a real (non-NaN) value. */
export function warmupIndex(): number {
  // EMA200 is the longest warm-up window we compute.
  return 200;
}

export interface Confluence {
  votes: StrategyVote[];
  direction: "LONG" | "SHORT" | "NEUTRAL";
  confidence: number; // 0-100
  agreeingCount: number;
  totalStrategies: number;
  confirmed: boolean; // passes the high-confirmation bar
}

const MIN_AGREEING = 5; // out of 7 strategies
const MIN_CONFIDENCE = 65;

export function evaluateAt(candles: Candle[], ind: Indicators, i: number): Confluence {
  const votes: StrategyVote[] = [];
  const close = candles[i].close;
  const open = candles[i].open;

  // 1. Trend — EMA stack alignment
  {
    const e20 = ind.ema20[i];
    const e50 = ind.ema50[i];
    const e200 = ind.ema200[i];
    let vote: Vote = 0;
    let note = "Mixed EMA alignment";
    if (e20 > e50 && e50 > e200 && close > e20) {
      vote = 1;
      note = "EMA20 > EMA50 > EMA200, price above EMA20 (uptrend stack)";
    } else if (e20 < e50 && e50 < e200 && close < e20) {
      vote = -1;
      note = "EMA20 < EMA50 < EMA200, price below EMA20 (downtrend stack)";
    }
    votes.push({ key: "trend", name: "Trend (EMA stack)", vote, weight: 1.5, note });
  }

  // 2. Momentum — RSI zone + caution at extremes
  {
    const r = ind.rsi14[i];
    let vote: Vote = 0;
    let note = `RSI ${r.toFixed(1)} — neutral zone`;
    if (r > 70) {
      note = `RSI ${r.toFixed(1)} — overbought, momentum caution`;
    } else if (r > 55) {
      vote = 1;
      note = `RSI ${r.toFixed(1)} — bullish momentum`;
    } else if (r < 30) {
      note = `RSI ${r.toFixed(1)} — oversold, momentum caution`;
    } else if (r < 45) {
      vote = -1;
      note = `RSI ${r.toFixed(1)} — bearish momentum`;
    }
    votes.push({ key: "momentum", name: "Momentum (RSI)", vote, weight: 1, note });
  }

  // 3. MACD — line/signal cross with histogram confirmation
  {
    const line = ind.macd.line[i];
    const signal = ind.macd.signal[i];
    const hist = ind.macd.histogram[i];
    const prevHist = ind.macd.histogram[i - 1];
    let vote: Vote = 0;
    let note = "MACD flat / no clear cross";
    if (line > signal && !Number.isNaN(prevHist) && hist > prevHist) {
      vote = 1;
      note = "MACD above signal, histogram expanding bullish";
    } else if (line < signal && !Number.isNaN(prevHist) && hist < prevHist) {
      vote = -1;
      note = "MACD below signal, histogram expanding bearish";
    }
    votes.push({ key: "macd", name: "MACD", vote, weight: 1.2, note });
  }

  // 4. Volatility position — where price sits inside the Bollinger channel
  {
    const upper = ind.bb.upper[i];
    const middle = ind.bb.middle[i];
    const lower = ind.bb.lower[i];
    let vote: Vote = 0;
    let note = "Price near mid-band — no volatility edge";
    if (close > middle && close < upper) {
      vote = 1;
      note = "Price in upper half of channel, room to run before overextension";
    } else if (close < middle && close > lower) {
      vote = -1;
      note = "Price in lower half of channel, room to fall before overextension";
    } else if (close >= upper || close <= lower) {
      note = "Price at channel extreme — overextension caution";
    }
    votes.push({ key: "volatility", name: "Volatility (Bollinger)", vote, weight: 1, note });
  }

  // 5. Volume confirmation
  {
    const volMa = ind.volumeSma20[i];
    const vol = candles[i].volume;
    const isGreen = close > open;
    let vote: Vote = 0;
    let note = "Volume in line with average — no confirmation";
    if (!Number.isNaN(volMa) && vol > volMa * 1.3) {
      if (isGreen) {
        vote = 1;
        note = `Volume ${(vol / volMa).toFixed(1)}x average on a bullish candle`;
      } else {
        vote = -1;
        note = `Volume ${(vol / volMa).toFixed(1)}x average on a bearish candle`;
      }
    }
    votes.push({ key: "volume", name: "Volume confirmation", vote, weight: 1, note });
  }

  // 6. Support / resistance proximity
  {
    const nearLows = visiblePivots(ind.pivots.pivotLows, i, 3);
    const nearHighs = visiblePivots(ind.pivots.pivotHighs, i, 3);
    let vote: Vote = 0;
    let note = "No nearby swing level";
    const nearestLow = nearLows.at(-1);
    const nearestHigh = nearHighs.at(-1);
    if (nearestLow && Math.abs(close - nearestLow.price) / close < 0.006 && close >= nearestLow.price) {
      vote = 1;
      note = `Price bouncing off support near ${nearestLow.price.toFixed(4)}`;
    } else if (
      nearestHigh &&
      Math.abs(close - nearestHigh.price) / close < 0.006 &&
      close <= nearestHigh.price
    ) {
      vote = -1;
      note = `Price rejecting resistance near ${nearestHigh.price.toFixed(4)}`;
    }
    votes.push({ key: "support_resistance", name: "Support / Resistance", vote, weight: 1.3, note });
  }

  // 7. Structure — sequence of swing highs/lows
  {
    const lows = visiblePivots(ind.pivots.pivotLows, i, 2);
    const highs = visiblePivots(ind.pivots.pivotHighs, i, 2);
    let vote: Vote = 0;
    let note = "Not enough confirmed swings yet";
    if (lows.length === 2 && highs.length === 2) {
      const higherLows = lows[1].price > lows[0].price;
      const higherHighs = highs[1].price > highs[0].price;
      const lowerLows = lows[1].price < lows[0].price;
      const lowerHighs = highs[1].price < highs[0].price;
      if (higherLows && higherHighs) {
        vote = 1;
        note = "Higher highs and higher lows (bullish structure)";
      } else if (lowerLows && lowerHighs) {
        vote = -1;
        note = "Lower highs and lower lows (bearish structure)";
      } else {
        note = "Swing structure is choppy / transitional";
      }
    }
    votes.push({ key: "structure", name: "Price structure", vote, weight: 1, note });
  }

  const totalWeight = votes.reduce((s, v) => s + v.weight, 0);
  const bullishWeight = votes.filter((v) => v.vote === 1).reduce((s, v) => s + v.weight, 0);
  const bearishWeight = votes.filter((v) => v.vote === -1).reduce((s, v) => s + v.weight, 0);

  let direction: Confluence["direction"] = "NEUTRAL";
  if (bullishWeight > bearishWeight) direction = "LONG";
  else if (bearishWeight > bullishWeight) direction = "SHORT";

  const dominantWeight = Math.max(bullishWeight, bearishWeight);
  const confidence = totalWeight > 0 ? Math.round((dominantWeight / totalWeight) * 100) : 0;
  const agreeingCount = votes.filter(
    (v) => (direction === "LONG" && v.vote === 1) || (direction === "SHORT" && v.vote === -1),
  ).length;

  const confirmed = direction !== "NEUTRAL" && agreeingCount >= MIN_AGREEING && confidence >= MIN_CONFIDENCE;

  return {
    votes,
    direction,
    confidence,
    agreeingCount,
    totalStrategies: votes.length,
    confirmed,
  };
}

export const CONFIRMATION_RULES = { minAgreeing: MIN_AGREEING, minConfidence: MIN_CONFIDENCE };
