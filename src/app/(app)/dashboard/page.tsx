import { TrendingUp, Coins, Users, Boxes, ArrowDownToLine, ArrowUpFromLine } from "lucide-react";
import { requireUser } from "@/lib/auth/dal";
import { prisma } from "@/lib/db/prisma";
import { getEffectiveRatesForDate, getTodayBusinessDate } from "@/services/gold-rate.service";
import { calculateGoldValue } from "@/services/gold-calculation.service";
import { formatDate } from "@/lib/format";
import { GoldRateSummary } from "@/components/dashboard/gold-rate-summary";
import { SystemStatus, type SystemStatusItem } from "@/components/dashboard/system-status";
import { FutureMetricCard } from "@/components/dashboard/future-metric-card";
import { GoldCalculator } from "@/components/calculator/gold-calculator";

export const metadata = {
  title: "Dashboard | Zarghoon Jewellers",
};

async function checkDatabase(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}

function checkCalculationEngine(): boolean {
  try {
    const result = calculateGoldValue({
      netWeight: 10,
      goldRate: 1,
      wastage: { type: "PERCENTAGE", wastagePercent: 5 },
    });
    return result.goldValue.toNumber() === 10.5;
  } catch {
    return false;
  }
}

export default async function DashboardPage() {
  const user = await requireUser();
  const businessDate = getTodayBusinessDate();

  const [rates, dbHealthy] = await Promise.all([
    getEffectiveRatesForDate(businessDate),
    checkDatabase(),
  ]);

  const statusItems: SystemStatusItem[] = [
    { label: "Database", operational: dbHealthy, detail: "PostgreSQL connection" },
    { label: "Authentication", operational: !!user, detail: "Session & authorization" },
    {
      label: "Gold Rate Engine",
      operational: checkCalculationEngine(),
      detail: "Weight & pricing calculations",
    },
  ];

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 sm:p-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-foreground">
          Welcome back, {user.name.split(" ")[0]}
        </h1>
        <p className="text-sm text-muted-foreground">{formatDate(new Date())}</p>
      </div>

      <GoldRateSummary rates={rates} />

      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Coming in upcoming phases
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <FutureMetricCard icon={TrendingUp} label="Today's Sales" />
          <FutureMetricCard icon={Coins} label="Gold Sold" />
          <FutureMetricCard icon={Users} label="Customers" />
          <FutureMetricCard icon={Boxes} label="Inventory Value" />
          <FutureMetricCard icon={ArrowDownToLine} label="Receivables" />
          <FutureMetricCard icon={ArrowUpFromLine} label="Payables" />
        </div>
      </div>

      <GoldCalculator
        rates={rates.map((rate) => ({ purity: rate.purity, ratePerGram: rate.ratePerGram.toString() }))}
      />

      <SystemStatus items={statusItems} />
    </div>
  );
}
