import { EventEmitter } from "events";
import { INSTRUMENTS } from "./instruments";

export interface PriceTick {
  symbol: string;
  price: number;
  ts: number; // epoch ms
}

export interface Candle {
  time: number; // epoch seconds, bucket start
  open: number;
  high: number;
  low: number;
  close: number;
}

const CANDLE_INTERVAL_SEC = 60;
const MAX_CANDLES = 500;
// A tick older than this can no longer be considered "live" for the purposes
// of opening or settling a real-money trade.
const MAX_TICK_AGE_MS = 15_000;

class FeedManager extends EventEmitter {
  private latest = new Map<string, PriceTick>();
  private candles = new Map<string, Candle[]>();

  ingest(symbol: string, price: number, ts: number = Date.now()) {
    if (!Number.isFinite(price) || price <= 0) return;
    this.latest.set(symbol, { symbol, price, ts });
    this.updateCandle(symbol, price, ts);
    const tick: PriceTick = { symbol, price, ts };
    this.emit("tick", tick);
  }

  private updateCandle(symbol: string, price: number, ts: number) {
    const bucket = Math.floor(ts / 1000 / CANDLE_INTERVAL_SEC) * CANDLE_INTERVAL_SEC;
    const list = this.candles.get(symbol) ?? [];
    const last = list[list.length - 1];
    if (last && last.time === bucket) {
      last.high = Math.max(last.high, price);
      last.low = Math.min(last.low, price);
      last.close = price;
    } else {
      list.push({ time: bucket, open: price, high: price, low: price, close: price });
      if (list.length > MAX_CANDLES) list.shift();
    }
    this.candles.set(symbol, list);
  }

  getCandles(symbol: string): Candle[] {
    return this.candles.get(symbol) ?? [];
  }

  /** Returns a live price, or throws if the feed for this symbol is down/stale. */
  getLivePrice(symbol: string): PriceTick {
    const tick = this.latest.get(symbol);
    if (!tick) {
      throw new Error(`No live price available for ${symbol}`);
    }
    if (Date.now() - tick.ts > MAX_TICK_AGE_MS) {
      throw new Error(`Price feed for ${symbol} is stale`);
    }
    return tick;
  }

  isLive(symbol: string): boolean {
    try {
      this.getLivePrice(symbol);
      return true;
    } catch {
      return false;
    }
  }

  getAllLive(): PriceTick[] {
    return INSTRUMENTS.map((i) => this.latest.get(i.symbol)).filter((t): t is PriceTick => !!t);
  }
}

export const feedManager = new FeedManager();
