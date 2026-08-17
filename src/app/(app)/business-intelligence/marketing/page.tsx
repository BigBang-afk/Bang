import { getMarketingAnalyticsSummary } from "@/services/bi-marketing-analytics.service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/format";

export const metadata = { title: "Marketing Analytics | Zarghoon Jewellers" };

export default async function MarketingAnalyticsPage() {
  const marketing = await getMarketingAnalyticsSummary();

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 sm:p-6">
      <div>
        <h1 className="font-display text-xl font-semibold text-foreground">Marketing Analytics</h1>
        <p className="text-sm text-muted-foreground">Rolled up from Phase 7&apos;s campaign data — DIRECT and ASSISTED attribution are always kept separate.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ["Campaigns", marketing.campaignCount],
          ["Active Campaigns", marketing.activeCampaigns],
          ["Messages Sent", marketing.messagesSent],
          ["Delivered", marketing.messagesDelivered],
          ["Read", marketing.messagesRead],
          ["Replies", marketing.replies],
          ["Delivery Rate", `${marketing.deliveryRatePercent}%`],
          ["Read Rate", `${marketing.readRatePercent}%`],
          ["Reply Rate", `${marketing.replyRatePercent}%`],
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
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Attributed Revenue</CardTitle>
          <Badge variant="neutral">Never combined into one figure</Badge>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">DIRECT ATTRIBUTION</p>
              <p className="mt-1 text-lg font-semibold text-foreground">{formatCurrency(marketing.directRevenue)}</p>
              <p className="text-xs text-muted-foreground">{marketing.directOrders} orders</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">ASSISTED ATTRIBUTION</p>
              <p className="mt-1 text-lg font-semibold text-foreground">{formatCurrency(marketing.assistedRevenue)}</p>
              <p className="text-xs text-muted-foreground">{marketing.assistedOrders} orders</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
