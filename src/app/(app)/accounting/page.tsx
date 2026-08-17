import { TrendingUp, TrendingDown, Receipt, PiggyBank, Wallet, Users, Truck, Hammer } from "lucide-react";
import { getFinancialDashboardSummary, getDailyTrend, getSalesByCategoryThisMonth } from "@/services/financial-dashboard.service";
import { getExpenseReport } from "@/services/financial-reports.service";
import { getSalesReport } from "@/services/financial-reports.service";
import { RealMetricCard } from "@/components/dashboard/real-metric-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendChart, BarChartList } from "@/components/accounting/charts";
import { GoldPositionList } from "@/components/ledger/gold-position";
import { formatCurrency } from "@/lib/format";

export const metadata = { title: "Financial Dashboard | Zarghoon Jewellers" };

export default async function AccountingDashboardPage() {
  const [summary, trend, salesByCategory, expenseReport, salesReport] = await Promise.all([
    getFinancialDashboardSummary(),
    getDailyTrend(14),
    getSalesByCategoryThisMonth(),
    getExpenseReport("this_month"),
    getSalesReport("this_month", undefined),
  ]);

  const paymentMethodBreakdown = [
    { label: "Cash", value: Number(salesReport.cashSales) },
    { label: "Card", value: Number(salesReport.cardSales) },
    { label: "Bank Transfer", value: Number(salesReport.bankSales) },
    { label: "Credit", value: Number(salesReport.creditSales) },
  ].filter((row) => row.value > 0);

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 sm:p-6">
      <div>
        <h1 className="font-display text-xl font-semibold text-foreground">Financial Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Revenue, profit, cash, receivables, and payables — all computed live from the underlying ledgers, never a
          separate cached figure.
        </p>
      </div>

      {/* TOP CARDS */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <RealMetricCard icon={TrendingUp} label="Today's Sales" value={formatCurrency(summary.todaySales)} href="/accounting/sales-report" />
        <RealMetricCard icon={PiggyBank} label="Today's Gross Profit" value={formatCurrency(summary.todayGrossProfit)} href="/accounting/profit-loss" />
        <RealMetricCard icon={Receipt} label="Today's Expenses" value={formatCurrency(summary.todayExpenses)} href="/accounting/expenses" />
        <RealMetricCard icon={TrendingDown} label="Today's Net Profit" value={formatCurrency(summary.todayNetProfit)} href="/accounting/profit-loss" />
        <RealMetricCard icon={Wallet} label="Cash Balance" value={formatCurrency(summary.cashBalance)} href="/accounting/cash-report" />
        <RealMetricCard icon={Users} label="Customer Receivables" value={formatCurrency(summary.customerReceivables)} href="/accounting/receivables" />
        <RealMetricCard icon={Truck} label="Supplier Payables" value={formatCurrency(summary.supplierPayables)} href="/accounting/payables" />
        <RealMetricCard
          icon={Hammer}
          label="Gold With Karigars"
          value={summary.goldWithKarigars.length > 0 ? `${summary.goldWithKarigars.length} ${summary.goldWithKarigars.length === 1 ? "purity" : "purities"}` : "None"}
          href="/karigars/gold"
        />
      </div>

      {summary.goldWithKarigars.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Gold With Karigars — by purity</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <GoldPositionList
              positions={summary.goldWithKarigars.map((g) => ({ purity: g.purity, balance: g.weight, status: "HOLDS_GOLD" as const }))}
            />
          </CardContent>
        </Card>
      )}

      {/* TRENDS */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Sales Trend (last 14 days)</CardTitle>
          </CardHeader>
          <CardContent>
            <TrendChart points={trend.map((t) => ({ label: t.date.slice(5), value: Number(t.sales) }))} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Gross Profit Trend (last 14 days)</CardTitle>
          </CardHeader>
          <CardContent>
            <TrendChart points={trend.map((t) => ({ label: t.date.slice(5), value: Number(t.grossProfit) }))} />
          </CardContent>
        </Card>
      </div>

      {/* BREAKDOWNS */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Expenses by Category (this month)</CardTitle>
          </CardHeader>
          <CardContent>
            <BarChartList items={expenseReport.byCategory.map((c) => ({ label: c.categoryName, value: Number(c.total) }))} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Sales by Category (this month)</CardTitle>
          </CardHeader>
          <CardContent>
            <BarChartList items={salesByCategory.map((c) => ({ label: c.categoryName, value: Number(c.total) }))} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Payment Method Breakdown (this month)</CardTitle>
          </CardHeader>
          <CardContent>
            <BarChartList items={paymentMethodBreakdown} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
