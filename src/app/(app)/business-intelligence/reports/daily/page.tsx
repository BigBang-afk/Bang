import { getDailyReport } from "@/services/bi-report.service";
import { getTodayBusinessDate } from "@/lib/business-date";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ExportCsvButton } from "@/components/accounting/export-csv-button";
import { exportDailyReportCsvAction } from "@/lib/actions/bi-reports.actions";
import { formatCurrency, formatWeight } from "@/lib/format";

export const metadata = { title: "Daily Report | Zarghoon Jewellers" };

export default async function DailyReportPage() {
  const report = await getDailyReport(getTodayBusinessDate());

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 sm:p-6 print:p-0">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div>
          <h1 className="font-display text-xl font-semibold text-foreground">Daily Business Report</h1>
          <p className="text-sm text-muted-foreground">Real database aggregates only — view, print, or export to CSV.</p>
        </div>
        <div className="flex gap-2">
          <ExportCsvButton action={exportDailyReportCsvAction} filenamePrefix="daily-report" />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Today&apos;s Summary — {report.businessDate}</CardTitle>
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
            <p className="text-xs text-muted-foreground">Net Profit</p>
            <p className="text-lg font-semibold text-foreground">{formatCurrency(report.netProfit)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">New Customers</p>
            <p className="text-lg font-semibold text-foreground">{report.newCustomers}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Open Alerts</p>
            <p className="text-lg font-semibold text-foreground">{report.openAlerts}</p>
          </div>
          {report.goldSoldByPurity.map((g) => (
            <div key={g.purity}>
              <p className="text-xs text-muted-foreground">Gold Sold ({g.purity})</p>
              <p className="text-lg font-semibold text-foreground">{formatWeight(g.weight)}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
