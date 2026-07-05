export type AssetClass = "CRYPTO" | "FOREX" | "STOCK";

export interface Instrument {
  symbol: string; // canonical display symbol, e.g. "BTC/USDT"
  assetClass: AssetClass;
  binanceSymbol?: string; // lowercase, no slash, e.g. "btcusdt"
  twelveDataSymbol?: string; // e.g. "EUR/USD" or "AAPL"
  payoutRatio: number; // fraction of stake paid as profit on a win
}

export const INSTRUMENTS: Instrument[] = [
  { symbol: "BTC/USDT", assetClass: "CRYPTO", binanceSymbol: "btcusdt", payoutRatio: 0.85 },
  { symbol: "ETH/USDT", assetClass: "CRYPTO", binanceSymbol: "ethusdt", payoutRatio: 0.85 },
  { symbol: "SOL/USDT", assetClass: "CRYPTO", binanceSymbol: "solusdt", payoutRatio: 0.82 },
  { symbol: "EUR/USD", assetClass: "FOREX", twelveDataSymbol: "EUR/USD", payoutRatio: 0.8 },
  { symbol: "GBP/USD", assetClass: "FOREX", twelveDataSymbol: "GBP/USD", payoutRatio: 0.8 },
  { symbol: "USD/JPY", assetClass: "FOREX", twelveDataSymbol: "USD/JPY", payoutRatio: 0.8 },
  { symbol: "AAPL", assetClass: "STOCK", twelveDataSymbol: "AAPL", payoutRatio: 0.75 },
  { symbol: "TSLA", assetClass: "STOCK", twelveDataSymbol: "TSLA", payoutRatio: 0.75 },
];

export function findInstrument(symbol: string): Instrument | undefined {
  return INSTRUMENTS.find((i) => i.symbol === symbol);
}
