import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAccount } from "@/lib/require-auth";
import { prisma } from "@/lib/prisma";
import { toNumber, formatUsd } from "@/lib/money";
import { formatDate } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { ResultBadge } from "@/components/ui/badge";
import { JournalForm } from "./journal-form";
import { ChevronLeft, ChevronRight } from "lucide-react";

export default async function JournalDayPage({ params }: { params: Promise<{ date: string }> }) {
  const { date: dateStr } = await params;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) notFound();

  const { account } = await requireAccount();
  const date = new Date(`${dateStr}T00:00:00`);
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + 1);
  const prevDay = new Date(date);
  prevDay.setDate(prevDay.getDate() - 1);
  const nextDay = new Date(date);
  nextDay.setDate(nextDay.getDate() + 1);

  const [journal, trades] = await Promise.all([
    prisma.dailyJournal.findUnique({ where: { tradingAccountId_date: { tradingAccountId: account.id, date } } }),
    prisma.trade.findMany({
      where: { tradingAccountId: account.id, deletedAt: null, date: { gte: date, lt: nextDate } },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const dayNet = trades.reduce((sum, t) => sum + toNumber(t.netPnlUsd), 0);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">{formatDate(date, { weekday: "long" })}</h1>
          <p className={`text-sm ${dayNet >= 0 ? "text-positive" : "text-negative"}`}>
            {trades.length} trade{trades.length === 1 ? "" : "s"} · {formatUsd(dayNet, { showSign: true })}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/journal/${prevDay.toISOString().slice(0, 10)}`}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-border-strong hover:bg-surface-hover"
          >
            <ChevronLeft size={16} />
          </Link>
          <Link
            href={`/journal/${nextDay.toISOString().slice(0, 10)}`}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-border-strong hover:bg-surface-hover"
          >
            <ChevronRight size={16} />
          </Link>
        </div>
      </div>

      {trades.length > 0 && (
        <Card>
          <CardContent className="space-y-2 p-4">
            {trades.map((t) => (
              <Link
                key={t.id}
                href={`/trades/${t.id}/edit`}
                className="flex items-center justify-between rounded-lg bg-surface-2 px-3 py-2 text-sm hover:bg-surface-hover"
              >
                <span className="font-medium">{t.symbol}</span>
                <span className="text-muted">{t.direction}</span>
                <span className={toNumber(t.netPnlUsd) >= 0 ? "text-positive" : "text-negative"}>
                  {formatUsd(toNumber(t.netPnlUsd), { showSign: true })}
                </span>
                <ResultBadge result={t.result as "WIN" | "LOSS" | "BREAKEVEN"} />
              </Link>
            ))}
          </CardContent>
        </Card>
      )}

      <JournalForm
        date={dateStr}
        initial={{
          todaysGoal: journal?.todaysGoal ?? "",
          marketOutlook: journal?.marketOutlook ?? "",
          tradingPlan: journal?.tradingPlan ?? "",
          whatWentWell: journal?.whatWentWell ?? "",
          whatWentWrong: journal?.whatWentWrong ?? "",
          mistakes: journal?.mistakes ?? "",
          lessonsLearned: journal?.lessonsLearned ?? "",
          emotionalState: journal?.emotionalState ?? "",
          confidence: journal?.confidence?.toString() ?? "",
          disciplineScore: journal?.disciplineScore?.toString() ?? "",
          emotionalControlScore: journal?.emotionalControlScore?.toString() ?? "",
          executionScore: journal?.executionScore?.toString() ?? "",
          riskManagementScore: journal?.riskManagementScore?.toString() ?? "",
          overallScore: journal?.overallScore?.toString() ?? "",
          screenshotUrl: journal?.screenshotUrl ?? null,
          tomorrowsImprovement: journal?.tomorrowsImprovement ?? "",
        }}
      />
    </div>
  );
}
