export type TradeResult = "WIN" | "LOSS" | "BREAKEVEN";

export interface WinLossStats {
  totalTrades: number;
  wins: number;
  losses: number;
  breakeven: number;
  winRate: number;
  grossProfit: number;
  grossLoss: number;
  netProfit: number;
  avgWin: number;
  avgLoss: number;
  avgRR: number | null;
  profitFactor: number | null;
  largestWin: number;
  largestLoss: number;
  expectancy: number;
  maxWinStreak: number;
  maxLossStreak: number;
}

export function computeWinLossStats(
  trades: { netPnlUsd: number; result: TradeResult; plannedRR?: number | null }[],
  countBreakevenAsWin = false
): WinLossStats {
  const totalTrades = trades.length;
  let wins = 0;
  let losses = 0;
  let breakeven = 0;
  let grossProfit = 0;
  let grossLoss = 0;
  let largestWin = 0;
  let largestLoss = 0;
  const rrValues: number[] = [];

  for (const t of trades) {
    if (t.plannedRR !== null && t.plannedRR !== undefined) rrValues.push(t.plannedRR);
    if (t.result === "WIN" || (t.result === "BREAKEVEN" && countBreakevenAsWin && t.netPnlUsd > 0)) {
      wins++;
      grossProfit += t.netPnlUsd;
      if (t.netPnlUsd > largestWin) largestWin = t.netPnlUsd;
    } else if (t.result === "LOSS") {
      losses++;
      grossLoss += Math.abs(t.netPnlUsd);
      if (t.netPnlUsd < largestLoss) largestLoss = t.netPnlUsd;
    } else {
      breakeven++;
      if (t.netPnlUsd > 0) grossProfit += t.netPnlUsd;
      else if (t.netPnlUsd < 0) grossLoss += Math.abs(t.netPnlUsd);
    }
  }

  const decisiveCount = wins + losses;
  const winRate = decisiveCount > 0 ? (wins / decisiveCount) * 100 : 0;
  const netProfit = grossProfit - grossLoss;
  const avgWin = wins > 0 ? grossProfit / wins : 0;
  const avgLoss = losses > 0 ? grossLoss / losses : 0;
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? null : 0;
  const lossRate = decisiveCount > 0 ? (losses / decisiveCount) * 100 : 0;
  const expectancy = (winRate / 100) * avgWin - (lossRate / 100) * avgLoss;
  const avgRR = rrValues.length > 0 ? rrValues.reduce((a, b) => a + b, 0) / rrValues.length : null;

  const { maxWinStreak, maxLossStreak } = computeStreaks(trades.map((t) => t.result));

  return {
    totalTrades,
    wins,
    losses,
    breakeven,
    winRate,
    grossProfit,
    grossLoss,
    netProfit,
    avgWin,
    avgLoss,
    avgRR,
    profitFactor,
    largestWin,
    largestLoss,
    expectancy,
    maxWinStreak,
    maxLossStreak,
  };
}

export function computeStreaks(results: TradeResult[]) {
  let maxWinStreak = 0;
  let maxLossStreak = 0;
  let currentWinStreak = 0;
  let currentLossStreak = 0;
  let currentStreak = 0;
  let currentStreakType: TradeResult | null = null;

  for (const r of results) {
    if (r === "WIN") {
      currentWinStreak++;
      currentLossStreak = 0;
      maxWinStreak = Math.max(maxWinStreak, currentWinStreak);
    } else if (r === "LOSS") {
      currentLossStreak++;
      currentWinStreak = 0;
      maxLossStreak = Math.max(maxLossStreak, currentLossStreak);
    } else {
      currentWinStreak = 0;
      currentLossStreak = 0;
    }

    if (r === currentStreakType) {
      currentStreak++;
    } else {
      currentStreakType = r;
      currentStreak = 1;
    }
  }

  return { maxWinStreak, maxLossStreak, currentStreak, currentStreakType };
}

export interface DrawdownPoint {
  date: Date | string;
  balance: number;
}

export function computeEquityCurveDrawdown(points: DrawdownPoint[]) {
  let peak = points.length > 0 ? points[0].balance : 0;
  let peakDate = points.length > 0 ? points[0].date : null;
  let maxDrawdown = 0;
  let maxDrawdownPct = 0;

  for (const p of points) {
    if (p.balance > peak) {
      peak = p.balance;
      peakDate = p.date;
    }
    const dd = peak - p.balance;
    const ddPct = peak > 0 ? (dd / peak) * 100 : 0;
    if (dd > maxDrawdown) {
      maxDrawdown = dd;
      maxDrawdownPct = ddPct;
    }
  }

  const currentBalance = points.length > 0 ? points[points.length - 1].balance : 0;
  const currentDrawdown = peak - currentBalance;
  const currentDrawdownPct = peak > 0 ? (currentDrawdown / peak) * 100 : 0;

  return {
    peakBalance: peak,
    peakDate,
    maxDrawdown,
    maxDrawdownPct,
    currentBalance,
    currentDrawdown,
    currentDrawdownPct,
  };
}

export type RiskLevel = "LOW" | "MODERATE" | "HIGH" | "CRITICAL";

export function riskLevelForDrawdown(
  drawdownPct: number,
  thresholds: { low: number; moderate: number; high: number; critical: number }
): RiskLevel {
  if (drawdownPct >= thresholds.critical) return "CRITICAL";
  if (drawdownPct >= thresholds.high) return "HIGH";
  if (drawdownPct >= thresholds.moderate) return "MODERATE";
  return "LOW";
}

export function safeDiv(numerator: number, denominator: number): number {
  return denominator === 0 ? 0 : numerator / denominator;
}
