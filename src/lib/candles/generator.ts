import { Candle, Pair } from "@/lib/types";
import { hashString, mulberry32 } from "./rng";

/**
 * Quotex does not publish a public market-data API. This module produces a
 * deterministic, seeded synthetic OTC candle stream (random walk + slow
 * session-trend bias) so the indicator/signal engine has a live feed to
 * analyze in this demo. Swap `generateCandles` for a real broker/websocket
 * feed to go live — the rest of the engine only depends on the `Candle[]`
 * shape.
 */

interface PairConfig {
  basePrice: number;
  volatility: number;
  trendFreq: number;
  trendPhase: number;
  trendAmplitude: number;
}

const PAIR_BASE: Record<Pair, { basePrice: number; volatility: number }> = {
  "EUR/USD OTC": { basePrice: 1.085, volatility: 0.00028 },
  "GBP/USD OTC": { basePrice: 1.265, volatility: 0.00035 },
  "USD/JPY OTC": { basePrice: 151.2, volatility: 0.035 },
  "EUR/JPY OTC": { basePrice: 164.1, volatility: 0.04 },
  "GBP/JPY OTC": { basePrice: 191.3, volatility: 0.05 },
  "AUD/CAD OTC": { basePrice: 0.912, volatility: 0.00026 },
  "USD/CAD OTC": { basePrice: 1.362, volatility: 0.00024 },
  "NZD/USD OTC": { basePrice: 0.605, volatility: 0.0003 },
};

function pairConfig(pair: Pair): PairConfig {
  const base = PAIR_BASE[pair];
  const h = hashString(pair);
  return {
    basePrice: base.basePrice,
    volatility: base.volatility,
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

const WARMUP_BUCKETS = 300;

/**
 * Generates `numCandles` deterministic candles of `timeframeSeconds` length,
 * ending at the candle boundary at-or-before `nowSeconds`. Calling this again
 * with the same arguments always returns identical candles (server and
 * client stay in sync).
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

  let price = cfg.basePrice;
  const out: Candle[] = [];

  for (let b = startBucket; b <= endBucket; b++) {
    const seed = bucketSeed(pair, timeframeSeconds, b);
    const rng = mulberry32(seed);

    const trendBias = Math.sin(b * cfg.trendFreq + cfg.trendPhase) * cfg.trendAmplitude;
    const noise = (rng() - 0.5) * 2;
    const ret = noise * cfg.volatility + trendBias * cfg.volatility * 0.35;

    const open = price;
    const close = open + ret;
    const wickA = rng();
    const wickB = rng();
    const range = Math.abs(ret) + rng() * cfg.volatility * 0.8;
    const high = Math.max(open, close) + wickA * range * 0.6;
    const low = Math.min(open, close) - wickB * range * 0.6;

    price = close;

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
