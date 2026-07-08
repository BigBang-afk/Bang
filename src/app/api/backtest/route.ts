import { NextRequest, NextResponse } from "next/server";
import { parseCandleCsv } from "@/lib/backtest/csv";
import { runBacktest } from "@/lib/backtest/runner";
import { prisma } from "@/lib/db/prisma";
import { ExpiryKey, Pair, PAIRS } from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file");
    const pair = form.get("pair") as Pair | null;
    const expiry = form.get("expiry") as ExpiryKey | null;

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Missing CSV file" }, { status: 400 });
    }
    if (!pair || !PAIRS.includes(pair)) {
      return NextResponse.json({ error: "Invalid or missing pair" }, { status: 400 });
    }
    if (!expiry || !["15s", "1m"].includes(expiry)) {
      return NextResponse.json({ error: "Invalid or missing expiry" }, { status: 400 });
    }

    const text = await file.text();
    const rows = parseCandleCsv(text);
    const summary = runBacktest(rows, pair, expiry);

    const run = await prisma.backtestRun.create({
      data: {
        pair,
        expiry: expiry === "15s" ? "SEC15" : "MIN1",
        totalTrades: summary.totalTrades,
        wins: summary.wins,
        losses: summary.losses,
        winRate: summary.winRate,
        avgConfidence: summary.avgConfidence,
        bestPair: summary.bestPair,
        worstPair: summary.worstPair,
        winStreak: summary.winStreak,
        lossStreak: summary.lossStreak,
      },
    });

    await prisma.signal.createMany({
      data: summary.trades.map((t) => ({
        pair: t.pair,
        expiry: expiry === "15s" ? "SEC15" : "MIN1",
        direction: t.direction,
        confidence: t.confidence,
        signalStrength: "Normal",
        riskLevel: "Medium",
        trendDirection: "-",
        candlePressure: "-",
        reason: t.reason,
        entryTime: new Date(t.time * 1000),
        expiryTime: new Date(t.time * 1000),
        result: t.result,
        source: "BACKTEST",
        backtestRunId: run.id,
      })),
    });

    return NextResponse.json({ runId: run.id, summary });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Backtest failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function GET() {
  const runs = await prisma.backtestRun.findMany({
    orderBy: { createdAt: "desc" },
    take: 20,
  });
  return NextResponse.json({ runs });
}
