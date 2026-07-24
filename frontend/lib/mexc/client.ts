// Server-side MEXC REST helpers used by Vercel Route Handlers. Public market-data
// endpoints only — no signed/account calls, since this deployment has no per-user
// credential storage (that requires the FastAPI backend + Postgres, see DEPLOYMENT.md).

import type { Candle } from "./indicators";
import type { OrderBook, TradePrint } from "./orderFlow";

const BASE_URL = "https://api.mexc.com";

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`MEXC API error ${res.status}: ${await res.text()}`);
  return res.json();
}

export async function getTickerPrice(symbol: string) {
  return get<{ symbol: string; price: string }>(`/api/v3/ticker/price?symbol=${symbol}`);
}

export async function getKlines(symbol: string, interval: string, limit = 300): Promise<Candle[]> {
  const rows = await get<(string | number)[][]>(`/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`);
  return rows.map((row) => ({
    time: Number(row[0]),
    open: parseFloat(String(row[1])),
    high: parseFloat(String(row[2])),
    low: parseFloat(String(row[3])),
    close: parseFloat(String(row[4])),
    volume: parseFloat(String(row[5])),
  }));
}

export async function getOrderBook(symbol: string, limit = 50): Promise<OrderBook> {
  return get<OrderBook>(`/api/v3/depth?symbol=${symbol}&limit=${limit}`);
}

export async function getRecentTrades(symbol: string, limit = 200): Promise<TradePrint[]> {
  const rows = await get<{ price: string; qty: string; isBuyerMaker: boolean }[]>(
    `/api/v3/trades?symbol=${symbol}&limit=${limit}`
  );
  return rows.map((t) => ({
    price: parseFloat(t.price),
    qty: parseFloat(t.qty),
    side: t.isBuyerMaker === false ? "buy" : "sell",
  }));
}
