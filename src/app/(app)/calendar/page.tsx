import Link from "next/link";
import { requireAccount } from "@/lib/require-auth";
import { prisma } from "@/lib/prisma";
import { toNumber, formatUsd } from "@/lib/money";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { ChevronLeft, ChevronRight } from "lucide-react";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ y?: string; m?: string }>;
}) {
  const params = await searchParams;
  const { account } = await requireAccount();

  const now = new Date();
  const year = Number(params.y) || now.getFullYear();
  const month = params.m ? Number(params.m) - 1 : now.getMonth();

  const startOfMonth = new Date(year, month, 1);
  const startOfNextMonth = new Date(year, month + 1, 1);

  const trades = await prisma.trade.findMany({
    where: { tradingAccountId: account.id, deletedAt: null, date: { gte: startOfMonth, lt: startOfNextMonth } },
    select: { date: true, netPnlUsd: true },
  });

  const dayMap = new Map<number, { net: number; count: number }>();
  for (const t of trades) {
    const day = t.date.getDate();
    const entry = dayMap.get(day) ?? { net: 0, count: 0 };
    entry.net += toNumber(t.netPnlUsd);
    entry.count += 1;
    dayMap.set(day, entry);
  }

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstWeekday = (startOfMonth.getDay() + 6) % 7; // Monday = 0

  const monthlyPnl = Array.from(dayMap.values()).reduce((s, d) => s + d.net, 0);
  const tradingDays = dayMap.size;
  const profitableDays = Array.from(dayMap.values()).filter((d) => d.net > 0).length;
  const losingDays = Array.from(dayMap.values()).filter((d) => d.net < 0).length;
  const breakevenDays = Array.from(dayMap.values()).filter((d) => d.net === 0).length;
  const dailyWinRate = tradingDays > 0 ? (profitableDays / tradingDays) * 100 : 0;

  const prevMonth = month === 0 ? { y: year - 1, m: 12 } : { y: year, m: month };
  const nextMonth = month === 11 ? { y: year + 1, m: 1 } : { y: year, m: month + 2 };
  const monthLabel = startOfMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const cells: (number | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Trading Calendar</h1>
          <p className="text-sm text-muted">{monthLabel}</p>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/calendar?y=${prevMonth.y}&m=${prevMonth.m}`}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-border-strong hover:bg-surface-hover"
          >
            <ChevronLeft size={16} />
          </Link>
          <Link
            href={`/calendar?y=${nextMonth.y}&m=${nextMonth.m}`}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-border-strong hover:bg-surface-hover"
          >
            <ChevronRight size={16} />
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Monthly P&L" value={formatUsd(monthlyPnl, { showSign: true })} tone={monthlyPnl >= 0 ? "positive" : "negative"} />
        <StatCard label="Trading Days" value={tradingDays} />
        <StatCard label="Profitable Days" value={profitableDays} tone="positive" />
        <StatCard label="Losing Days" value={losingDays} tone="negative" />
        <StatCard label="Breakeven Days" value={breakevenDays} />
        <StatCard label="Daily Win Rate" value={`${dailyWinRate.toFixed(1)}%`} tone="accent" />
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-7 gap-2 text-center text-xs font-medium text-muted">
            {WEEKDAYS.map((d) => (
              <div key={d}>{d}</div>
            ))}
          </div>
          <div className="mt-2 grid grid-cols-7 gap-2">
            {cells.map((day, i) => {
              if (day === null) return <div key={`empty-${i}`} />;
              const entry = dayMap.get(day);
              const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
              const isToday = isCurrentMonth && today.getDate() === day;
              return (
                <Link
                  key={day}
                  href={`/journal/${dateStr}`}
                  className={cn(
                    "flex h-20 flex-col rounded-lg border p-2 transition-colors hover:border-accent",
                    entry ? (entry.net > 0 ? "border-positive/30 bg-positive-bg" : entry.net < 0 ? "border-negative/30 bg-negative-bg" : "border-border bg-surface-2") : "border-border bg-surface-2",
                    isToday && "ring-1 ring-accent"
                  )}
                >
                  <span className="text-xs text-muted">{day}</span>
                  {entry && (
                    <>
                      <span
                        className={cn(
                          "mt-auto text-xs font-semibold",
                          entry.net > 0 ? "text-positive" : entry.net < 0 ? "text-negative" : "text-foreground"
                        )}
                      >
                        {formatUsd(entry.net, { showSign: true })}
                      </span>
                      <span className="text-[10px] text-muted">{entry.count} trade{entry.count === 1 ? "" : "s"}</span>
                    </>
                  )}
                </Link>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
