import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { buildTradeWhere } from "@/lib/trade-filters";
import { toNumber } from "@/lib/money";
import { toDateInputValue } from "@/lib/utils";

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const account = user.tradingAccounts[0];
  if (!account) return NextResponse.json({ error: "No trading account" }, { status: 400 });

  const url = new URL(request.url);
  const params = Object.fromEntries(url.searchParams.entries());
  const where = buildTradeWhere(account.id, params);

  const trades = await prisma.trade.findMany({
    where,
    orderBy: { date: "desc" },
    include: { strategy: true },
  });

  const headers = [
    "Date",
    "Time",
    "Session",
    "Broker",
    "Market",
    "Symbol",
    "Direction",
    "Entry",
    "Exit",
    "Size",
    "Risk USD",
    "Stop Loss",
    "Take Profit",
    "Planned RR",
    "Gross P&L USD",
    "Fees USD",
    "Net P&L USD",
    "Net P&L PKR",
    "Gold Equivalent (g)",
    "Strategy",
    "Setup",
    "Timeframe",
    "Result",
    "Notes",
  ];

  const rows = trades.map((t) =>
    [
      toDateInputValue(t.date),
      t.time ?? "",
      t.session ?? "",
      t.broker ?? "",
      t.marketType,
      t.symbol,
      t.direction,
      t.entryPrice ? toNumber(t.entryPrice) : "",
      t.exitPrice ? toNumber(t.exitPrice) : "",
      t.positionSize ? toNumber(t.positionSize) : "",
      t.riskUsd ? toNumber(t.riskUsd) : "",
      t.stopLoss ? toNumber(t.stopLoss) : "",
      t.takeProfit ? toNumber(t.takeProfit) : "",
      t.plannedRR ? toNumber(t.plannedRR) : "",
      toNumber(t.grossPnlUsd),
      toNumber(t.feesUsd),
      toNumber(t.netPnlUsd),
      toNumber(t.pnlPkr),
      toNumber(t.goldEquivalentG),
      t.strategy?.name ?? "",
      t.setup ?? "",
      t.timeframe ?? "",
      t.result,
      t.notes ?? "",
    ]
      .map((v) => csvEscape(String(v)))
      .join(",")
  );

  const csv = [headers.join(","), ...rows].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="trades-export-${toDateInputValue(new Date())}.csv"`,
    },
  });
}
