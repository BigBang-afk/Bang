import { getKarigarAnalyticsSummary, getKarigarPerformance } from "@/services/bi-karigar-analytics.service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatWeight, formatCurrency } from "@/lib/format";

export const metadata = { title: "Karigar Analytics | Zarghoon Jewellers" };

export default async function KarigarAnalyticsPage() {
  const [summary, performance] = await Promise.all([getKarigarAnalyticsSummary(), getKarigarPerformance()]);

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 sm:p-6">
      <div>
        <h1 className="font-display text-xl font-semibold text-foreground">Karigar Analytics</h1>
        <p className="text-sm text-muted-foreground">Operational metrics only — never a quality ranking based on unsupported assumptions.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ["Active Karigars", summary.activeKarigars],
          ["Jobs Completed", summary.jobsCompleted],
          ["Jobs Pending", summary.jobsPending],
          ["Gold Given", formatWeight(summary.goldGiven)],
          ["Gold Received", formatWeight(summary.goldReceived)],
          ["Gold Difference", formatWeight(summary.goldDifference)],
          ["Cash Payable", formatCurrency(summary.cashPayableTotal)],
          ["Cash Receivable", formatCurrency(summary.cashReceivableTotal)],
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
        <CardHeader>
          <CardTitle>Karigar Performance</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Karigar</TableHead>
                <TableHead className="text-right">Jobs Completed</TableHead>
                <TableHead className="text-right">Avg. Completion (hrs)</TableHead>
                <TableHead className="text-right">Within Allowance</TableHead>
                <TableHead className="text-right">Excess</TableHead>
                <TableHead className="text-right">Shortage</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {performance.map((row) => (
                <TableRow key={row.karigarId}>
                  <TableCell>
                    {row.name} <span className="text-xs text-muted-foreground">({row.karigarCode})</span>
                  </TableCell>
                  <TableCell className="text-right">{row.jobsCompleted}</TableCell>
                  <TableCell className="text-right">{row.averageCompletionHours ?? "—"}</TableCell>
                  <TableCell className="text-right">{row.withinAllowanceCount}</TableCell>
                  <TableCell className="text-right">{row.excessDifferenceCount}</TableCell>
                  <TableCell className="text-right">{row.shortageCount}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
