import type { Candle, FeedStatus, Interval } from "../types";

/**
 * Market Data Feed layer.
 *
 * Provider: Kraken public Spot Market API (https://kraken.com) — a
 * US-licensed, regulated cryptocurrency exchange.
 * - Historical candles: REST `/0/public/OHLC`
 * - Live candles: WebSocket v2 `wss://ws.kraken.com/v2`, `ohlc` channel
 *
 * This is genuine, unauthenticated public market data streamed directly
 * from a live exchange order book — no simulation, no random generation,
 * no delayed "demo" feed. If the feed cannot be reached or returns bad
 * data, callers must surface an error instead of inventing candles.
 */

export const DATA_PROVIDER = "Kraken (Live Spot Market)";

const REST_BASE = "https://api.kraken.com";
const WS_URL = "wss://ws.kraken.com/v2";

const INTERVAL_MINUTES: Record<Interval, number> = { "1m": 1, "5m": 5 };

export async function fetchHistoricalCandles(
  symbol: string,
  interval: Interval,
  limit = 300,
): Promise<{ closed: Candle[]; live: Candle | null }> {
  const minutes = INTERVAL_MINUTES[interval];
  const url = `${REST_BASE}/0/public/OHLC?pair=${encodeURIComponent(symbol)}&interval=${minutes}`;
  let res: Response;
  try {
    res = await fetch(url);
  } catch (err) {
    throw new Error(`Unable to reach Kraken market data API: ${(err as Error).message}`);
  }
  if (!res.ok) {
    throw new Error(`Kraken REST API error (${res.status}): failed to load historical candles for ${symbol}`);
  }
  const json = (await res.json()) as { error?: string[]; result?: Record<string, unknown> };
  if (json.error && json.error.length > 0) {
    throw new Error(`Kraken API error: ${json.error.join(", ")}`);
  }
  const resultKey = Object.keys(json.result ?? {}).find((k) => k !== "last");
  const rows = resultKey ? (json.result?.[resultKey] as (string | number)[][]) : undefined;
  if (!rows || rows.length === 0) {
    throw new Error(`Kraken returned no market data for ${symbol}/${interval}`);
  }

  const now = Date.now();
  const intervalMs = minutes * 60 * 1000;
  const closed: Candle[] = [];
  let live: Candle | null = null;
  const trimmed = rows.slice(-limit);

  trimmed.forEach((r, idx) => {
    const time = Number(r[0]);
    const candle: Candle = {
      time,
      open: parseFloat(String(r[1])),
      high: parseFloat(String(r[2])),
      low: parseFloat(String(r[3])),
      close: parseFloat(String(r[4])),
      volume: parseFloat(String(r[6])),
    };
    const isLast = idx === trimmed.length - 1;
    if (isLast && time * 1000 + intervalMs > now) {
      live = candle;
    } else {
      closed.push(candle);
    }
  });

  return { closed, live };
}

interface KrakenOhlcItem {
  symbol: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  interval_begin: string;
}

interface KrakenOhlcMessage {
  channel: string;
  type?: string;
  data?: KrakenOhlcItem[];
}

export type KlineHandler = (candle: Candle, isFinal: boolean) => void;
export type StatusHandler = (status: FeedStatus, detail?: string) => void;

/**
 * Wraps a single Kraken `ohlc` WebSocket subscription. Kraken streams
 * continuous updates for the currently-forming interval (no explicit
 * "closed" flag), so this class detects a candle close itself: once an
 * update arrives for a new `interval_begin`, the previous interval's last
 * known state is emitted as final (isFinal=true) and the new interval
 * begins as a live tick (isFinal=false). No values are invented — every
 * emitted candle is built entirely from real trade data Kraken reported.
 */
export class KrakenLiveFeed {
  private ws: WebSocket | null = null;
  private klineHandlers = new Set<KlineHandler>();
  private statusHandlers = new Set<StatusHandler>();
  private reconnectTimer: number | null = null;
  private reconnectAttempts = 0;
  private closedByUser = false;
  private currentSymbol = "";
  private currentInterval: Interval = "1m";

