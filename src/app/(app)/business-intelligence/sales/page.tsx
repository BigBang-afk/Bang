import { getSalesTrend, getSalesPeriodComparison, type TrendGrouping } from "@/services/bi-sales-analytics.service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendChart } from "@/components/accounting/charts";
import { ReportDateFilter } from "@/components/accounting/report-date-filter";
import { GrowthIndicator } from "@/components/business-intelligence/growth-indicator";
import { parseReportDateParams } from "@/lib/report-date-range";
import { formatCurrency } from "@/lib/format";

export const metadata = { title: "Sales Analytics | Zarghoon Jewellers" };

export default async function SalesAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const { preset, custom } = parseReportDateParams(params);
  const grouping: TrendGrouping = (params.grouping as TrendGrouping) ?? "day";

  const [trend, comparison] = await Promise.all([
    getSalesTrend(preset, grouping, custom),
    getSalesPeriodComparison(),
  ]);

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 sm:p-6">
      <div>
        <h1 className="font-display text-xl font-semibold text-foreground">Sales Analytics</h1>
        <p className="text-sm text-muted-foreground">Server-side aggregated sales trends — never raw transactions loaded into the browser.</p>
      </div>

      <ReportDateFilter values={{ preset, from: params.from, to: params.to }} basePath="/business-intelligence/sales" />

      <Card>
        <CardHeader>
          <CardTitle>Sales Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <p className="text-xs text-muted-foreground">Today</p>
              <p className="text-lg font-semibold text-foreground">{formatCurrency(comparison.today.netSales)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Yesterday</p>
              <p className="text-lg font-semibold text-foreground">{formatCurrency(comparison.yesterday.netSales)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">This Month</p>
              <p className="text-lg font-semibold text-foreground">{formatCurrency(comparison.thisMonth.netSales)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Last Month</p>
              <p className="text-lg font-semibold text-foreground">{formatCurrency(comparison.lastMonth.netSales)}</p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-6 border-t border-border pt-4">
            <div>
              <p className="text-xs text-muted-foreground">Day-over-day</p>
              <GrowthIndicator growth={comparison.dayOverDay} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Month-over-month</p>
              <GrowthIndicator growth={comparison.monthOverMonth} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Sales Trend</CardTitle>
          <form method="GET" className="flex items-center gap-2 text-xs">
            <input type="hidden" name="preset" value={preset} />
            <input type="hidden" name="from" value={params.from ?? ""} />
            <input type="hidden" name="to" value={params.to ?? ""} />
            {(["day", "week", "month"] as TrendGrouping[]).map((g) => (
              <button
                key={g}
                type="submit"
                name="grouping"
                value={g}
                className={g === grouping ? "font-semibold text-gold" : "text-muted-foreground hover:text-foreground"}
              >
                {g === "day" ? "Day" : g === "week" ? "Week" : "Month"}
              </button>
            ))}
          </form>
        </CardHeader>
        <CardContent>
          <TrendChart points={trend.map((t) => ({ label: t.period.slice(5), value: Number(t.sales) }))} />
        </CardContent>
      </Card>
    </div>
  );
}
