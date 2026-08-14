import "server-only";

import { getDataSource, getOHLCV } from "@/lib/market-data";
import { isMarketSupported } from "@/lib/market-data/registry";
import type { DataSourceInfo } from "@/lib/market-data";
import type { Timeframe } from "@/lib/market-data/types";
import { splitClosedAndForming } from "@/lib/technical-analysis/candles";
import {
  DEFAULT_ANALYSIS_SETTINGS,
  analyzeSymbol,
  type AnalysisSettings,
  type Trend,
  type TechnicalSnapshot,
  type Volatility,
  type VolumeState,
} from "@/lib/technical-analysis/scoring";
import { createClient } from "@/lib/supabase/server";
import type { MarketType } from "@/types/database";

export type EmaCondition =
  | "price_above_fast"
  | "price_below_fast"
  | "price_above_slow"
  | "price_below_slow"
  | "fast_above_slow"
  | "fast_below_slow";

export interface ScannerFilters {
  marketType: MarketType;
  timeframe: Timeframe;
  symbolQuery?: string;
  trend?: Trend;
  volatility?: Volatility;
  momentum?: Trend;
  volumeState?: VolumeState;
  rsiMin?: number;
  rsiMax?: number;
  emaCondition?: EmaCondition;
}

export interface ScannerResultItem extends TechnicalSnapshot {
  displayName: string;
}

export interface ScannerResult {
  items: ScannerResultItem[];
  /** Assets matching market/symbol filters, before per-symbol technical filters. */
  totalScanned: number;
  /** Assets skipped because no data source covers them yet. */
  unsupportedCount: number;
  dataSource: DataSourceInfo | null;
}

function passesFilters(snapshot: TechnicalSnapshot, filters: ScannerFilters): boolean {
  if (filters.trend && snapshot.trend !== filters.trend) return false;
  if (filters.volatility && snapshot.volatility !== filters.volatility) return false;
  if (filters.momentum && snapshot.momentumReading !== filters.momentum) return false;
  if (filters.volumeState && snapshot.volumeState !== filters.volumeState) return false;

  const { rsi, emaFast, emaSlow } = snapshot.indicators;
  if (filters.rsiMin !== undefined && (rsi === null || rsi < filters.rsiMin)) return false;
  if (filters.rsiMax !== undefined && (rsi === null || rsi > filters.rsiMax)) return false;

  if (filters.emaCondition) {
    if (emaFast === null || emaSlow === null) return false;
    const { price } = snapshot;
    switch (filters.emaCondition) {
      case "price_above_fast":
        if (!(price > emaFast)) return false;
        break;
      case "price_below_fast":
        if (!(price < emaFast)) return false;
        break;
      case "price_above_slow":
        if (!(price > emaSlow)) return false;
        break;
      case "price_below_slow":
        if (!(price < emaSlow)) return false;
        break;
      case "fast_above_slow":
        if (!(emaFast > emaSlow)) return false;
        break;
      case "fast_below_slow":
        if (!(emaFast < emaSlow)) return false;
        break;
    }
  }

  return true;
}

/**
 * Runs the scanner against real market data for every active asset
 * matching the market/symbol filters. Never fabricates a result: assets
 * with no connected provider are counted in `unsupportedCount` and
 * skipped rather than given a made-up snapshot, and a single symbol's
 * provider error only drops that symbol, not the whole scan.
 */
export async function runScan(
  filters: ScannerFilters,
  settings: AnalysisSettings = DEFAULT_ANALYSIS_SETTINGS
): Promise<ScannerResult> {
  const supabase = await createClient();
  const { data: assets } = await supabase
    .from("market_assets")
    .select("*")
    .eq("is_active", true)
    .eq("market_type", filters.marketType)
    .order("symbol");

  const list = assets ?? [];
  const bySymbol = filters.symbolQuery
    ? list.filter((a) => a.symbol.toLowerCase().includes(filters.symbolQuery!.toLowerCase()))
    : list;

  if (!isMarketSupported(filters.marketType)) {
    return {
      items: [],
      totalScanned: bySymbol.length,
      unsupportedCount: bySymbol.length,
      dataSource: null,
    };
  }

  const items: ScannerResultItem[] = [];
  let unsupportedCount = 0;

  for (const asset of bySymbol) {
    try {
      const raw = await getOHLCV(asset.symbol, asset.market_type, filters.timeframe, 300);
      const { closed } = splitClosedAndForming(raw, filters.timeframe);
      const snapshot = analyzeSymbol(closed, asset.symbol, filters.timeframe, settings);
      if (!snapshot) continue; // not enough history for this symbol/timeframe yet
      if (!passesFilters(snapshot, filters)) continue;
      items.push({ ...snapshot, displayName: asset.display_name });
    } catch {
      // A single symbol's provider error (rate limit, transient network
      // issue) shouldn't fail the whole scan — it's just excluded.
      unsupportedCount++;
    }
  }

  items.sort((a, b) => b.score - a.score);

  return {
    items,
    totalScanned: bySymbol.length,
    unsupportedCount,
    dataSource: getDataSource(filters.marketType),
  };
}
