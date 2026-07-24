// Ported from backend/app/services/scanner.py — per-symbol fetch + both-direction scoring.

import { getKlines, getOrderBook, getRecentTrades } from "./client";
import { generateSignal, shouldNotify, type Direction, type SignalResult } from "./signalEngine";

export const SCAN_UNIVERSE = [
  "BTCUSDT", "ETHUSDT", "SOLUSDT", "BNBUSDT", "XRPUSDT",
  "DOGEUSDT", "ADAUSDT", "AVAXUSDT", "LINKUSDT", "TRXUSDT",
];

// MEXC's kline endpoint only accepts these interval strings — no "1h" or "3m".
const TRADING_MODE_TIMEFRAMES: Record<string, { primary: string; higher: string }> = {
  scalping: { primary: "5m", higher: "15m" },
  intraday: { primary: "60m", higher: "4h" },
};

export async function scanSymbol(symbol: string, tradingMode: string): Promise<SignalResult[]> {
  const tf = TRADING_MODE_TIMEFRAMES[tradingMode] ?? TRADING_MODE_TIMEFRAMES.intraday;

  try {
    const [candles, htfCandles, orderBook, trades] = await Promise.all([
      getKlines(symbol, tf.primary, 300),
      getKlines(symbol, tf.higher, 300),
      getOrderBook(symbol, 50),
      getRecentTrades(symbol, 200),
    ]);

    if (!candles.length || !htfCandles.length) return [];

    const directions: Direction[] = ["long", "short"];
    const signals = directions
      .map((direction) => generateSignal(symbol, direction, candles, htfCandles, orderBook, trades, tradingMode, tf.primary))
      .filter(shouldNotify);

    return signals;
  } catch {
    return [];
  }
}

export async function scanMarket(symbols: string[], tradingMode: string): Promise<SignalResult[]> {
  const results = await Promise.all(symbols.map((s) => scanSymbol(s, tradingMode)));
  return results.flat();
}
