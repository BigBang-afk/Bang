import type { Candle } from "../types";

const MAX_HISTORY = 500;

export type StoreEvent = "closed" | "tick" | "reset";
export type StoreListener = (event: StoreEvent, payload?: Candle) => void;

/**
 * Historical Candle Store.
 *
 * Holds the immutable sequence of closed, real market candles plus the
 * single currently-forming ("live") real candle. This is the sole source
 * of truth the Prediction Engine and Chart Renderer read from — both see
 * exactly the same real market data.
 */
export class CandleStore {
  private closed: Candle[] = [];
  private live: Candle | null = null;
  private listeners = new Set<StoreListener>();

  subscribe(listener: StoreListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(event: StoreEvent, payload?: Candle) {
    this.listeners.forEach((l) => l(event, payload));
  }

  reset(closed: Candle[], live: Candle | null) {
    this.closed = closed.slice(-MAX_HISTORY);
    this.live = live;
    this.emit("reset");
  }

  /** Apply an incoming real-time update from the market data feed. */
  applyKline(candle: Candle, isFinal: boolean) {
    if (isFinal) {
      // A live candle just closed on the exchange — it becomes permanent history.
      if (this.closed.length > 0 && this.closed[this.closed.length - 1].time === candle.time) {
        this.closed[this.closed.length - 1] = candle;
      } else {
        this.closed.push(candle);
        if (this.closed.length > MAX_HISTORY) this.closed.shift();
      }
      this.live = null;
      this.emit("closed", candle);
    } else {
      this.live = candle;
      this.emit("tick", candle);
    }
  }

  getClosed(): readonly Candle[] {
    return this.closed;
  }

  getLive(): Candle | null {
    return this.live;
  }

  /** All real candles (closed history + the forming live candle, if any), oldest first. */
  getAllReal(): Candle[] {
    return this.live ? [...this.closed, this.live] : [...this.closed];
  }

  getLastClosed(): Candle | null {
    return this.closed.length > 0 ? this.closed[this.closed.length - 1] : null;
  }
}
