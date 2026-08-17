import Link from "next/link";
import { TrendingUp, Wallet, Users, Truck, Boxes, Package, AlertTriangle } from "lucide-react";
import { getExecutiveKpis, getSalesPerformance } from "@/services/bi-dashboard.service";
import { getBusinessInsights } from "@/services/bi-insight.service";
import { getAlertCounts, listAlerts } from "@/services/alert.service";
import { RealMetricCard } from "@/components/dashboard/real-metric-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ReportDateFilter } from "@/components/accounting/report-date-filter";
import { GrowthIndicator } from "@/components/business-intelligence/growth-indicator";
import { BUSINESS_INTELLIGENCE_SUB_NAV } from "@/config/nav";
import { formatCurrency } from "@/lib/format";

export const metadata = { title: "Executive Dashboard | Zarghoon Jewellers" };

export default async function ExecutiveDashboardPage() {
  const [kpis, salesPerformance, insights, alertCounts, openAlerts] = await Promise.all([
    getExecutiveKpis(),
    getSalesPerformance(),
    getBusinessInsights(),
    getAlertCounts(),
    listAlerts({ status: "OPEN" }, 5),
  ]);

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 sm:p-6">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-gold">Zarghoon Jewellers</p>
        <h1 className="font-display text-xl font-semibold text-foreground">Business Intelligence</h1>
        <p className="text-sm text-muted-foreground">
          Executive dashboard — every figure is a live database aggregate, never a cached or invented number.
        </p>
      </div>

      <ReportDateFilter values={{ preset: "today" }} basePath="/business-intelligence" />

      {/* TOP KPI CARDS */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <RealMetricCard icon={TrendingUp} label="Today's Sales" value={formatCurrency(kpis.todaySales)} href="/business-intelligence/sales" />
        <RealMetricCard icon={TrendingUp} label="Today's Gross Profit" value={formatCurrency(kpis.todayGrossProfit)} href="/business-intelligence/profit" />
        <RealMetricCard icon={TrendingUp} label="Today's Net Profit" value={formatCurrency(kpis.todayNetProfit)} href="/business-intelligence/profit" />
        <RealMetricCard icon={TrendingUp} label="Monthly Sales" value={formatCurrency(kpis.monthlySales)} href="/business-intelligence/sales" />
        <RealMetricCard icon={TrendingUp} label="Monthly Gross Profit" value={formatCurrency(kpis.monthlyGrossProfit)} href="/business-intelligence/profit" />
        <RealMetricCard icon={TrendingUp} label="Monthly Net Profit" value={formatCurrency(kpis.monthlyNetProfit)} href="/business-intelligence/profit" />
        <RealMetricCard icon={Wallet} label="Cash Balance" value={formatCurrency(kpis.cashBalance)} href="/business-intelligence/cash" />
        <RealMetricCard icon={Users} label="Customer Receivables" value={formatCurrency(kpis.customerReceivables)} href="/business-intelligence/customers" />
        <RealMetricCard icon={Truck} label="Supplier Payables" value={formatCurrency(kpis.supplierPayables)} href="/business-intelligence/suppliers" />
        <RealMetricCard
          icon={Package}
          label="Gold With Karigars"
          value={kpis.goldWithKarigars.length > 0 ? kpis.goldWithKarigars.map((g) => `${g.weight}g ${g.purity}`).join(", ") : "None"}
          href="/business-intelligence/gold"
        />
        <RealMetricCard icon={Boxes} label="Inventory Cost Value" value={formatCurrency(kpis.inventoryCostValue)} href="/business-intelligence/inventory" />
        <RealMetricCard icon={Boxes} label="Inventory Selling Value" value={formatCurrency(kpis.inventorySellingValue)} href="/business-intelligence/inventory" />
      </div>

      {/* SALES PERFORMANCE */}
      <Card>
        <CardHeader>
          <CardTitle>Sales Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <p className="text-xs text-muted-foreground">Today</p>
              <p className="text-lg font-semibold text-foreground">{formatCurrency(salesPerformance.today)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Yesterday</p>
              <p className="text-lg font-semibold text-foreground">{formatCurrency(salesPerformance.yesterday)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">This Month</p>
              <p className="text-lg font-semibold text-foreground">{formatCurrency(salesPerformance.thisMonth)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Last Month</p>
              <p className="text-lg font-semibold text-foreground">{formatCurrency(salesPerformance.lastMonth)}</p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-6 border-t border-border pt-4">
            <div>
              <p className="text-xs text-muted-foreground">Day-over-day</p>
              <GrowthIndicator growth={salesPerformance.dayOverDay} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Month-over-month</p>
              <GrowthIndicator growth={salesPerformance.monthOverMonth} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* AI INSIGHTS */}
      <Card>
        <CardHeader>
          <CardTitle>AI Insights</CardTitle>
        </CardHeader>
        <CardContent>
          {insights.length === 0 ? (
            <p className="text-sm text-muted-foreground">No notable changes to report right now.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {insights.map((insight) => (
                <li key={insight.metric} className="rounded-md border border-border bg-surface-elevated p-3">
                  <p className="text-sm text-foreground">{insight.explanation}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {insight.metric} · {insight.period} · Source: {insight.source}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* ALERTS SUMMARY */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Open Alerts</CardTitle>
          <Link href="/business-intelligence/alerts" className="text-xs font-medium text-gold hover:underline">
            View Alerts Center →
          </Link>
        </CardHeader>
        <CardContent>
          <div className="mb-3 flex gap-4 text-sm">
            <span>
              <Badge variant="warning">{alertCounts.OPEN}</Badge> Open
            </span>
            <span>
              <Badge variant="neutral">{alertCounts.ACKNOWLEDGED}</Badge> Acknowledged
            </span>
          </div>
          {openAlerts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No open alerts.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {openAlerts.map((alert) => (
                <li key={alert.id} className="flex items-center gap-2 text-sm">
                  <AlertTriangle className="size-4 shrink-0 text-warning" />
                  <span className="text-foreground">{alert.title}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* DETAILED ANALYTICS */}
      <Card>
        <CardHeader>
          <CardTitle>Detailed Analytics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {BUSINESS_INTELLIGENCE_SUB_NAV.filter((item) => item.href !== "/business-intelligence").map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-md border border-border px-3 py-2 text-sm text-foreground transition-colors hover:border-gold-muted/50 hover:text-gold"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
