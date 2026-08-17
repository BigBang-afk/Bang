import { getSupplierAnalyticsSummary, getTopSuppliers } from "@/services/bi-supplier-analytics.service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatWeight, formatCurrency } from "@/lib/format";

export const metadata = { title: "Supplier Analytics | Zarghoon Jewellers" };

export default async function SupplierAnalyticsPage() {
  const [summary, topByVolume, topByValue] = await Promise.all([
    getSupplierAnalyticsSummary(),
    getTopSuppliers("volume", 10),
    getTopSuppliers("value", 10),
  ]);

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 sm:p-6">
      <div>
        <h1 className="font-display text-xl font-semibold text-foreground">Supplier Analytics</h1>
        <p className="text-sm text-muted-foreground">Purchase totals reuse the same aggregates as the Purchases module — never a second, independent calculation.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ["Active Suppliers", summary.activeSuppliers],
          ["Total Purchases", formatCurrency(summary.totalPurchases)],
          ["Purchase Count", summary.purchaseCount],
          ["Total Paid", formatCurrency(summary.totalPaid)],
          ["Total Payable", formatCurrency(summary.totalPayable)],
        ].map(([label, value]) => (
          <Card key={label}>
            <CardContent className="py-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
              <p className="mt-1 text-lg font-semibold text-foreground">{value}</p>
            </CardContent>
          </Card>
        ))}
        {summary.byPurity.map((row) => (
          <Card key={row.purity}>
            <CardContent className="py-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Gold Purchased ({row.purity})</p>
              <p className="mt-1 text-lg font-semibold text-foreground">{formatWeight(row.totalWeight)}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Top Suppliers by Volume</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Supplier</TableHead>
                  <TableHead className="text-right">Purchases</TableHead>
                  <TableHead className="text-right">Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topByVolume.map((s) => (
                  <TableRow key={s.supplierId}>
                    <TableCell>{s.name}</TableCell>
                    <TableCell className="text-right">{s.purchaseCount}</TableCell>
                    <TableCell className="text-right">{formatCurrency(s.purchaseValue)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Top Suppliers by Value</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Supplier</TableHead>
                  <TableHead className="text-right">Value</TableHead>
                  <TableHead className="text-right">Outstanding</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topByValue.map((s) => (
                  <TableRow key={s.supplierId}>
                    <TableCell>{s.name}</TableCell>
                    <TableCell className="text-right">{formatCurrency(s.purchaseValue)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(s.outstanding)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
