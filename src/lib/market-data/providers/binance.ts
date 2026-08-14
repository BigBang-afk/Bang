import "server-only";

import type { MarketType } from "@/types/database";
import {
  MarketDataError,
  type MarketDataCapabilities,
  type MarketDataProvider,
  type MarketStatus,
  type OHLCVCandle,
  type OrderBook,
  type ProviderMarket,
  type Ticker,
  type Timeframe,
} from "@/lib/market-data/types";

// Binance's main api.binance.com blocks requests from several regions
// (including, in practice, wherever this app's servers may run — see
// their Terms §b Eligibility). api.binance.us serves the same public
// market-data endpoints for USD-quoted pairs with no API key required,
// so it's used here. This is real, live public market data — not
// simulated — for the crypto symbols listed below.
const BASE_URL = "https://api.binance.us/api/v3";
const REQUEST_TIMEOUT_MS = 8000;

// Binance.US symbol == our market_assets.symbol for these (no mapping
// needed). Extend this alongside supabase/migrations market_assets seed
// rows when adding more USD-quoted crypto pairs.
const SUPPORTED_SYMBOLS: Record<string, ProviderMarket> = {
  BTCUSD: { symbol: "BTCUSD", displayName: "Bitcoin / US Dollar", marketType: "crypto" },
  ETHUSD: { symbol: "ETHUSD", displayName: "Ethereum / US Dollar", marketType: "crypto" },
};

const TIMEFRAME_TO_INTERVAL: Record<Timeframe, string> = {
  "1m": "1m",
  "5m": "5m",
  "15m": "15m",
  "1h": "1h",
  "4h": "4h",
  "1d": "1d",
};

async function fetchJson(path: string): Promise<unknown> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      signal: controller.signal,
      // Public market data changes every few seconds — never let Next.js
      // cache it across requests.
      cache: "no-store",
    });
  } catch (err) {
    if ((err as Error).name === "AbortError") {
      throw new MarketDataError("network_error", "binance", "Request to Binance.US timed out.");
    }
    throw new MarketDataError("network_error", "binance", "Couldn't reach Binance.US.");
  } finally {
    clearTimeout(timeout);
  }

  if (response.status === 429 || response.status === 418) {
    throw new MarketDataError("rate_limited", "binance", "Binance.US rate limit reached.");
  }
  if (response.status === 400) {
    throw new MarketDataError("invalid_symbol", "binance", "Symbol not recognized by Binance.US.");
  }
  if (!response.ok) {
    throw new MarketDataError(
      "provider_unavailable",
      "binance",
      `Binance.US returned ${response.status}.`
    );
  }

  return response.json();
}

function assertSupported(symbol: string): void {
  if (!SUPPORTED_SYMBOLS[symbol]) {
    throw new MarketDataError(
      "unsupported_market",
      "binance",
      `${symbol} isn't available from Binance.US.`
    );
  }
}

export const binanceProvider: MarketDataProvider = {
  id: "binance",
  name: "Binance.US",

  capabilities: {
    markets: ["crypto"],
    supportsOrderBook: true,
    timeframes: ["1m", "5m", "15m", "1h", "4h", "1d"],
    latency: "realtime",
  } satisfies MarketDataCapabilities,

  supportsSymbol(symbol: string, marketType: MarketType): boolean {
    return marketType === "crypto" && Boolean(SUPPORTED_SYMBOLS[symbol]);
  },

  async getMarkets(marketType: MarketType): Promise<ProviderMarket[]> {
    if (marketType !== "crypto") return [];
    return Object.values(SUPPORTED_SYMBOLS);
  },

  async getTicker(symbol: string): Promise<Ticker> {
    assertSupported(symbol);
    const data = (await fetchJson(`/ticker/24hr?symbol=${symbol}`)) as {
      lastPrice: string;
      priceChangePercent: string;
      priceChange: string;
      highPrice: string;
      lowPrice: string;
      volume: string;
      closeTime: number;
    };

    return {
      symbol,
      price: Number(data.lastPrice),
      changePercent24h: Number(data.priceChangePercent),
      changeAbsolute24h: Number(data.priceChange),
      high24h: Number(data.highPrice),
      low24h: Number(data.lowPrice),
      volume24h: Number(data.volume),
      timestamp: new Date(data.closeTime).toISOString(),
    };
  },

  async getOHLCV(symbol: string, timeframe: Timeframe, limit = 200): Promise<OHLCVCandle[]> {
    assertSupported(symbol);
    const interval = TIMEFRAME_TO_INTERVAL[timeframe];
    const cappedLimit = Math.min(Math.max(limit, 1), 1000);
    const raw = (await fetchJson(
      `/klines?symbol=${symbol}&interval=${interval}&limit=${cappedLimit}`
    )) as [number, string, string, string, string, string, ...unknown[]][];

    return raw.map(([openTime, open, high, low, close, volume]) => ({
      time: Math.floor(openTime / 1000),
      open: Number(open),
      high: Number(high),
      low: Number(low),
      close: Number(close),
      volume: Number(volume),
    }));
  },

  async getMarketStatus(marketType: MarketType): Promise<MarketStatus> {
    if (marketType !== "crypto") {
      return { state: "unknown", note: "Not served by this provider." };
    }
    // Crypto trades 24/7 — no exchange calendar to check.
    return { state: "open" };
  },

  async getOrderBook(symbol: string): Promise<OrderBook> {
    assertSupported(symbol);
    const data = (await fetchJson(`/depth?symbol=${symbol}&limit=10`)) as {
      bids: [string, string][];
      asks: [string, string][];
    };

    return {
      bids: data.bids.map(([price, quantity]) => ({
        price: Number(price),
        quantity: Number(quantity),
      })),
      asks: data.asks.map(([price, quantity]) => ({
        price: Number(price),
        quantity: Number(quantity),
      })),
      timestamp: new Date().toISOString(),
    };
  },
};
