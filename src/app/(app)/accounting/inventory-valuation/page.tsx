import { getInventoryValuationReport, getInventoryCurrentMarketValuation } from "@/services/financial-reports.service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ExportCsvButton } from "@/components/accounting/export-csv-button";
import { exportInventoryValuationAction } from "@/lib/actions/financial-reports.actions";
import { formatCurrency, formatWeight } from "@/lib/format";
import { PURITY_LABELS } from "@/types/gold";

export const metadata = { title: "Inventory Valuation | Zarghoon Jewellers" };

function Stat({ label, value, tone }: { label: string; value: string; tone?: "success" | "danger" | "gold" }) {
  const toneClass = tone === "success" ? "text-success" : tone === "danger" ? "text-danger" : tone === "gold" ? "text-gold" : "text-foreground";
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`mt-1 font-display text-lg font-semibold ${toneClass}`}>{value}</p>
    </div>
  );
}

function BreakdownTable({ title, rows }: { title: string; rows: { label: string; itemCount: number; costValue: string; sellingValue: string }[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{title.split(" ")[0]}</TableHead>
              <TableHead className="text-right">Items</TableHead>
              <TableHead className="text-right">Cost Value</TableHead>
              <TableHead className="text-right">Selling Value</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.label}>
                <TableCell>{row.label}</TableCell>
                <TableCell className="text-right">{row.itemCount}</TableCell>
                <TableCell className="text-right font-mono">{formatCurrency(row.costValue)}</TableCell>
                <TableCell className="text-right font-mono text-gold">{formatCurrency(row.sellingValue)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

export default async function InventoryValuationPage() {
  const [report, marketValuation] = await Promise.all([getInventoryValuationReport(), getInventoryCurrentMarketValuation()]);

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-semibold text-foreground">Inventory Valuation</h1>
          <p className="text-sm text-muted-foreground">
            Active stock only (not sold, not archived) — valued at the recorded cost, never today&apos;s gold rate.
          </p>
        </div>
        <ExportCsvButton action={exportInventoryValuationAction} filenamePrefix="inventory-valuation" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Summary</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Stat label="Active Items" value={String(report.totalItems)} />
          <Stat label="Cost Value" value={formatCurrency(report.costValue)} />
          <Stat label="Selling Value" value={formatCurrency(report.sellingValue)} tone="gold" />
          <Stat label="Expected Gross Profit" value={formatCurrency(report.expectedGrossProfit)} tone="success" />
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <BreakdownTable title="By Category" rows={report.byCategory} />
        <BreakdownTable title="By Purity" rows={report.byPurity} />
        <BreakdownTable title="By Supplier" rows={report.bySupplier} />
        <BreakdownTable title="By Age" rows={report.byAge} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Current Market Value — using today&apos;s gold rate</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <p className="px-4 pb-2 text-xs text-muted-foreground">
            Explicitly separate from the recorded cost above: only the raw gold-value portion is recomputed at
            today&apos;s rate — making/stone/diamond/other charges are never rate-dependent and are carried over as
            originally recorded.
          </p>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Purity</TableHead>
                <TableHead className="text-right">Gross Weight</TableHead>
                <TableHead className="text-right">Today&apos;s Rate</TableHead>
                <TableHead className="text-right">Current Market Value</TableHead>
                <TableHead className="text-right">Original Cost</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {marketValuation.map((row) => (
                <TableRow key={row.purity}>
                  <TableCell>{PURITY_LABELS[row.purity]}</TableCell>
                  <TableCell className="text-right font-mono">{formatWeight(row.grossWeight)}</TableCell>
                  <TableCell className="text-right font-mono">
                    {row.todayRatePerGram ? formatCurrency(row.todayRatePerGram) : "Not set today"}
                  </TableCell>
                  <TableCell className="text-right font-mono text-gold">
                    {row.currentMarketValue ? formatCurrency(row.currentMarketValue) : "—"}
                  </TableCell>
                  <TableCell className="text-right font-mono text-muted-foreground">{formatCurrency(row.originalCostValue)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
