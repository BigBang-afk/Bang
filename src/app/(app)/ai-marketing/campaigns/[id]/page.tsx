import { notFound } from "next/navigation";
import { getCampaignById } from "@/services/campaign.service";
import { getCampaignAnalytics, getCampaignAttribution } from "@/services/campaign-analytics.service";
import { resolveAudience, type AudienceFilters } from "@/services/audience-builder.service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CampaignStatusBadge } from "@/components/ai-marketing/campaign-status-badge";
import { CampaignActionsPanel } from "@/components/ai-marketing/campaign-actions-panel";
import { formatCurrency } from "@/lib/format";

export default async function CampaignDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const campaign = await getCampaignById(id);
  if (!campaign) notFound();

  const [audience, analytics, attribution] = await Promise.all([
    resolveAudience((campaign.audienceFilters as AudienceFilters) ?? {}, id),
    getCampaignAnalytics(id),
    getCampaignAttribution(id),
  ]);

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-xl font-semibold text-foreground">{campaign.name}</h1>
            <CampaignStatusBadge status={campaign.status} />
          </div>
          <p className="text-sm text-muted-foreground">
            {campaign.campaignType.replace(/_/g, " ")} · {campaign.objective} · Created by {campaign.createdBy.name}
          </p>
        </div>
        <CampaignActionsPanel campaignId={campaign.id} status={campaign.status} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Message</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="whitespace-pre-wrap rounded-md border border-border bg-surface-elevated p-3 text-sm">{campaign.messageTemplate}</p>
          {campaign.offer && <p className="mt-2 text-sm text-muted-foreground">Offer: {campaign.offer}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Audience</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <Stat label="Audience" value={audience.matchedCount} />
          <Stat label="Eligible" value={audience.eligibleCount} highlight />
          <Stat label="Opted out / no consent" value={audience.excludedNotOptedIn} />
          <Stat label="Recently contacted" value={audience.excludedRecentlyContacted} />
          <Stat label="Manually excluded" value={audience.excludedManually} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Message Results</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Queued" value={analytics.queued} />
          <Stat label="Sent" value={analytics.sentTotal} />
          <Stat label="Delivered" value={analytics.delivered} />
          <Stat label="Read" value={analytics.read} />
          <Stat label="Failed" value={analytics.failed} />
          <Stat label="Replies" value={analytics.replies} />
          <Stat label="Delivery Rate" value={`${analytics.deliveryRate}%`} />
          <Stat label="Read Rate" value={`${analytics.readRate}%`} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            Attribution <Badge variant="neutral">{attribution.attributionWindowDays}-day window</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Direct orders" value={attribution.direct.orderCount} />
          <Stat label="Direct revenue" value={formatCurrency(attribution.direct.revenue)} />
          <Stat label="Assisted orders" value={attribution.assisted.orderCount} />
          <Stat label="Assisted revenue" value={formatCurrency(attribution.assisted.revenue)} />
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string | number; highlight?: boolean }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`text-lg font-semibold ${highlight ? "text-success" : "text-foreground"}`}>{value}</p>
    </div>
  );
}
