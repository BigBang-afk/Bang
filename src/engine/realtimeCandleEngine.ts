import { KrakenLiveFeed, fetchHistoricalCandles } from "../data/krakenFeed";
import { CandleStore } from "../data/candleStore";
import type { FeedStatus, Interval } from "../types";

export type EngineStatusListener = (status: FeedStatus, detail?: string) => void;

/**
 * Real-Time Candle Engine.
 *
 * Orchestrates the Market Data Feed -> Historical Candle Store pipeline:
 * loads historical candles for the selected pair/timeframe, then keeps the
 * store in sync with the live WebSocket feed. This is the only layer that
 * talks to the network; the Prediction Engine and Chart Renderer both read
 * from the CandleStore it maintains.
 */
export class RealtimeCandleEngine {
  readonly store = new CandleStore();
  private feed = new KrakenLiveFeed();
  private statusListeners = new Set<EngineStatusListener>();
  private unsubKline: (() => void) | null = null;
  private unsubStatus: (() => void) | null = null;
  private loadToken = 0;

  onStatus(listener: EngineStatusListener): () => void {
    this.statusListeners.add(listener);
    return () => this.statusListeners.delete(listener);
  }

  private emitStatus(status: FeedStatus, detail?: string) {
    this.statusListeners.forEach((l) => l(status, detail));
  }

  async start(symbol: string, interval: Interval) {
    const token = ++this.loadToken;
    this.feed.disconnect();
    this.unsubKline?.();
    this.unsubStatus?.();
    this.emitStatus("connecting", `Loading historical candles for ${symbol}`);

    try {
      const { closed, live } = await fetchHistoricalCandles(symbol, interval, 300);
      if (token !== this.loadToken) return; // a newer start() superseded this one
      this.store.reset(closed, live);
    } catch (err) {
      if (token !== this.loadToken) return;
      this.emitStatus("error", (err as Error).message);
      return;
    }

    this.unsubKline = this.feed.onKline((candle, isFinal) => {
      if (token !== this.loadToken) return;
      this.store.applyKline(candle, isFinal);
    });
    this.unsubStatus = this.feed.onStatus((status, detail) => {
      if (token !== this.loadToken) return;
      this.emitStatus(status, detail);
    });

    this.feed.connect(symbol, interval);
  }

  stop() {
    this.loadToken++;
    this.feed.disconnect();
    this.unsubKline?.();
    this.unsubStatus?.();
  }
}
