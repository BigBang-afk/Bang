import { getWeeklyReport } from "@/services/bi-report.service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { GrowthIndicator } from "@/components/business-intelligence/growth-indicator";
import { formatCurrency } from "@/lib/format";

export const metadata = { title: "Weekly Report | Zarghoon Jewellers" };

export default async function WeeklyReportPage() {
  const report = await getWeeklyReport();

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 sm:p-6 print:p-0">
      <div>
        <h1 className="font-display text-xl font-semibold text-foreground">Weekly Business Report</h1>
        <p className="text-sm text-muted-foreground">
          {report.from} to {report.to}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Summary</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <p className="text-xs text-muted-foreground">Sales</p>
            <p className="text-lg font-semibold text-foreground">{formatCurrency(report.sales)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Gross Profit</p>
            <p className="text-lg font-semibold text-foreground">{formatCurrency(report.grossProfit)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Expenses</p>
            <p className="text-lg font-semibold text-foreground">{formatCurrency(report.expenses)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Sales vs. Comparable Period</p>
            <GrowthIndicator growth={report.salesGrowth} />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Top Products</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.topProducts.slice(0, 5).map((p) => (
                  <TableRow key={p.productName}>
                    <TableCell>{p.productName}</TableCell>
                    <TableCell className="text-right">{formatCurrency(p.revenue)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Top Customers</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead className="text-right">Spending</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.topCustomers.slice(0, 5).map((c) => (
                  <TableRow key={c.customerId}>
                    <TableCell>{c.name}</TableCell>
                    <TableCell className="text-right">{formatCurrency(c.totalSpending)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Cash, Marketing &amp; Alerts</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <p className="text-xs text-muted-foreground">Cash In</p>
            <p className="text-lg font-semibold text-foreground">{formatCurrency(report.cash.cashIn)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Cash Out</p>
            <p className="text-lg font-semibold text-foreground">{formatCurrency(report.cash.cashOut)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Messages Sent</p>
            <p className="text-lg font-semibold text-foreground">{report.marketing.messagesSent}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Open Alerts</p>
            <p className="text-lg font-semibold text-foreground">{report.openAlerts}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
