"use client";

import { TVWidget } from "./tv-widget";

const DEFAULT_SYMBOLS = [
  { proName: "BITSTAMP:BTCUSD", title: "BTC/USD" },
  { proName: "BITSTAMP:ETHUSD", title: "ETH/USD" },
  { proName: "FOREXCOM:SPXUSD", title: "S&P 500" },
  { proName: "FOREXCOM:NSXUSD", title: "Nasdaq 100" },
  { proName: "FX_IDC:EURUSD", title: "EUR/USD" },
  { proName: "NASDAQ:AAPL", title: "Apple" },
  { proName: "NASDAQ:TSLA", title: "Tesla" },
  { proName: "NASDAQ:NVDA", title: "NVIDIA" },
  { proName: "COINBASE:SOLUSD", title: "SOL/USD" },
  { proName: "TVC:GOLD", title: "Gold" },
];

export function TickerTape({ symbols = DEFAULT_SYMBOLS }: { symbols?: typeof DEFAULT_SYMBOLS }) {
  return (
    <TVWidget
      className="w-full"
      scriptSrc="https://s3.tradingview.com/external-embedding/embed-widget-ticker-tape.js"
      config={{
        symbols,
        showSymbolLogo: true,
        isTransparent: true,
        displayMode: "adaptive",
        colorTheme: "dark",
        locale: "en",
      }}
    />
  );
}
