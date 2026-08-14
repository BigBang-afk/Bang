import type { MarketType } from "@/types/database";

export type Timeframe = "1m" | "5m" | "15m" | "1h" | "4h" | "1d";

export const TIMEFRAMES: Timeframe[] = ["1m", "5m", "15m", "1h", "4h", "1d"];

export interface Ticker {
  symbol: string;
  price: number;
  changePercent24h: number | null;
  changeAbsolute24h: number | null;
  high24h: number | null;
  low24h: number | null;
  volume24h: number | null;
  /** ISO timestamp of when the provider says this snapshot is from. */
  timestamp: string;
}

export interface OHLCVCandle {
  /** Unix seconds — the unit TradingView Lightweight Charts expects. */
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number | null;
}

export interface OrderBookLevel {
  price: number;
  quantity: number;
}

export interface OrderBook {
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
  timestamp: string;
}

export type MarketStatusState = "open" | "closed" | "unknown";

export interface MarketStatus {
  state: MarketStatusState;
  note?: string;
}

export interface ProviderMarket {
  symbol: string;
  displayName: string;
  marketType: MarketType;
}

export interface MarketDataCapabilities {
  /** Market types this provider can serve at all. */
  markets: MarketType[];
  supportsOrderBook: boolean;
  timeframes: Timeframe[];
  /**
   * Whether prices are effectively real-time (seconds of latency) or
   * meaningfully delayed. Surfaced in the UI — never claim "real-time" for
   * a delayed feed.
   */
  latency: "realtime" | "delayed";
}

/**
 * Error codes every provider implementation must map its failures onto,
 * so callers (API routes, pages) can react consistently regardless of
 * which provider is behind a given market.
 */
export type MarketDataErrorCode =
  | "unsupported_market"
  | "invalid_symbol"
  | "rate_limited"
  | "provider_unavailable"
  | "network_error";

export class MarketDataError extends Error {
  code: MarketDataErrorCode;
  provider: string;

  constructor(code: MarketDataErrorCode, provider: string, message: string) {
    super(message);
    this.name = "MarketDataError";
    this.code = code;
    this.provider = provider;
  }
}

/**
 * The provider abstraction every market-data source implements. Swapping
 * or adding a provider means writing one of these and registering it in
 * lib/market-data/registry.ts — nothing else in the app should import a
 * provider implementation directly.
 */
export interface MarketDataProvider {
  readonly id: string;
  readonly name: string;
  readonly capabilities: MarketDataCapabilities;

  /** Whether this provider can serve the given symbol at all. */
  supportsSymbol(symbol: string, marketType: MarketType): boolean;

  getMarkets(marketType: MarketType): Promise<ProviderMarket[]>;
  getTicker(symbol: string): Promise<Ticker>;
  getOHLCV(symbol: string, timeframe: Timeframe, limit?: number): Promise<OHLCVCandle[]>;
  getMarketStatus(marketType: MarketType): Promise<MarketStatus>;

  /** Optional — not every provider/plan exposes order book depth. */
  getOrderBook?(symbol: string): Promise<OrderBook>;
}
