import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { toNumber } from "@/lib/money";
import { toDateInputValue } from "@/lib/utils";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const account = user.tradingAccounts[0];
  if (!account) return NextResponse.json({ results: [] });

  const url = new URL(request.url);
  const q = url.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return NextResponse.json({ results: [] });

  const tradingAccountId = account.id;
  const take = 5;

  const [trades, strategies, journals, withdrawals, expenses, goldTx] = await Promise.all([
    prisma.trade.findMany({
      where: {
        tradingAccountId,
        deletedAt: null,
        OR: [{ symbol: { contains: q } }, { notes: { contains: q } }, { id: q }],
      },
      take,
      orderBy: { date: "desc" },
    }),
    prisma.strategy.findMany({ where: { tradingAccountId, name: { contains: q } }, take }),
    prisma.dailyJournal.findMany({
      where: {
        tradingAccountId,
        OR: [
          { todaysGoal: { contains: q } },
          { whatWentWell: { contains: q } },
          { whatWentWrong: { contains: q } },
          { mistakes: { contains: q } },
          { lessonsLearned: { contains: q } },
        ],
      },
      take,
      orderBy: { date: "desc" },
    }),
    prisma.withdrawal.findMany({
      where: { tradingAccountId, OR: [{ purpose: { contains: q } }, { notes: { contains: q } }] },
      take,
      orderBy: { date: "desc" },
    }),
    prisma.expense.findMany({
      where: { tradingAccountId, OR: [{ description: { contains: q } }, { notes: { contains: q } }] },
      take,
      orderBy: { date: "desc" },
    }),
    prisma.goldTransaction.findMany({
      where: { tradingAccountId, OR: [{ dealer: { contains: q } }, { notes: { contains: q } }, { goldType: { contains: q } }] },
      take,
      orderBy: { date: "desc" },
    }),
  ]);

  const results = [
    ...trades.map((t) => ({
      type: "Trade",
      id: t.id,
      title: `${t.symbol} · ${t.direction}`,
      subtitle: `${toDateInputValue(t.date)} · ${toNumber(t.netPnlUsd) >= 0 ? "+" : ""}$${toNumber(t.netPnlUsd).toFixed(2)}`,
      href: `/trades/${t.id}/edit`,
    })),
    ...strategies.map((s) => ({ type: "Strategy", id: s.id, title: s.name, subtitle: s.description ?? "", href: `/strategies` })),
    ...journals.map((j) => ({
      type: "Journal",
      id: j.id,
      title: toDateInputValue(j.date),
      subtitle: (j.todaysGoal || j.whatWentWell || j.mistakes || "").slice(0, 60),
      href: `/journal/${toDateInputValue(j.date)}`,
    })),
    ...withdrawals.map((w) => ({
      type: "Withdrawal",
      id: w.id,
      title: `${toDateInputValue(w.date)} · $${toNumber(w.amountUsd).toFixed(2)}`,
      subtitle: w.purpose ?? w.destination,
      href: `/withdrawals`,
    })),
    ...expenses.map((e) => ({
      type: "Expense",
      id: e.id,
      title: e.description || e.category,
      subtitle: `Rs. ${toNumber(e.amountPkr).toFixed(0)}`,
      href: `/expenses`,
    })),
    ...goldTx.map((g) => ({
      type: "Gold Purchase",
      id: g.id,
      title: `${toNumber(g.weightGrams)}g · ${g.purity}`,
      subtitle: g.dealer ?? "",
      href: `/gold`,
    })),
  ];

  return NextResponse.json({ results });
}
