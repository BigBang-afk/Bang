"use client";

import { TVWidget } from "./tv-widget";

export function MarketOverview({ className = "h-[420px] w-full" }: { className?: string }) {
  return (
    <TVWidget
      className={className}
      scriptSrc="https://s3.tradingview.com/external-embedding/embed-widget-market-overview.js"
      config={{
        colorTheme: "dark",
        dateRange: "12M",
        showChart: true,
        locale: "en",
        isTransparent: true,
        autosize: true,
        showSymbolLogo: true,
        showFloatingTooltip: false,
        plotLineColorGrowing: "rgba(0, 230, 160, 1)",
        plotLineColorFalling: "rgba(255, 84, 112, 1)",
        gridLineColor: "rgba(255, 255, 255, 0.06)",
        scaleFontColor: "rgba(139, 147, 171, 1)",
        belowLineFillColorGrowing: "rgba(0, 230, 160, 0.12)",
        belowLineFillColorFalling: "rgba(255, 84, 112, 0.12)",
        symbolActiveColor: "rgba(0, 230, 160, 0.18)",
        tabs: [
          {
            title: "Crypto",
            symbols: [
              { s: "BITSTAMP:BTCUSD", d: "Bitcoin" },
              { s: "BITSTAMP:ETHUSD", d: "Ethereum" },
              { s: "COINBASE:SOLUSD", d: "Solana" },
              { s: "BINANCE:BNBUSD", d: "BNB" },
              { s: "BINANCE:XRPUSD", d: "XRP" },
            ],
          },
          {
            title: "Indices",
            symbols: [
              { s: "FOREXCOM:SPXUSD", d: "S&P 500" },
              { s: "FOREXCOM:NSXUSD", d: "Nasdaq 100" },
              { s: "FOREXCOM:DJI", d: "Dow 30" },
              { s: "INDEX:NKY", d: "Nikkei 225" },
            ],
          },
          {
            title: "Forex",
            symbols: [
              { s: "FX_IDC:EURUSD", d: "EUR/USD" },
              { s: "FX_IDC:GBPUSD", d: "GBP/USD" },
              { s: "FX_IDC:USDJPY", d: "USD/JPY" },
              { s: "FX_IDC:USDCAD", d: "USD/CAD" },
            ],
          },
        ],
      }}
    />
  );
}
