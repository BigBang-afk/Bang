import { computeWinLossStats, type TradeResult, type WinLossStats } from "@/lib/calc";

export interface GroupableTrade {
  netPnlUsd: number;
  result: TradeResult;
  plannedRR?: number | null;
}

export function groupTradeStats<T extends GroupableTrade>(
  trades: T[],
  keyFn: (t: T) => string,
  countBreakevenAsWin = false
): Map<string, WinLossStats> {
  const groups = new Map<string, T[]>();
  for (const t of trades) {
    const key = keyFn(t);
    const arr = groups.get(key) ?? [];
    arr.push(t);
    groups.set(key, arr);
  }

  const result = new Map<string, WinLossStats>();
  for (const [key, groupTrades] of groups) {
    result.set(key, computeWinLossStats(groupTrades, countBreakevenAsWin));
  }
  return result;
}
