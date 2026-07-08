import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function GET() {
  const [totalSignals, wins, losses, pending, byPair, backtestRuns] = await Promise.all([
    prisma.signal.count(),
    prisma.signal.count({ where: { result: "WIN" } }),
    prisma.signal.count({ where: { result: "LOSS" } }),
    prisma.signal.count({ where: { result: "PENDING" } }),
    prisma.signal.groupBy({
      by: ["pair"],
      _count: { _all: true },
    }),
    prisma.backtestRun.findMany({ orderBy: { createdAt: "desc" }, take: 10 }),
  ]);

  const settled = wins + losses;
  const overallWinRate = settled > 0 ? (wins / settled) * 100 : 0;

  const perPairStats = await Promise.all(
    byPair.map(async (p) => {
      const pairWins = await prisma.signal.count({ where: { pair: p.pair, result: "WIN" } });
      const pairLosses = await prisma.signal.count({ where: { pair: p.pair, result: "LOSS" } });
      const pairSettled = pairWins + pairLosses;
      return {
        pair: p.pair,
        total: p._count._all,
        wins: pairWins,
        losses: pairLosses,
        winRate: pairSettled > 0 ? (pairWins / pairSettled) * 100 : 0,
      };
    })
  );

  return NextResponse.json({
    totalSignals,
    wins,
    losses,
    pending,
    overallWinRate,
    perPairStats,
    backtestRuns,
  });
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  if (searchParams.get("scope") === "history") {
    await prisma.signal.deleteMany({ where: { source: "LIVE" } });
    return NextResponse.json({ ok: true });
  }
  if (searchParams.get("scope") === "backtests") {
    await prisma.signal.deleteMany({ where: { source: "BACKTEST" } });
    await prisma.backtestRun.deleteMany({});
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: "Missing or invalid scope" }, { status: 400 });
}
