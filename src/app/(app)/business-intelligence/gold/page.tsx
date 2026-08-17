import { getGoldByPurity, getGoldRateAnalytics, getGoldExposure } from "@/services/bi-gold-analytics.service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ReportDateFilter } from "@/components/accounting/report-date-filter";
import { parseReportDateParams } from "@/lib/report-date-range";
import { formatWeight, formatCurrency } from "@/lib/format";

export const metadata = { title: "Gold Analytics | Zarghoon Jewellers" };

export default async function GoldAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const { preset, custom } = parseReportDateParams(params);

  const [byPurity, rateAnalytics, exposure] = await Promise.all([
    getGoldByPurity(preset, custom),
    getGoldRateAnalytics(30),
    getGoldExposure(),
  ]);

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 sm:p-6">
      <div>
        <h1 className="font-display text-xl font-semibold text-foreground">Gold Intelligence</h1>
        <p className="text-sm text-muted-foreground">Every figure is purity-separated — different purities are never summed into one meaningless total.</p>
      </div>

      <ReportDateFilter values={{ preset, from: params.from, to: params.to }} basePath="/business-intelligence/gold" />

      <Card>
        <CardHeader>
          <CardTitle>Gold by Purity</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Purity</TableHead>
                <TableHead className="text-right">Purchased</TableHead>
                <TableHead className="text-right">Sold</TableHead>
                <TableHead className="text-right">Received</TableHead>
                <TableHead className="text-right">Given</TableHead>
                <TableHead className="text-right">Returned</TableHead>
                <TableHead className="text-right">Closing</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {byPurity.map((row) => (
                <TableRow key={row.purity}>
                  <TableCell className="font-medium">{row.purity}</TableCell>
                  <TableCell className="text-right">{formatWeight(row.goldPurchased)}</TableCell>
                  <TableCell className="text-right">{formatWeight(row.goldSold)}</TableCell>
                  <TableCell className="text-right">{formatWeight(row.goldReceived)}</TableCell>
                  <TableCell className="text-right">{formatWeight(row.goldGiven)}</TableCell>
                  <TableCell className="text-right">{formatWeight(row.goldReturned)}</TableCell>
                  <TableCell className="text-right font-medium">{formatWeight(row.closingGold)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Gold Rate Analytics</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Purity</TableHead>
                <TableHead className="text-right">Current Rate</TableHead>
                <TableHead className="text-right">Previous Rate</TableHead>
                <TableHead className="text-right">Change</TableHead>
                <TableHead className="text-right">Change %</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rateAnalytics.current.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">
                    No gold rate entered for today yet.
                  </TableCell>
                </TableRow>
              ) : (
                rateAnalytics.current.map((rate) => {
                  const change = rateAnalytics.changeByPurity.find((c) => c.purity === rate.purity);
                  const previous = rateAnalytics.previous.find((p) => p.purity === rate.purity);
                  return (
                    <TableRow key={rate.purity}>
                      <TableCell className="font-medium">{rate.purity}</TableCell>
                      <TableCell className="text-right">{formatCurrency(rate.ratePerGram)}</TableCell>
                      <TableCell className="text-right">{previous ? formatCurrency(previous.ratePerGram) : "—"}</TableCell>
                      <TableCell className="text-right">{change ? formatCurrency(change.change) : "—"}</TableCell>
                      <TableCell className="text-right">{change?.changePercent ? `${change.changePercent}%` : "—"}</TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Gold Exposure</CardTitle>
          <Badge variant="neutral">Never converted across purities</Badge>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Purity</TableHead>
                <TableHead className="text-right">Physical In Stock</TableHead>
                <TableHead className="text-right">With Karigars</TableHead>
                <TableHead className="text-right">With Suppliers</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {exposure.map((row) => (
                <TableRow key={row.purity}>
                  <TableCell className="font-medium">{row.purity}</TableCell>
                  <TableCell className="text-right">{formatWeight(row.physicalInStock)}</TableCell>
                  <TableCell className="text-right">{formatWeight(row.withKarigars)}</TableCell>
                  <TableCell className="text-right">{formatWeight(row.withSuppliers)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
