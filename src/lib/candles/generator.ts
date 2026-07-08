import { Candle, Pair } from "@/lib/types";
import { hashString, mulberry32 } from "./rng";

/**
 * Quotex does not publish a public market-data API, and its OTC instruments
 * are a broker-internal synthetic feed with no external source at all — so
 * this module simulates one instead. It's a bounded-memory model (long-term
 * sine drift + a rolling local random walk + EWMA-based volatility
 * clustering + short momentum bursts + occasional long-wick rejection
 * candles) built to look and behave like real short-timeframe price action,
 * while staying fully deterministic per (pair, timeframe, timestamp) so the
 * chart and the signal engine's own analysis window always agree. Swap
 * `generateCandles` for a real broker/websocket feed to go live — the rest
 * of the engine only depends on the `Candle[]` shape.
 */

interface PairConfig {
  basePrice: number;
  volatility: number;
  trendFreq: number;
  trendPhase: number;
  trendAmplitude: number;
}

/**
 * basePrice: approximate real-world quote level (only used to seed a
 * plausible starting price for the simulated walk).
 * volPct: per-candle volatility as a fraction of price. Actual volatility
 * used is basePrice * volPct, so JPY-scale and exotic-scale pairs don't need
 * separately tuned absolute numbers.
 */
const PAIR_BASE: Record<Pair, { basePrice: number; volPct: number }> = {
  // Majors
  "EUR/USD OTC": { basePrice: 1.085, volPct: 0.00026 },
  "GBP/USD OTC": { basePrice: 1.265, volPct: 0.00028 },
  "USD/JPY OTC": { basePrice: 151.2, volPct: 0.00023 },
  "USD/CHF OTC": { basePrice: 0.905, volPct: 0.00024 },
  "USD/CAD OTC": { basePrice: 1.362, volPct: 0.00022 },
  "AUD/USD OTC": { basePrice: 0.655, volPct: 0.00027 },
  "NZD/USD OTC": { basePrice: 0.605, volPct: 0.00028 },

  // Crosses
  "EUR/JPY OTC": { basePrice: 164.1, volPct: 0.00026 },
  "GBP/JPY OTC": { basePrice: 191.3, volPct: 0.00032 },
  "EUR/GBP OTC": { basePrice: 0.858, volPct: 0.00022 },
  "EUR/CHF OTC": { basePrice: 0.982, volPct: 0.0002 },
  "EUR/AUD OTC": { basePrice: 1.657, volPct: 0.00028 },
  "EUR/CAD OTC": { basePrice: 1.478, volPct: 0.00027 },
  "EUR/NZD OTC": { basePrice: 1.794, volPct: 0.0003 },
  "GBP/AUD OTC": { basePrice: 1.932, volPct: 0.0003 },
  "GBP/CAD OTC": { basePrice: 1.723, volPct: 0.00029 },
  "GBP/CHF OTC": { basePrice: 1.145, volPct: 0.00026 },
  "GBP/NZD OTC": { basePrice: 2.091, volPct: 0.00033 },
  "AUD/CAD OTC": { basePrice: 0.912, volPct: 0.00026 },
  "AUD/CHF OTC": { basePrice: 0.593, volPct: 0.00025 },
  "AUD/JPY OTC": { basePrice: 99.1, volPct: 0.00027 },
  "AUD/NZD OTC": { basePrice: 1.083, volPct: 0.00022 },
  "CAD/CHF OTC": { basePrice: 0.665, volPct: 0.00023 },
  "CAD/JPY OTC": { basePrice: 111.0, volPct: 0.00025 },
  "CHF/JPY OTC": { basePrice: 167.0, volPct: 0.00027 },
  "NZD/CAD OTC": { basePrice: 0.823, volPct: 0.00025 },
  "NZD/CHF OTC": { basePrice: 0.548, volPct: 0.00024 },
  "NZD/JPY OTC": { basePrice: 91.5, volPct: 0.00029 },

  // Popular exotics (Quotex is known for these on weekends)
  "USD/INR OTC": { basePrice: 83.4, volPct: 0.00045 },
  "USD/BRL OTC": { basePrice: 5.42, volPct: 0.0006 },
  "USD/MXN OTC": { basePrice: 18.1, volPct: 0.0005 },
  "USD/ZAR OTC": { basePrice: 18.6, volPct: 0.00065 },
  "USD/TRY OTC": { basePrice: 34.2, volPct: 0.0007 },
  "USD/PHP OTC": { basePrice: 58.3, volPct: 0.00045 },
  "USD/EGP OTC": { basePrice: 48.5, volPct: 0.0005 },
  "USD/PKR OTC": { basePrice: 278.0, volPct: 0.00055 },
  "USD/BDT OTC": { basePrice: 110.5, volPct: 0.0004 },
  "USD/NGN OTC": { basePrice: 1520.0, volPct: 0.0007 },
  "USD/COP OTC": { basePrice: 4020.0, volPct: 0.0006 },
  "USD/DZD OTC": { basePrice: 134.5, volPct: 0.00045 },

  // Metals
  "XAU/USD OTC": { basePrice: 2340.0, volPct: 0.00035 },
  "XAG/USD OTC": { basePrice: 27.5, volPct: 0.0006 },
};

function pairConfig(pair: Pair): PairConfig {
  const base = PAIR_BASE[pair];
  const h = hashString(pair);
  return {
    basePrice: base.basePrice,
    volatility: base.basePrice * base.volPct,
    trendFreq: 0.015 + ((h % 1000) / 1000) * 0.02,
    trendPhase: ((h >> 8) % 1000) / 1000 * Math.PI * 2,
    trendAmplitude: 0.5 + ((h >> 16) % 1000) / 1000,
  };
}

const bucketSeedCache = new Map<string, number>();

