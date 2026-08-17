import { getProfitAndLoss } from "@/services/profit-loss.service";
import { getProfitTrend, getProfitByCategory, getTopProducts } from "@/services/bi-profit-analytics.service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TrendChart, BarChartList } from "@/components/accounting/charts";
import { ReportDateFilter } from "@/components/accounting/report-date-filter";
import { parseReportDateParams } from "@/lib/report-date-range";
import { formatCurrency } from "@/lib/format";

export const metadata = { title: "Profit Analytics | Zarghoon Jewellers" };

export default async function ProfitAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const { preset, custom } = parseReportDateParams(params);

  const [pnl, trend, byCategory, topProducts] = await Promise.all([
    getProfitAndLoss(preset, custom),
    getProfitTrend(preset, "day", custom),
    getProfitByCategory(preset, custom),
    getTopProducts(preset, "profit", custom, 10),
  ]);

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 sm:p-6">
      <div>
        <h1 className="font-display text-xl font-semibold text-foreground">Profit Analytics</h1>
        <p className="text-sm text-muted-foreground">COGS is always each sold item&apos;s own recorded cost snapshot — never recalculated from today&apos;s gold rate.</p>
      </div>

      <ReportDateFilter values={{ preset, from: params.from, to: params.to }} basePath="/business-intelligence/profit" />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ["Revenue", pnl.netSales],
          ["COGS", pnl.cogs],
          ["Gross Profit", pnl.grossProfit],
          ["Gross Margin", `${pnl.grossMarginPercent}%`],
          ["Operating Expenses", pnl.operatingExpenses],
          ["Other Income", pnl.otherIncome],
          ["Net Profit", pnl.netProfit],
          ["Net Margin", `${pnl.netMarginPercent}%`],
        ].map(([label, value]) => (
          <Card key={label}>
            <CardContent className="py-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
              <p className="mt-1 text-lg font-semibold text-foreground">{typeof value === "string" && value.includes("%") ? value : formatCurrency(value)}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Gross Profit Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <TrendChart points={trend.map((t) => ({ label: t.period.slice(5), value: Number(t.grossProfit) }))} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Net Profit Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <TrendChart points={trend.map((t) => ({ label: t.period.slice(5), value: Number(t.netProfit) }))} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profit by Category</CardTitle>
        </CardHeader>
        <CardContent>
          <BarChartList items={byCategory.map((c) => ({ label: c.categoryName, value: Number(c.grossProfit) }))} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Top Products by Profit</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead className="text-right">Units Sold</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
                <TableHead className="text-right">COGS</TableHead>
                <TableHead className="text-right">Gross Profit</TableHead>
                <TableHead className="text-right">Margin</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {topProducts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-sm text-muted-foreground">
                    No completed sales in this period.
                  </TableCell>
                </TableRow>
              ) : (
                topProducts.map((p) => (
                  <TableRow key={p.productName}>
                    <TableCell>{p.productName}</TableCell>
                    <TableCell className="text-right">{p.unitsSold}</TableCell>
                    <TableCell className="text-right">{formatCurrency(p.revenue)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(p.cogs)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(p.grossProfit)}</TableCell>
                    <TableCell className="text-right">{p.marginPercent}%</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
