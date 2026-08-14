import "server-only";

import { MarketDataError, getMarketStatus, getOHLCV, getTicker, isMarketSupported } from "@/lib/market-data";
import type { Timeframe } from "@/lib/market-data/types";
import { splitClosedAndForming } from "@/lib/technical-analysis/candles";
import { findSupportResistanceLevels } from "@/lib/technical-analysis/levels";
import { DEFAULT_ANALYSIS_SETTINGS, analyzeSymbol } from "@/lib/technical-analysis/scoring";
import { AIAnalysisError } from "@/lib/ai/schema";
import type { AnalysisInputSnapshot } from "@/lib/ai/types";
import type { MarketAssetRow } from "@/types/database";

const CANDLE_LIMIT = 300;

/**
 * Gathers everything the AI analysis prompt is allowed to see, for one
 * asset/timeframe, entirely from data this app can already back up: live
 * market data (Phase 4) and the technical-analysis engine (Phase 5). Throws
 * a typed AIAnalysisError rather than returning a partial/fabricated
 * snapshot when the market has no connected provider or there isn't enough
 * closed-candle history yet.
 */
export async function buildAnalysisInputSnapshot(
  asset: MarketAssetRow,
  timeframe: Timeframe
): Promise<AnalysisInputSnapshot> {
  if (!isMarketSupported(asset.market_type)) {
    throw new AIAnalysisError(
      "unsupported_market",
      `No connected data source covers ${asset.symbol} (${asset.market_type}) yet.`
    );
  }

  let rawCandles, ticker, marketStatus;
  try {
    [rawCandles, ticker, marketStatus] = await Promise.all([
      getOHLCV(asset.symbol, asset.market_type, timeframe, CANDLE_LIMIT),
      getTicker(asset.symbol, asset.market_type),
      getMarketStatus(asset.market_type),
    ]);
  } catch (err) {
    if (err instanceof MarketDataError) {
      throw new AIAnalysisError(
        err.code === "unsupported_market" || err.code === "invalid_symbol"
          ? "unsupported_market"
          : "api_error",
        err.message
      );
    }
    throw err;
  }

  const { closed } = splitClosedAndForming(rawCandles, timeframe);
  const snapshot = analyzeSymbol(closed, asset.symbol, timeframe, DEFAULT_ANALYSIS_SETTINGS);

  if (!snapshot) {
    throw new AIAnalysisError(
      "insufficient_data",
      `Not enough closed-candle history for ${asset.symbol} on ${timeframe} yet.`
    );
  }

  const levels = findSupportResistanceLevels(closed, snapshot.price);

  return {
    symbol: asset.symbol,
    displayName: asset.display_name,
    marketType: asset.market_type,
    timeframe,
    asOfCandleTime: new Date(snapshot.asOfCandleTime * 1000).toISOString(),
    price: snapshot.price,
    change24hPercent: ticker.changePercent24h,
    marketStatus: marketStatus.state,
    recentCandles: closed.slice(-30).map((c) => ({
      time: c.time,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
      volume: c.volume,
    })),
    indicators: snapshot.indicators,
    trend: snapshot.trend,
    momentum: snapshot.momentumReading,
    volatility: snapshot.volatility,
    volumeState: snapshot.volumeState,
    technicalScore: snapshot.score,
    setupType: snapshot.setupType,
    supportingConditions: snapshot.supportingConditions,
    conflictingConditions: snapshot.conflictingConditions,
    supportResistanceLevels: levels,
  };
}
