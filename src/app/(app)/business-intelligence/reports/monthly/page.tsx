import { getMonthlyReport } from "@/services/bi-report.service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChartList } from "@/components/accounting/charts";
import { GrowthIndicator } from "@/components/business-intelligence/growth-indicator";
import { formatCurrency } from "@/lib/format";

export const metadata = { title: "Monthly Report | Zarghoon Jewellers" };

export default async function MonthlyReportPage() {
  const report = await getMonthlyReport();

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 sm:p-6 print:p-0">
      <div>
        <h1 className="font-display text-xl font-semibold text-foreground">Monthly Business Report</h1>
        <p className="text-sm text-muted-foreground">
          {report.from} to {report.to}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ["Revenue", formatCurrency(report.revenue)],
          ["COGS", formatCurrency(report.cogs)],
          ["Gross Profit", formatCurrency(report.grossProfit)],
          ["Gross Margin", `${report.grossMarginPercent}%`],
          ["Expenses", formatCurrency(report.expenses)],
          ["Net Profit", formatCurrency(report.netProfit)],
          ["Net Margin", `${report.netMarginPercent}%`],
        ].map(([label, value]) => (
          <Card key={label}>
            <CardContent className="py-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
              <p className="mt-1 text-lg font-semibold text-foreground">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="flex flex-wrap gap-8 py-4">
          <div>
            <p className="text-xs text-muted-foreground">Sales Growth (vs. last month)</p>
            <GrowthIndicator growth={report.salesGrowth} />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">New Customer Growth (vs. last month)</p>
            <GrowthIndicator growth={report.customerGrowth} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Profit by Category</CardTitle>
        </CardHeader>
        <CardContent>
          <BarChartList items={report.profitByCategory.map((c) => ({ label: c.categoryName, value: Number(c.grossProfit) }))} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Marketing ROI / Attribution</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-muted-foreground">DIRECT ATTRIBUTION</p>
            <p className="text-lg font-semibold text-foreground">{formatCurrency(report.marketing.directRevenue)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">ASSISTED ATTRIBUTION</p>
            <p className="text-lg font-semibold text-foreground">{formatCurrency(report.marketing.assistedRevenue)}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
