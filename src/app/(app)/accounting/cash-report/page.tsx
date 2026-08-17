import { getCashReport } from "@/services/financial-reports.service";
import { parseReportDateParams } from "@/lib/report-date-range";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ReportDateFilter } from "@/components/accounting/report-date-filter";
import { ExportCsvButton } from "@/components/accounting/export-csv-button";
import { exportCashReportAction } from "@/lib/actions/financial-reports.actions";
import { BarChartList } from "@/components/accounting/charts";
import { formatCurrency } from "@/lib/format";

export const metadata = { title: "Cash Report | Zarghoon Jewellers" };

function Stat({ label, value, tone }: { label: string; value: string; tone?: "success" | "danger" | "gold" }) {
  const toneClass = tone === "success" ? "text-success" : tone === "danger" ? "text-danger" : tone === "gold" ? "text-gold" : "text-foreground";
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`mt-1 font-display text-lg font-semibold ${toneClass}`}>{value}</p>
    </div>
  );
}

export default async function CashReportPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const { preset, custom } = parseReportDateParams(params);
  const report = await getCashReport(preset, custom);

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-semibold text-foreground">Cash Report</h1>
          <p className="text-sm text-muted-foreground">
            {report.from} to {report.to}
          </p>
        </div>
        <ExportCsvButton
          action={exportCashReportAction}
          actionInput={{ preset, from: custom?.from, to: custom?.to }}
          filenamePrefix="cash-report"
        />
      </div>

      <ReportDateFilter values={params} basePath="/accounting/cash-report" />

      <Card>
        <CardHeader>
          <CardTitle>Summary</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Stat label="Opening Cash" value={formatCurrency(report.openingCash)} />
          <Stat label="Cash In" value={formatCurrency(report.cashIn)} tone="success" />
          <Stat label="Cash Out" value={formatCurrency(report.cashOut)} tone="danger" />
          <Stat label="Expected Closing" value={formatCurrency(report.expectedClosing)} tone="gold" />
          <Stat label="Physical Closing" value={report.physicalClosing ? formatCurrency(report.physicalClosing) : "Not recorded"} />
          {report.difference && <Stat label="Difference" value={formatCurrency(report.difference)} tone={Number(report.difference) < 0 ? "danger" : "success"} />}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Breakdown by Type</CardTitle>
        </CardHeader>
        <CardContent>
          <BarChartList
            items={report.byType.map((t) => ({ label: `${t.transactionType.replace(/_/g, " ")} (${t.direction})`, value: Number(t.total) }))}
          />
        </CardContent>
      </Card>
    </div>
  );
}
