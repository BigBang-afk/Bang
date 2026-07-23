import type { PixelCandle } from "../analysis/types";
import { detectPatterns } from "../analysis/patterns";
import { buildLevels } from "../analysis/levels";
import { buildTrend } from "../analysis/trend";
import { buildSignal } from "../analysis/signal";
import { detectNamedStrategies } from "../analysis/namedStrategies";
import type { BacktestResult, ConfidenceBucket, OhlcBar, StrategyStat } from "./types";

const MIN_HISTORY = 20;
const WINDOW = 120;
const PAYOUT = 0.85; // typical binary-option win payout; loss = -100% of stake

/** price -> y-pixel proxy. Our engine's convention is "smaller y = higher
 * price" (mirrors screen coordinates), so we just negate the real price —
 * every pattern/level/trend function only cares about relative ordering. */
function toPixelCandle(bar: OhlcBar, index: number): PixelCandle {
  const openY = -bar.open;
  const closeY = -bar.close;
  return {
    index,
    xStart: index * 10,
    xEnd: index * 10 + 8,
    xCenter: index * 10 + 4,
    color: bar.close >= bar.open ? "bullish" : "bearish",
    highY: -bar.high,
    lowY: -bar.low,
    bodyTopY: Math.min(openY, closeY),
    bodyBottomY: Math.max(openY, closeY),
    openY,
    closeY,
  };
}

function bucketLabel(conf: number): string {
  if (conf < 60) return "50-59%";
  if (conf < 70) return "60-69%";
  if (conf < 80) return "70-79%";
  if (conf < 90) return "80-89%";
  return "90%+";
}

const BUCKET_ORDER = ["50-59%", "60-69%", "70-79%", "80-89%", "90%+"];

export function runBacktest(bars: OhlcBar[], sourceLabel: string): BacktestResult {
  const warnings: string[] = [];

  if (bars.length < MIN_HISTORY + 2) {
    return {
      source: sourceLabel,
      barsUsed: bars.length,
      tradesTaken: 0,
      waits: 0,
      flats: 0,
      wins: 0,
      losses: 0,
      winRatePct: null,
      buckets: [],
      namedStrategies: [],
      baseline: [],
      expectancyPerTrade: null,
      warnings: [`Need at least ${MIN_HISTORY + 2} bars, got ${bars.length}.`],
    };
  }

  let wins = 0;
  let losses = 0;
  let waits = 0;
  let flats = 0;

  const bucketStats = new Map<string, { trades: number; wins: number }>();
  for (const label of BUCKET_ORDER) bucketStats.set(label, { trades: 0, wins: 0 });

  let momentumWins = 0;
  let alwaysCallWins = 0;
  let alwaysPutWins = 0;
  let evaluated = 0;

  const strategyStats = new Map<string, { trades: number; wins: number }>();

  for (let i = MIN_HISTORY; i < bars.length - 1; i++) {
    const windowBars = bars.slice(Math.max(0, i - WINDOW + 1), i + 1);
    const candles = windowBars.map(toPixelCandle);

    const namedHits = detectNamedStrategies(candles);
    const patterns = [...detectPatterns(candles, 5), ...namedHits];
    const levels = buildLevels(candles);
    const trend = buildTrend(candles);
    const { signal, confidence } = buildSignal(candles, patterns, levels, trend);

    const current = bars[i];
    const next = bars[i + 1];
    const actualUp = next.close > current.close;
    const actualDown = next.close < current.close;
    const actualFlat = next.close === current.close;

    // Named strategies are scored standalone here — independent of the
    // blended engine signal below — so each one's real hit rate is visible
    // on its own, not diluted or hidden inside the overall number.
    if (!actualFlat) {
      for (const hit of namedHits) {
        const stat = strategyStats.get(hit.name) ?? { trades: 0, wins: 0 };
        const strategyCorrect = hit.direction === "bullish" ? actualUp : actualDown;
        stat.trades++;
        if (strategyCorrect) stat.wins++;
        strategyStats.set(hit.name, stat);
      }
    }

    if (signal === "WAIT") {
      waits++;
      continue;
    }

    // A flat outcome (no price movement at all — common on thin-liquidity
    // pairs) isn't a real win or loss for a directional bet; real brokers
    // void/refund a tie rather than counting it as a loss, so we exclude
    // it from win/loss/expectancy instead of silently scoring it as a loss.
    if (actualFlat) {
      flats++;
      continue;
    }

    evaluated++;
    const correct = signal === "CALL" ? actualUp : actualDown;
    if (correct) wins++;
    else losses++;

    const bucket = bucketStats.get(bucketLabel(confidence))!;
    bucket.trades++;
    if (correct) bucket.wins++;

    // Baselines, evaluated on the exact same subset of bars our engine
    // actually traded on, so the comparison is apples-to-apples.
    const momentumUp = current.close >= current.open;
    const momentumCorrect = momentumUp ? actualUp : actualDown;
    if (momentumCorrect) momentumWins++;
    if (actualUp) alwaysCallWins++;
    if (actualDown) alwaysPutWins++;
  }

  const tradesTaken = wins + losses;
  const winRatePct = tradesTaken > 0 ? (wins / tradesTaken) * 100 : null;

  const buckets: ConfidenceBucket[] = BUCKET_ORDER.map((range) => {
    const s = bucketStats.get(range)!;
    return {
      range,
      trades: s.trades,
      wins: s.wins,
      winRatePct: s.trades > 0 ? (s.wins / s.trades) * 100 : null,
    };
  }).filter((b) => b.trades > 0);

  const expectancyPerTrade =
    winRatePct !== null ? (winRatePct / 100) * PAYOUT - (1 - winRatePct / 100) * 1 : null;

  const namedStrategies: StrategyStat[] = Array.from(strategyStats.entries())
    .map(([name, s]) => ({
      name,
      trades: s.trades,
      wins: s.wins,
      winRatePct: s.trades > 0 ? (s.wins / s.trades) * 100 : null,
    }))
    .sort((a, b) => b.trades - a.trades);

  for (const s of namedStrategies) {
    if (s.trades > 0 && s.trades < 20) {
      warnings.push(`"${s.name}" only fired ${s.trades} time(s) in this sample — too few to trust its win rate.`);
    }
  }

  if (tradesTaken < 30) {
    warnings.push(
      `Only ${tradesTaken} trades were taken in this sample — too few to draw a real conclusion. Use a longer history for a meaningful read.`,
    );
  }
  if (flats / Math.max(1, tradesTaken + flats) > 0.15) {
    warnings.push(
      `${flats} of ${tradesTaken + flats} signals landed on a price that didn't move at all (thin liquidity on this pair/timeframe) and were excluded rather than counted as losses.`,
    );
  }

  return {
    source: sourceLabel,
    barsUsed: bars.length,
    tradesTaken,
    waits,
    flats,
    wins,
    losses,
    winRatePct,
    buckets,
    namedStrategies,
    baseline: [
      { label: "Coin flip (theoretical)", winRatePct: 50, trades: evaluated },
      {
        label: "Naive momentum (bet the current candle's direction continues)",
        winRatePct: evaluated > 0 ? (momentumWins / evaluated) * 100 : null,
        trades: evaluated,
      },
      {
        label: "Always CALL",
        winRatePct: evaluated > 0 ? (alwaysCallWins / evaluated) * 100 : null,
        trades: evaluated,
      },
      {
        label: "Always PUT",
        winRatePct: evaluated > 0 ? (alwaysPutWins / evaluated) * 100 : null,
        trades: evaluated,
      },
    ],
    expectancyPerTrade,
    warnings,
  };
}
