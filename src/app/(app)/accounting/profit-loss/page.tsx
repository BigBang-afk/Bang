import { getProfitAndLoss } from "@/services/profit-loss.service";
import { parseReportDateParams } from "@/lib/report-date-range";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ReportDateFilter } from "@/components/accounting/report-date-filter";
import { formatCurrency } from "@/lib/format";

export const metadata = { title: "Profit & Loss | Zarghoon Jewellers" };

function Row({ label, value, tone, bold }: { label: string; value: string; tone?: "success" | "danger" | "gold"; bold?: boolean }) {
  const toneClass = tone === "success" ? "text-success" : tone === "danger" ? "text-danger" : tone === "gold" ? "text-gold" : "text-foreground";
  return (
    <div className="flex items-center justify-between border-b border-border py-2 last:border-b-0">
      <span className={`text-sm ${bold ? "font-semibold text-foreground" : "text-muted-foreground"}`}>{label}</span>
      <span className={`font-mono text-sm ${bold ? "text-base font-semibold" : ""} ${toneClass}`}>{value}</span>
    </div>
  );
}

export default async function ProfitLossPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const { preset, custom } = parseReportDateParams(params);
  const report = await getProfitAndLoss(preset, custom);

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 sm:p-6">
      <div>
        <h1 className="font-display text-xl font-semibold text-foreground">Profit &amp; Loss</h1>
        <p className="text-sm text-muted-foreground">
          {report.label} ({report.from} to {report.to}). COGS uses each sold item&apos;s own recorded cost — never
          today&apos;s gold rate.
        </p>
      </div>

      <ReportDateFilter values={params} basePath="/accounting/profit-loss" />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Revenue &amp; Gross Profit</CardTitle>
          </CardHeader>
          <CardContent>
            <Row label="Gross Sales" value={formatCurrency(report.grossSales)} />
            <Row label="Discounts" value={`- ${formatCurrency(report.discounts)}`} tone="danger" />
            <Row label="Net Sales" value={formatCurrency(report.netSales)} bold />
            <Row label="Cost of Goods Sold" value={`- ${formatCurrency(report.cogs)}`} tone="danger" />
            <Row label="Gross Profit" value={formatCurrency(report.grossProfit)} tone="success" bold />
            <Row label="Gross Margin" value={`${report.grossMarginPercent}%`} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Net Profit</CardTitle>
          </CardHeader>
          <CardContent>
            <Row label="Gross Profit" value={formatCurrency(report.grossProfit)} />
            <Row label="Other Income" value={`+ ${formatCurrency(report.otherIncome)}`} tone="success" />
            <Row label="Operating Expenses" value={`- ${formatCurrency(report.operatingExpenses)}`} tone="danger" />
            <Row label="Net Profit" value={formatCurrency(report.netProfit)} tone="gold" bold />
            <Row label="Net Margin" value={`${report.netMarginPercent}%`} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="flex flex-wrap gap-6 py-4 text-sm text-muted-foreground">
          <span>{report.itemsSold} item(s) sold</span>
          {report.refundedItemsExcluded > 0 && <span>{report.refundedItemsExcluded} returned item(s) excluded</span>}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        This is a practical jewelry-retail financial summary, not a legally compliant statutory accounting or tax
        report — see ACCOUNTING.md.
      </p>
    </div>
  );
}
