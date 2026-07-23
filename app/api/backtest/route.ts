import { NextResponse } from "next/server";
import { fetchKrakenCandles, MAX_KRAKEN_BARS, SUPPORTED_PAIRS } from "@/lib/backtest/marketData";
import { parseOhlcCsv } from "@/lib/backtest/parseCsv";
import { runBacktest } from "@/lib/backtest/runBacktest";

export const runtime = "nodejs";
export const maxDuration = 60;

const PAIR_VALUES = new Set<string>(SUPPORTED_PAIRS.map((p) => p.value));

export async function POST(request: Request) {
  let body: { source?: string; pair?: string; count?: number; csv?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Expected JSON body." }, { status: 400 });
  }

  try {
    if (body.source === "kraken") {
      const pair = body.pair ?? "XBTUSD";
      if (!PAIR_VALUES.has(pair)) {
        return NextResponse.json({ error: "Unsupported pair." }, { status: 400 });
      }
      const count = Math.max(60, Math.min(MAX_KRAKEN_BARS, body.count ?? MAX_KRAKEN_BARS));
      const bars = await fetchKrakenCandles(pair, count);
      if (bars.length === 0) {
        return NextResponse.json(
          { error: "Kraken returned no data for that pair." },
          { status: 502 },
        );
      }
      const label = SUPPORTED_PAIRS.find((p) => p.value === pair)?.label ?? pair;
      const result = runBacktest(bars, `Kraken 1m — ${label} (real market data, not Quotex's feed)`);
      return NextResponse.json(result);
    }

    if (body.source === "csv") {
      const bars = parseOhlcCsv(body.csv ?? "");
      if (bars.length === 0) {
        return NextResponse.json(
          { error: "Couldn't parse any OHLC rows from that CSV." },
          { status: 400 },
        );
      }
      const result = runBacktest(bars, "Uploaded CSV data");
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: "source must be 'kraken' or 'csv'." }, { status: 400 });
  } catch (err) {
    console.error("backtest failed", err);
    const message = err instanceof Error ? err.message : "Backtest failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
