import Link from "next/link";
import { Plus } from "lucide-react";
import { listCampaigns } from "@/services/campaign.service";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { CampaignStatusBadge } from "@/components/ai-marketing/campaign-status-badge";

export const metadata = { title: "Campaigns | Zarghoon Jewellers" };

export default async function CampaignsPage() {
  const campaigns = await listCampaigns();

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl font-semibold text-foreground">Campaigns</h1>
          <p className="text-sm text-muted-foreground">Every campaign, from draft through completion.</p>
        </div>
        <Button asChild>
          <Link href="/ai-marketing/campaigns/new">
            <Plus className="size-4" /> New Campaign
          </Link>
        </Button>
      </div>

      {campaigns.length === 0 ? (
        <p className="text-sm text-muted-foreground">No campaigns yet. Create your first one to get started.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created By</TableHead>
              <TableHead>Scheduled</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {campaigns.map((c) => (
              <TableRow key={c.id}>
                <TableCell>
                  <Link href={`/ai-marketing/campaigns/${c.id}`} className="font-medium text-gold hover:underline">
                    {c.name}
                  </Link>
                </TableCell>
                <TableCell>{c.campaignType.replace(/_/g, " ")}</TableCell>
                <TableCell>
                  <CampaignStatusBadge status={c.status} />
                </TableCell>
                <TableCell>{c.createdBy.name}</TableCell>
                <TableCell>{c.scheduledAt ? new Date(c.scheduledAt).toLocaleDateString() : "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
