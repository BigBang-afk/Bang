import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { getPeriodReport } from "@/lib/reports-data";
import { resolveReportRange } from "@/lib/date-range";
import { toDateInputValue } from "@/lib/utils";

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const account = user.tradingAccounts[0];
  if (!account || !user.settings) return NextResponse.json({ error: "No trading account" }, { status: 400 });

  const url = new URL(request.url);
  const { from, to, label } = resolveReportRange(
    url.searchParams.get("range") ?? undefined,
    url.searchParams.get("from") ?? undefined,
    url.searchParams.get("to") ?? undefined
  );

  const report = await getPeriodReport(account.id, from, to, user.settings.countBreakevenAsWin);

  const rows: [string, string][] = [
    ["Report Period", label],
    ["Starting Balance", report.startingBalance.toFixed(2)],
    ["Ending Balance", report.endingBalance.toFixed(2)],
    ["Deposits", report.deposits.toFixed(2)],
    ["Withdrawals", report.withdrawals.toFixed(2)],
    ["Gross Profit", report.grossProfit.toFixed(2)],
    ["Gross Loss", report.grossLoss.toFixed(2)],
    ["Fees", report.fees.toFixed(2)],
    ["Net Trading P&L", report.netTradingPnl.toFixed(2)],
    ["Return %", report.returnPct.toFixed(2)],
    ["Max Drawdown", report.maxDrawdown.toFixed(2)],
    ["Max Drawdown %", report.maxDrawdownPct.toFixed(2)],
    ["Total Trades", String(report.totalTrades)],
    ["Wins", String(report.wins)],
    ["Losses", String(report.losses)],
    ["Breakeven", String(report.breakeven)],
    ["Win Rate %", report.winRate.toFixed(2)],
    ["Avg Win", report.avgWin.toFixed(2)],
    ["Avg Loss", report.avgLoss.toFixed(2)],
    ["Avg Risk", report.avgRisk.toFixed(2)],
    ["Profit Factor", report.profitFactor === null ? "Infinity" : report.profitFactor.toFixed(2)],
    ["Best Strategy", report.bestStrategy ?? ""],
    ["Worst Strategy", report.worstStrategy ?? ""],
    ["Best Symbol", report.bestSymbol ?? ""],
    ["Worst Symbol", report.worstSymbol ?? ""],
    ["Gold Purchased (g)", report.goldPurchasedG.toFixed(4)],
    ["Savings", report.savingsUsd.toFixed(2)],
    ["Expenses (PKR)", report.expensesPkr.toFixed(2)],
    ["Net Worth Change", report.netWorthChangeUsd.toFixed(2)],
  ];

  const csv = ["Metric,Value", ...rows.map(([k, v]) => `${csvEscape(k)},${csvEscape(v)}`)].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="report-${toDateInputValue(new Date())}.csv"`,
    },
  });
}
