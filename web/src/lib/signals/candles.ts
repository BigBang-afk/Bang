export interface Candle {
  openTime: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface TradingPair {
  symbol: string; // Binance.US symbol, e.g. "BTCUSDT"
  label: string; // Display label, e.g. "BTC/USDT"
  tvSymbol: string; // TradingView symbol for chart embeds
}

export const SIGNAL_PAIRS: TradingPair[] = [
  { symbol: "BTCUSDT", label: "BTC/USDT", tvSymbol: "BINANCE:BTCUSDT" },
  { symbol: "ETHUSDT", label: "ETH/USDT", tvSymbol: "BINANCE:ETHUSDT" },
  { symbol: "SOLUSDT", label: "SOL/USDT", tvSymbol: "BINANCE:SOLUSDT" },
  { symbol: "BNBUSDT", label: "BNB/USDT", tvSymbol: "BINANCE:BNBUSDT" },
  { symbol: "XRPUSDT", label: "XRP/USDT", tvSymbol: "BINANCE:XRPUSDT" },
  { symbol: "ADAUSDT", label: "ADA/USDT", tvSymbol: "BINANCE:ADAUSDT" },
  { symbol: "DOGEUSDT", label: "DOGE/USDT", tvSymbol: "BINANCE:DOGEUSDT" },
  { symbol: "AVAXUSDT", label: "AVAX/USDT", tvSymbol: "BINANCE:AVAXUSDT" },
  { symbol: "LINKUSDT", label: "LINK/USDT", tvSymbol: "BINANCE:LINKUSDT" },
  { symbol: "LTCUSDT", label: "LTC/USDT", tvSymbol: "BINANCE:LTCUSDT" },
];

const BINANCE_US_BASE = "https://api.binance.us/api/v3/klines";

/**
 * Live 1h candles from Binance.US public market data (no API key required).
 * Binance.com is geo-restricted in some hosting regions; .US mirrors the
 * same kline schema and covers all the major USDT pairs we list above.
 */
export async function fetchCandles(symbol: string, interval = "1h", limit = 300): Promise<Candle[]> {
  const url = `${BINANCE_US_BASE}?symbol=${encodeURIComponent(symbol)}&interval=${interval}&limit=${limit}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Failed to fetch candles for ${symbol}: ${res.status}`);
  }
  const raw = (await res.json()) as unknown[][];
  return raw.map((row) => ({
    openTime: row[0] as number,
    open: parseFloat(row[1] as string),
    high: parseFloat(row[2] as string),
    low: parseFloat(row[3] as string),
    close: parseFloat(row[4] as string),
    volume: parseFloat(row[5] as string),
  }));
}
