import Link from "next/link";
import { listCampaigns } from "@/services/campaign.service";
import { getCampaignAnalytics, getCampaignAttribution } from "@/services/campaign-analytics.service";
import { getMonthlyAiUsageSummary } from "@/services/ai-usage.service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { CampaignStatusBadge } from "@/components/ai-marketing/campaign-status-badge";
import { formatCurrency } from "@/lib/format";

export const metadata = { title: "Marketing Analytics | Zarghoon Jewellers" };

export default async function MarketingAnalyticsPage() {
  const campaigns = await listCampaigns();
  const [analyticsRows, attributionRows, aiUsage] = await Promise.all([
    Promise.all(campaigns.map((c) => getCampaignAnalytics(c.id))),
    Promise.all(campaigns.map((c) => getCampaignAttribution(c.id))),
    getMonthlyAiUsageSummary(),
  ]);

  const totalDirectRevenue = attributionRows.reduce((sum, a) => sum + Number(a.direct.revenue), 0);
  const totalAssistedRevenue = attributionRows.reduce((sum, a) => sum + Number(a.assisted.revenue), 0);
  const totalDirectOrders = attributionRows.reduce((sum, a) => sum + a.direct.orderCount, 0);
  const totalAssistedOrders = attributionRows.reduce((sum, a) => sum + a.assisted.orderCount, 0);

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 sm:p-6">
      <div>
        <h1 className="font-display text-xl font-semibold text-foreground">Marketing Analytics</h1>
        <p className="text-sm text-muted-foreground">
          Campaign performance and attribution, computed live — never an inflated single &quot;campaign revenue&quot; number.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Campaign-Attributed Sales</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Direct Orders</p>
            <p className="text-lg font-semibold">{totalDirectOrders}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Direct Revenue</p>
            <p className="text-lg font-semibold">{formatCurrency(totalDirectRevenue)}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Assisted Orders</p>
            <p className="text-lg font-semibold">{totalAssistedOrders}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Assisted Revenue</p>
            <p className="text-lg font-semibold">{formatCurrency(totalAssistedRevenue)}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Campaign Performance</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Campaign</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Sent</TableHead>
                <TableHead>Delivery Rate</TableHead>
                <TableHead>Read Rate</TableHead>
                <TableHead>Reply Rate</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {campaigns.map((c, i) => (
                <TableRow key={c.id}>
                  <TableCell>
                    <Link href={`/ai-marketing/campaigns/${c.id}`} className="font-medium text-gold hover:underline">
                      {c.name}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <CampaignStatusBadge status={c.status} />
                  </TableCell>
                  <TableCell>{analyticsRows[i].sentTotal}</TableCell>
                  <TableCell>{analyticsRows[i].deliveryRate}%</TableCell>
                  <TableCell>{analyticsRows[i].readRate}%</TableCell>
                  <TableCell>{analyticsRows[i].replyRate}%</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {campaigns.length === 0 && <p className="p-4 text-sm text-muted-foreground">No campaigns yet.</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>AI Usage This Month</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Provider</TableHead>
                <TableHead>Operation</TableHead>
                <TableHead>Calls</TableHead>
                <TableHead>Input Tokens</TableHead>
                <TableHead>Output Tokens</TableHead>
                <TableHead>Estimated Cost</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {aiUsage.map((row) => (
                <TableRow key={`${row.provider}-${row.model}-${row.operation}`}>
                  <TableCell>
                    {row.provider} ({row.model})
                  </TableCell>
                  <TableCell>{row.operation}</TableCell>
                  <TableCell>{row.callCount}</TableCell>
                  <TableCell>{row.totalInputTokens}</TableCell>
                  <TableCell>{row.totalOutputTokens}</TableCell>
                  <TableCell>{formatCurrency(row.totalEstimatedCost)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {aiUsage.length === 0 && <p className="p-4 text-sm text-muted-foreground">No AI calls recorded this month.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