function bucketSeed(pair: Pair, timeframeSeconds: number, bucketIndex: number): number {
  const key = `${pair}|${timeframeSeconds}|${bucketIndex}`;
  let cached = bucketSeedCache.get(key);
  if (cached === undefined) {
    cached = hashString(key);
    bucketSeedCache.set(key, cached);
  }
  return cached;
}

// Bounded-memory windows for the recursive state below (local walk sum, vol
// clustering EWMA, momentum EWMA). WARMUP_BUCKETS is kept far larger than all
// of them so that, regardless of how many candles a caller asks for, every
// bucket's state has fully converged by the time it reaches the requested
// range — two callers requesting different numCandles for the same
// pair/timeframe/timestamp always see identical values for any bucket they
// both cover (this is what keeps the live chart and the signal engine's own
// analysis window in agreement).
const LOCAL_WALK_WINDOW = 60;
const VOL_EWMA_HALFLIFE = 18;
const MOMENTUM_EWMA_HALFLIFE = 6;
const WARMUP_BUCKETS = 400;
const BASELINE_ABS_SHOCK = 0.5; // E[|U(-1,1)|]

function halflifeToAlpha(halflife: number): number {
  return 1 - Math.pow(0.5, 1 / halflife);
}

const VOL_ALPHA = halflifeToAlpha(VOL_EWMA_HALFLIFE);
const MOMENTUM_ALPHA = halflifeToAlpha(MOMENTUM_EWMA_HALFLIFE);

/**
 * Generates `numCandles` deterministic candles of `timeframeSeconds` length,
 * ending at the candle boundary at-or-before `nowSeconds`. Calling this again
 * with the same arguments always returns identical candles (server and
 * client stay in sync), and — because every recursive signal below has a
 * short memory relative to the warmup window — different `numCandles`
 * requests for the same pair/timeframe/timestamp agree on every bucket they
 * overlap.
 */
export function generateCandles(
  pair: Pair,
  timeframeSeconds: number,
  numCandles: number,
  nowSeconds: number
): Candle[] {
  const cfg = pairConfig(pair);
  const endBucket = Math.floor(nowSeconds / timeframeSeconds);
  const startBucket = endBucket - numCandles - WARMUP_BUCKETS + 1;

  const shockRing: number[] = [];
  let localWalkSum = 0;
  let emaAbsShock = BASELINE_ABS_SHOCK;
  let emaShock = 0;
  let prevClose = cfg.basePrice;

  const out: Candle[] = [];

  for (let b = startBucket; b <= endBucket; b++) {
    const seed = bucketSeed(pair, timeframeSeconds, b);
    const rng = mulberry32(seed);

    const shock = (rng() - 0.5) * 2;
    const wickA = rng();
    const wickB = rng();
    const wickB2 = rng();
    const rejectionRoll = rng();

    // Bounded-memory local random walk: only the last LOCAL_WALK_WINDOW
    // shocks contribute, so this never depends on where the loop started.
    shockRing.push(shock);
    localWalkSum += shock;
    if (shockRing.length > LOCAL_WALK_WINDOW) {
      localWalkSum -= shockRing.shift()!;
    }

    // Volatility clustering: calm/volatile regimes persist for a few candles
    // instead of every candle drawing independent volatility.
    emaAbsShock = VOL_ALPHA * Math.abs(shock) + (1 - VOL_ALPHA) * emaAbsShock;
    const volMultiplier = Math.min(2.2, Math.max(0.4, emaAbsShock / BASELINE_ABS_SHOCK));

    // Short-lived momentum: recent directional shocks bleed into the next
    // few candles, producing believable momentum bursts and pullbacks.
    emaShock = MOMENTUM_ALPHA * shock + (1 - MOMENTUM_ALPHA) * emaShock;

    const longTermDrift =
      (Math.sin(b * cfg.trendFreq + cfg.trendPhase) * cfg.trendAmplitude +
        Math.sin(b * cfg.trendFreq * 2.7 + cfg.trendPhase * 1.3) * cfg.trendAmplitude * 0.4) *
      cfg.volatility *
      3;
    const localWalk = localWalkSum * cfg.volatility * 0.12;
    const momentumBoost = emaShock * cfg.volatility * 1.5;

    const close = cfg.basePrice + longTermDrift + localWalk + momentumBoost;
    const open = prevClose;
    prevClose = close;

    const bodyRange = Math.abs(close - open);
    const range = bodyRange + rejectionRoll * cfg.volatility * volMultiplier * 1.2;

    let high: number;
    let low: number;
    if (rejectionRoll < 0.18) {
      // Occasional rejection candle: one long wick, one short wick.
      const longWick = (0.5 + wickB * 1.5) * range * volMultiplier;
      const shortWick = wickB2 * 0.25 * range * volMultiplier;
      if (wickA > 0.5) {
        high = Math.max(open, close) + longWick;
        low = Math.min(open, close) - shortWick;
      } else {
        high = Math.max(open, close) + shortWick;
        low = Math.min(open, close) - longWick;
      }
    } else {
      high = Math.max(open, close) + wickA * range * 0.5 * volMultiplier;
      low = Math.min(open, close) - wickB * range * 0.5 * volMultiplier;
    }

    if (b > endBucket - numCandles) {
      out.push({ time: b * timeframeSeconds, open, high, low, close });
    }
  }

  return out;
}

export function currentCandleBoundaries(
  timeframeSeconds: number,
  nowSeconds: number
): { entryTime: number; expiryTime: number } {
  const bucket = Math.floor(nowSeconds / timeframeSeconds);
  const entryTime = (bucket + 1) * timeframeSeconds;
  const expiryTime = entryTime + timeframeSeconds;
  return { entryTime, expiryTime };
}
