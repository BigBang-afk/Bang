/**
 * Pure performance-stats math for /dashboard/performance. Operates only on
 * CLOSED trades with a realized P/L — an open position contributes nothing
 * here, there's nothing to guess about its eventual outcome.
 *
 * Every stat that would require data this app doesn't have is left `null`
 * rather than estimated: profit factor is null (not Infinity) when there
 * are no losing trades to normalize against, and avgR only ever averages
 * over trades that actually recorded a risk amount — a trade logged
 * without one is excluded from that average, not assumed to be some
 * default risk.
 */

export interface ClosedTradeInput {
  pnlCents: number;
  /** Dollar risk taken on this trade, in cents — null if not recorded. */
  riskAmountCents: number | null;
  closedAt: string;
}

export interface EquityPoint {
  date: string;
  cumulativePnlCents: number;
}

export interface PerformanceStats {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  breakEvenTrades: number;
  /** Percent, 0-100. Null when there are no closed trades. */
  winRate: number | null;
  avgWinCents: number | null;
  /** Positive magnitude — "how big is a typical loss," not a negative number. */
  avgLossCents: number | null;
  /** Gross profit / gross loss. Null with no trades, or no losing trades to divide by. */
  profitFactor: number | null;
  /** Mean of (pnl / risk) across trades that recorded a risk amount. */
  avgR: number | null;
  /** How many trades contributed to avgR — always report this alongside avgR. */
  rSampleSize: number;
  netPnlCents: number;
  /** Largest peak-to-trough decline in cumulative P/L, as a positive cents magnitude. */
  maxDrawdownCents: number;
  /** Cumulative P/L after each trade, in closedAt order. */
  equityCurve: EquityPoint[];
}

const EMPTY_STATS: PerformanceStats = {
  totalTrades: 0,
  winningTrades: 0,
  losingTrades: 0,
  breakEvenTrades: 0,
  winRate: null,
  avgWinCents: null,
  avgLossCents: null,
  profitFactor: null,
  avgR: null,
  rSampleSize: 0,
  netPnlCents: 0,
  maxDrawdownCents: 0,
  equityCurve: [],
};

export function computePerformanceStats(trades: ClosedTradeInput[]): PerformanceStats {
  if (trades.length === 0) return EMPTY_STATS;

  const sorted = [...trades].sort(
    (a, b) => new Date(a.closedAt).getTime() - new Date(b.closedAt).getTime()
  );

  let winningTrades = 0;
  let losingTrades = 0;
  let breakEvenTrades = 0;
  let grossProfitCents = 0;
  let grossLossCents = 0; // positive magnitude
  let rSum = 0;
  let rSampleSize = 0;

  const equityCurve: EquityPoint[] = [];
  let cumulative = 0;
  let runningPeak = 0;
  let maxDrawdownCents = 0;

  for (const trade of sorted) {
    if (trade.pnlCents > 0) {
      winningTrades++;
      grossProfitCents += trade.pnlCents;
    } else if (trade.pnlCents < 0) {
      losingTrades++;
      grossLossCents += Math.abs(trade.pnlCents);
    } else {
      breakEvenTrades++;
    }

    if (trade.riskAmountCents !== null && trade.riskAmountCents > 0) {
      rSum += trade.pnlCents / trade.riskAmountCents;
      rSampleSize++;
    }

    cumulative += trade.pnlCents;
    equityCurve.push({ date: trade.closedAt, cumulativePnlCents: cumulative });

    runningPeak = Math.max(runningPeak, cumulative);
    maxDrawdownCents = Math.max(maxDrawdownCents, runningPeak - cumulative);
  }

  const totalTrades = sorted.length;

  return {
    totalTrades,
    winningTrades,
    losingTrades,
    breakEvenTrades,
    winRate: (winningTrades / totalTrades) * 100,
    avgWinCents: winningTrades > 0 ? grossProfitCents / winningTrades : null,
    avgLossCents: losingTrades > 0 ? grossLossCents / losingTrades : null,
    profitFactor: grossLossCents > 0 ? grossProfitCents / grossLossCents : null,
    avgR: rSampleSize > 0 ? rSum / rSampleSize : null,
    rSampleSize,
    netPnlCents: cumulative,
    maxDrawdownCents,
    equityCurve,
  };
}
