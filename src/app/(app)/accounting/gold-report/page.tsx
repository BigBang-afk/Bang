import { getGoldReport } from "@/services/financial-reports.service";
import { parseReportDateParams } from "@/lib/report-date-range";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ReportDateFilter } from "@/components/accounting/report-date-filter";
import { ExportCsvButton } from "@/components/accounting/export-csv-button";
import { exportGoldReportAction } from "@/lib/actions/financial-reports.actions";
import { formatWeight } from "@/lib/format";
import { PURITY_LABELS } from "@/types/gold";

export const metadata = { title: "Gold Report | Zarghoon Jewellers" };

export default async function GoldReportPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const { preset, custom } = parseReportDateParams(params);
  const report = await getGoldReport(preset, custom);

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-semibold text-foreground">Gold Report</h1>
          <p className="text-sm text-muted-foreground">
            {report.from} to {report.to} — purities are never combined; each row is a separate gram figure.
          </p>
        </div>
        <ExportCsvButton
          action={exportGoldReportAction}
          actionInput={{ preset, from: custom?.from, to: custom?.to }}
          filenamePrefix="gold-report"
        />
      </div>

      <ReportDateFilter values={params} basePath="/accounting/gold-report" />

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Purity</TableHead>
                <TableHead className="text-right">Opening</TableHead>
                <TableHead className="text-right">Purchased</TableHead>
                <TableHead className="text-right">Received</TableHead>
                <TableHead className="text-right">Given</TableHead>
                <TableHead className="text-right">Sold</TableHead>
                <TableHead className="text-right">Returned</TableHead>
                <TableHead className="text-right">Adjustments</TableHead>
                <TableHead className="text-right">Closing</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {report.rows.map((row) => (
                <TableRow key={row.purity}>
                  <TableCell className="font-medium text-foreground">{PURITY_LABELS[row.purity]}</TableCell>
                  <TableCell className="text-right font-mono">{formatWeight(row.openingGold)}</TableCell>
                  <TableCell className="text-right font-mono">{formatWeight(row.goldPurchased)}</TableCell>
                  <TableCell className="text-right font-mono">{formatWeight(row.goldReceived)}</TableCell>
                  <TableCell className="text-right font-mono">{formatWeight(row.goldGiven)}</TableCell>
                  <TableCell className="text-right font-mono">{formatWeight(row.goldSold)}</TableCell>
                  <TableCell className="text-right font-mono">{formatWeight(row.goldReturned)}</TableCell>
                  <TableCell className="text-right font-mono">{formatWeight(row.goldAdjustments)}</TableCell>
                  <TableCell className="text-right font-mono text-gold">{formatWeight(row.closingGold)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
