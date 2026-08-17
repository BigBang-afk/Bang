import { getCashAnalytics } from "@/services/bi-cash-analytics.service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ReportDateFilter } from "@/components/accounting/report-date-filter";
import { BarChartList } from "@/components/accounting/charts";
import { parseReportDateParams } from "@/lib/report-date-range";
import { formatCurrency } from "@/lib/format";

export const metadata = { title: "Cash Analytics | Zarghoon Jewellers" };

export default async function CashAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const { preset, custom } = parseReportDateParams(params);
  const cash = await getCashAnalytics(preset, custom);

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 sm:p-6">
      <div>
        <h1 className="font-display text-xl font-semibold text-foreground">Cash Analytics</h1>
        <p className="text-sm text-muted-foreground">Never auto-adjusted — a difference here is always flagged for a human decision.</p>
      </div>

      <ReportDateFilter values={{ preset, from: params.from, to: params.to }} basePath="/business-intelligence/cash" />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {[
          ["Opening Cash", cash.openingCash],
          ["Cash In", cash.cashIn],
          ["Cash Out", cash.cashOut],
          ["Expected Closing", cash.expectedClosing],
          ["Physical Closing", cash.physicalClosing ?? "Not recorded"],
          ["Difference", cash.difference ?? "N/A"],
        ].map(([label, value]) => (
          <Card key={label}>
            <CardContent className="py-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
              <p className="mt-1 text-lg font-semibold text-foreground">{typeof value === "string" && (value === "Not recorded" || value === "N/A") ? value : formatCurrency(value)}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <BarChartList
            items={[
              { label: "Sales", value: Number(cash.breakdown.sales) },
              { label: "Customer Payments", value: Number(cash.breakdown.customerPayments) },
              { label: "Supplier Payments", value: Number(cash.breakdown.supplierPayments) },
              { label: "Karigar Payments", value: Number(cash.breakdown.karigarPayments) },
              { label: "Expenses", value: Number(cash.breakdown.expenses) },
              { label: "Other", value: Number(cash.breakdown.other) },
            ]}
          />
        </CardContent>
      </Card>
    </div>
  );
}
