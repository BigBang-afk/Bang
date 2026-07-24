// Ported from backend/app/services/order_flow.py — only the pieces the signal engine
// actually scores (bid/ask imbalance, absorption).

export interface OrderBook {
  bids: [string, string][];
  asks: [string, string][];
}

export interface TradePrint {
  price: number;
  qty: number;
  side: "buy" | "sell";
}

export function bidAskImbalance(orderBook: OrderBook, depth = 20) {
  const bids = orderBook.bids.slice(0, depth);
  const asks = orderBook.asks.slice(0, depth);

  const bidVolume = bids.reduce((sum, [, qty]) => sum + parseFloat(qty), 0);
  const askVolume = asks.reduce((sum, [, qty]) => sum + parseFloat(qty), 0);
  const total = bidVolume + askVolume;

  const imbalancePct = total ? ((bidVolume - askVolume) / total) * 100 : 0;
  const bias = imbalancePct > 5 ? "buyers" : imbalancePct < -5 ? "sellers" : "balanced";

  return { bidVolume, askVolume, imbalancePct, bias };
}

export function cumulativeDelta(trades: TradePrint[]): number {
  return trades.reduce((delta, t) => delta + (t.side === "buy" ? t.qty : -t.qty), 0);
}

export function detectAbsorption(trades: TradePrint[], priceMoveThresholdPct = 0.1) {
  if (trades.length < 2) return { absorptionDetected: false, volume: 0, priceMovePct: 0, delta: 0, sideAbsorbed: null as string | null };

  const prices = trades.map((t) => t.price);
  const volume = trades.reduce((sum, t) => sum + t.qty, 0);
  const priceMovePct = prices[0] ? (Math.abs(prices[prices.length - 1] - prices[0]) / prices[0]) * 100 : 0;
  const delta = cumulativeDelta(trades);
  const highVolume = volume > 0 && priceMovePct < priceMoveThresholdPct;

  return {
    absorptionDetected: highVolume,
    volume,
    priceMovePct,
    delta,
    sideAbsorbed: delta > 0 && highVolume ? "sellers" : delta < 0 && highVolume ? "buyers" : null,
  };
}
