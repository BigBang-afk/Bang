import Link from "next/link";
import { requireAccount } from "@/lib/require-auth";
import { prisma } from "@/lib/prisma";
import { toNumber, formatUsd, formatPkr, formatGrams, formatPct } from "@/lib/money";
import { getCurrentGoalValue, getMonthlyTargetProgress } from "@/lib/goals-data";
import { formatDate, toDateInputValue } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { AddGoalButton, EditGoalButton, DeleteGoalButton, ToggleAchievedButton } from "./goal-modal";
import { MonthlyTargetForm } from "./monthly-target-form";
import { ChevronLeft, ChevronRight } from "lucide-react";

function formatByUnit(value: number, unit: string): string {
  if (unit === "PKR") return formatPkr(value);
  if (unit === "GRAMS") return formatGrams(value);
  return formatUsd(value);
}

export default async function GoalsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; my?: string; mm?: string }>;
}) {
  const params = await searchParams;
  const { account, settings } = await requireAccount();
  const activeTab = params.tab ?? "goals";

  const now = new Date();
  const year = Number(params.my) || now.getFullYear();
  const month = Number(params.mm) || now.getMonth() + 1;

  const rate = toNumber(settings.usdToPkrRate);
  const goldPrice = toNumber(settings.goldPricePerGramPkr);

  const goals = await prisma.goal.findMany({ where: { tradingAccountId: account.id }, orderBy: { createdAt: "desc" } });
  const goalsWithProgress = await Promise.all(
    goals.map(async (g) => {
      const current =
        g.type === "CUSTOM" ? toNumber(g.startValue) : await getCurrentGoalValue(account.id, g.type, g.unit, rate, goldPrice);
      const target = toNumber(g.targetValue);
      const start = toNumber(g.startValue);
      const span = target - start;
      const progress = span !== 0 ? Math.min(100, Math.max(0, ((current - start) / span) * 100)) : 0;
      return { ...g, current, progress };
    })
  );

  const monthlyTarget = await prisma.monthlyTarget.findUnique({
    where: { tradingAccountId_month_year: { tradingAccountId: account.id, month, year } },
  });
  const monthProgress = await getMonthlyTargetProgress(account.id, month, year);
  const prevMonth = month === 1 ? { my: year - 1, mm: 12 } : { my: year, mm: month - 1 };
  const nextMonth = month === 12 ? { my: year + 1, mm: 1 } : { my: year, mm: month + 1 };
  const monthLabel = new Date(year, month - 1, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Goals</h1>
          <p className="text-sm text-muted">Track long-term targets and monthly discipline.</p>
        </div>
        {activeTab === "goals" && <AddGoalButton />}
      </div>

      <Tabs tabs={[{ value: "goals", label: "Goals" }, { value: "monthly", label: "Monthly Targets" }]} defaultTab="goals" />

      {activeTab === "goals" && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {goalsWithProgress.map((g) => (
            <Card key={g.id} className="p-5">
              <div className="mb-3 flex items-start justify-between">
                <div>
                  <p className="text-sm font-semibold">{g.title}</p>
                  <p className="text-xs text-muted">{g.type.replace("_", " ")}</p>
                </div>
                <div className="flex gap-1">
                  <ToggleAchievedButton id={g.id} achieved={g.achieved} />
                  <EditGoalButton
                    goal={{
                      id: g.id,
                      type: g.type,
                      title: g.title,
                      targetValue: toNumber(g.targetValue),
                      startValue: toNumber(g.startValue),
                      unit: g.unit,
                      targetDate: g.targetDate ? toDateInputValue(g.targetDate) : "",
                      notes: g.notes ?? "",
                    }}
                  />
                  <DeleteGoalButton id={g.id} />
                </div>
              </div>
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="font-semibold">{formatByUnit(g.current, g.unit)}</span>
                <span className="text-muted">of {formatByUnit(toNumber(g.targetValue), g.unit)}</span>
              </div>
              <Progress value={g.progress} colorClassName={g.achieved || g.progress >= 100 ? "bg-positive" : "bg-accent"} />
              <div className="mt-2 flex items-center justify-between text-xs text-muted">
                <span>{formatPct(g.progress)}</span>
                {g.achieved && <Badge variant="positive">Achieved</Badge>}
                {g.targetDate && <span>{formatDate(g.targetDate)}</span>}
              </div>
            </Card>
          ))}
          {goalsWithProgress.length === 0 && (
            <Card className="p-8 text-center text-sm text-muted md:col-span-2 xl:col-span-3">
              No goals set yet. Create your first goal to start tracking progress.
            </Card>
          )}
        </div>
      )}

      {activeTab === "monthly" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">{monthLabel}</p>
            <div className="flex gap-2">
              <Link href={`/goals?tab=monthly&my=${prevMonth.my}&mm=${prevMonth.mm}`} className="flex h-8 w-8 items-center justify-center rounded-lg border border-border-strong hover:bg-surface-hover">
                <ChevronLeft size={14} />
              </Link>
              <Link href={`/goals?tab=monthly&my=${nextMonth.my}&mm=${nextMonth.mm}`} className="flex h-8 w-8 items-center justify-center rounded-lg border border-border-strong hover:bg-surface-hover">
                <ChevronRight size={14} />
              </Link>
            </div>
          </div>

          <MonthlyTargetForm
            month={month}
            year={year}
            initial={{
              startingCapital: monthlyTarget ? toNumber(monthlyTarget.startingCapital) : 0,
              targetProfit: monthlyTarget ? toNumber(monthlyTarget.targetProfit) : 0,
              maxDrawdownPct: monthlyTarget ? toNumber(monthlyTarget.maxDrawdownPct) : 10,
              withdrawalGoal: monthlyTarget?.withdrawalGoal ? toNumber(monthlyTarget.withdrawalGoal) : null,
              goldPurchaseGoalGrams: monthlyTarget?.goldPurchaseGoalGrams ? toNumber(monthlyTarget.goldPurchaseGoalGrams) : null,
              savingsGoal: monthlyTarget?.savingsGoal ? toNumber(monthlyTarget.savingsGoal) : null,
            }}
          />

          {monthlyTarget && (
            <Card>
              <CardContent className="space-y-4 p-5">
                <p className="text-sm font-semibold">Progress This Month</p>
                <ProgressRow label="Profit" current={monthProgress.actualProfit} target={toNumber(monthlyTarget.targetProfit)} format={formatUsd} />
                <ProgressRow
                  label="Drawdown (lower is better)"
                  current={monthProgress.actualMaxDrawdownPct}
                  target={toNumber(monthlyTarget.maxDrawdownPct)}
                  format={(v) => formatPct(v)}
                  inverse
                />
                {monthlyTarget.withdrawalGoal && (
                  <ProgressRow label="Withdrawals" current={monthProgress.actualWithdrawn} target={toNumber(monthlyTarget.withdrawalGoal)} format={formatUsd} />
                )}
                {monthlyTarget.goldPurchaseGoalGrams && (
                  <ProgressRow label="Gold Purchased" current={monthProgress.actualGoldPurchased} target={toNumber(monthlyTarget.goldPurchaseGoalGrams)} format={(v) => formatGrams(v)} />
                )}
                {monthlyTarget.savingsGoal && (
                  <ProgressRow label="Savings" current={monthProgress.actualSavings} target={toNumber(monthlyTarget.savingsGoal)} format={formatUsd} />
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

function ProgressRow({
  label,
  current,
  target,
  format,
  inverse = false,
}: {
  label: string;
  current: number;
  target: number;
  format: (v: number) => string;
  inverse?: boolean;
}) {
  const pct = target !== 0 ? Math.min(100, Math.max(0, (current / target) * 100)) : 0;
  const overLimit = inverse && current > target;
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="text-muted">{label}</span>
        <span className="font-medium">
          {format(current)} / {format(target)}
        </span>
      </div>
      <Progress value={pct} colorClassName={overLimit ? "bg-negative" : "bg-accent"} />
    </div>
  );
}