  private lastBeginSec: number | null = null;
  private lastCandle: Candle | null = null;

  onKline(handler: KlineHandler): () => void {
    this.klineHandlers.add(handler);
    return () => this.klineHandlers.delete(handler);
  }

  onStatus(handler: StatusHandler): () => void {
    this.statusHandlers.add(handler);
    return () => this.statusHandlers.delete(handler);
  }

  private emitStatus(status: FeedStatus, detail?: string) {
    this.statusHandlers.forEach((h) => h(status, detail));
  }

  private emitKline(candle: Candle, isFinal: boolean) {
    this.klineHandlers.forEach((h) => h(candle, isFinal));
  }

  connect(symbol: string, interval: Interval) {
    this.disconnect();
    this.closedByUser = false;
    this.currentSymbol = symbol;
    this.currentInterval = interval;
    this.reconnectAttempts = 0;
    this.lastBeginSec = null;
    this.lastCandle = null;
    this.open();
  }

  private open() {
    this.emitStatus(this.reconnectAttempts > 0 ? "reconnecting" : "connecting");

    let socket: WebSocket;
    try {
      socket = new WebSocket(WS_URL);
    } catch (err) {
      this.emitStatus("error", `Failed to open live feed: ${(err as Error).message}`);
      this.scheduleReconnect();
      return;
    }
    this.ws = socket;

    socket.onopen = () => {
      this.reconnectAttempts = 0;
      this.emitStatus("connected");
      socket.send(
        JSON.stringify({
          method: "subscribe",
          params: {
            channel: "ohlc",
            symbol: [this.currentSymbol],
            interval: INTERVAL_MINUTES[this.currentInterval],
          },
        }),
      );
    };

    socket.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data) as KrakenOhlcMessage;
        if (msg.channel !== "ohlc" || msg.type !== "update" || !msg.data) return;
        for (const item of msg.data) {
          this.handleOhlcItem(item);
        }
      } catch {
        // Malformed message from feed — ignore this tick rather than fabricate data.
      }
    };

    socket.onerror = () => {
      this.emitStatus("error", "Live market feed connection error");
    };

    socket.onclose = () => {
      if (!this.closedByUser) {
        this.scheduleReconnect();
      }
    };
  }

  private handleOhlcItem(item: KrakenOhlcItem) {
    const beginSec = Math.floor(Date.parse(item.interval_begin) / 1000);
    if (!Number.isFinite(beginSec)) return;

    const candle: Candle = {
      time: beginSec,
      open: item.open,
      high: item.high,
      low: item.low,
      close: item.close,
      volume: item.volume,
    };

    if (this.lastBeginSec === null) {
      this.lastBeginSec = beginSec;
      this.lastCandle = candle;
      this.emitKline(candle, false);
      return;
    }

    if (beginSec === this.lastBeginSec) {
      this.lastCandle = candle;
      this.emitKline(candle, false);
      return;
    }

    if (beginSec > this.lastBeginSec) {
      if (this.lastCandle) this.emitKline(this.lastCandle, true);
      this.lastBeginSec = beginSec;
      this.lastCandle = candle;
      this.emitKline(candle, false);
    }
    // Ignore out-of-order updates for a stale, already-closed interval.
  }

  private scheduleReconnect() {
    if (this.closedByUser) return;
    this.reconnectAttempts += 1;
    const delay = Math.min(15000, 1000 * 2 ** Math.min(this.reconnectAttempts, 5));
    this.emitStatus("reconnecting", `Reconnecting to live feed in ${Math.round(delay / 1000)}s`);
    this.reconnectTimer = window.setTimeout(() => this.open(), delay);
  }

  disconnect() {
    this.closedByUser = true;
    if (this.reconnectTimer !== null) {
      window.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.onopen = null;
      this.ws.onmessage = null;
      this.ws.onerror = null;
      this.ws.onclose = null;
      this.ws.close();
      this.ws = null;
    }
  }
}
