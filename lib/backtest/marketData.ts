import type { OhlcBar } from "./types";

export const SUPPORTED_PAIRS = [
  { value: "XBTUSD", label: "BTC/USD" },
  { value: "ETHUSD", label: "ETH/USD" },
  { value: "XRPUSD", label: "XRP/USD" },
  { value: "LTCUSD", label: "LTC/USD" },
] as const;

interface KrakenOhlcResponse {
  error: string[];
  result: Record<string, [number, string, string, string, string, string, string, number][]> & {
    last?: number;
  };
}

/** Practical ceiling for Kraken's public 1-minute OHLC endpoint: it always
 * returns roughly the most recent 720 bars for the interval, regardless of
 * how far back `since` is set — there's no deeper history to page into. */
export const MAX_KRAKEN_BARS = 700;

/** Fetches real 1-minute OHLC bars from Kraken's public API (no auth
 * required). This is real market data used as an honest proxy for testing
 * the pattern/level/trend engine — it is NOT Quotex's own price feed.
 * Quotex runs its own quotes (especially OTC/weekend synthetic pairs),
 * which aren't available through any public API. */
export async function fetchKrakenCandles(pair: string, targetCount: number): Promise<OhlcBar[]> {
  const url = new URL("https://api.kraken.com/0/public/OHLC");
  url.searchParams.set("pair", pair);
  url.searchParams.set("interval", "1");

  const res = await fetch(url.toString(), { cache: "no-store" });
  if (!res.ok) throw new Error(`Kraken API returned ${res.status}`);
  const json = (await res.json()) as KrakenOhlcResponse;

  if (json.error?.length) throw new Error(json.error.join("; "));

  const key = Object.keys(json.result).find((k) => k !== "last");
  if (!key) throw new Error("Unexpected Kraken response shape");

  const rows = json.result[key] ?? [];
  const bars: OhlcBar[] = rows.map((row) => ({
    time: row[0],
    open: Number(row[1]),
    high: Number(row[2]),
    low: Number(row[3]),
    close: Number(row[4]),
  }));

  return bars.slice(-targetCount);
}
