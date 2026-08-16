import { TrendingUp, Coins, Users, ArrowDownToLine, ArrowUpFromLine, Boxes, Wallet, UserCheck, Crown, UserX, Cake, HeartHandshake, TrendingUp as ProfitIcon } from "lucide-react";
import { requireUser } from "@/lib/auth/dal";
import { prisma } from "@/lib/db/prisma";
import { getEffectiveRatesForDate, getTodayBusinessDate } from "@/services/gold-rate.service";
import { calculateGoldValue } from "@/services/gold-calculation.service";
import { getInventorySummary } from "@/services/inventory-item.service";
import {
  getCustomerDashboardSummary,
  getUpcomingBirthdays,
  getUpcomingAnniversaries,
} from "@/services/customer-analytics.service";
import { formatDate, formatCurrency } from "@/lib/format";
import { GoldRateSummary } from "@/components/dashboard/gold-rate-summary";
import { SystemStatus, type SystemStatusItem } from "@/components/dashboard/system-status";
import { FutureMetricCard } from "@/components/dashboard/future-metric-card";
import { RealMetricCard } from "@/components/dashboard/real-metric-card";
import { UpcomingDatesWidget } from "@/components/customers/upcoming-dates-widget";
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

  const [rates, dbHealthy, inventorySummary, customerSummary, upcomingBirthdays, upcomingAnniversaries] =
    await Promise.all([
      getEffectiveRatesForDate(businessDate),
      checkDatabase(),
      getInventorySummary(),
      getCustomerDashboardSummary(),
      getUpcomingBirthdays(30),
      getUpcomingAnniversaries(30),
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
          Inventory
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <RealMetricCard icon={Boxes} label="Total Items" value={inventorySummary.totalItems.toLocaleString()} href="/inventory" />
          <RealMetricCard
            icon={Wallet}
            label="Selling Value"
            value={formatCurrency(inventorySummary.totalSellingValue)}
            href="/inventory"
          />
          <RealMetricCard
            icon={ProfitIcon}
            label="Expected Gross Profit"
            value={formatCurrency(inventorySummary.expectedGrossProfit)}
            href="/inventory"
          />
          <RealMetricCard icon={Coins} label="Sold" value={inventorySummary.sold.toLocaleString()} href="/inventory?status=SOLD" />
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Customers
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <RealMetricCard icon={Users} label="Total Customers" value={customerSummary.totalCustomers.toLocaleString()} href="/customers" />
          <RealMetricCard icon={UserCheck} label="Active" value={customerSummary.active.toLocaleString()} href="/customers?status=ACTIVE" />
          <RealMetricCard icon={Crown} label="VIP" value={customerSummary.vip.toLocaleString()} href="/customers/vip" />
          <RealMetricCard icon={UserX} label="Inactive" value={customerSummary.inactive.toLocaleString()} href="/customers/inactive" />
          <RealMetricCard
            icon={ArrowDownToLine}
            label="With Outstanding Balance"
            value={customerSummary.withOutstandingBalance.toLocaleString()}
            href="/customers/ledger"
          />
          <RealMetricCard icon={Users} label="New This Month" value={customerSummary.newThisMonth.toLocaleString()} href="/customers" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <UpcomingDatesWidget
          icon={Cake}
          title="Upcoming Birthdays"
          entries={upcomingBirthdays}
          emptyMessage="No birthdays on file in the next 30 days."
        />
        <UpcomingDatesWidget
          icon={HeartHandshake}
          title="Upcoming Anniversaries"
          entries={upcomingAnniversaries}
          emptyMessage="No anniversaries on file in the next 30 days."
        />
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Coming in upcoming phases
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <FutureMetricCard icon={TrendingUp} label="Today's Sales" />
          <FutureMetricCard icon={Coins} label="Gold Sold" />
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
