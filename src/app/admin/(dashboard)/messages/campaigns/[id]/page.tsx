"use client";

import { useEffect, useState, use as usePromise } from "react";
import { Card, Badge } from "@/components/admin/Card";
import { formatDateTime } from "@/lib/format";

interface CampaignDetail {
  id: string;
  name: string;
  channel: string;
  status: string;
  body: string;
  totalRecipients: number;
  sentCount: number;
  failedCount: number;
  createdAt: string;
  recipients: {
    id: string;
    status: string;
    errorMessage: string | null;
    renderedBody: string;
    sentAt: string | null;
    customer: { fullName: string; mobile: string };
  }[];
}

const STATUS_TONE: Record<string, "neutral" | "success" | "warning" | "danger" | "gold"> = {
  PENDING: "neutral",
  SENT: "success",
  DELIVERED: "success",
  FAILED: "danger",
};

export default function CampaignDetailPage({ params }: PageProps<"/admin/messages/campaigns/[id]">) {
  const { id } = usePromise(params);
  const [campaign, setCampaign] = useState<CampaignDetail | null>(null);

  useEffect(() => {
    fetch(`/api/admin/messages/campaigns/${id}`).then((r) => r.json()).then((d) => setCampaign(d.campaign));
  }, [id]);

  if (!campaign) return <p className="text-brown-light">Loading…</p>;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl text-maroon">{campaign.name}</h1>

      <Card title="Message">
        <p className="whitespace-pre-wrap rounded-sm bg-cream-dark/50 p-4 text-sm">{campaign.body}</p>
        <p className="mt-3 text-xs text-brown-light">
          {campaign.channel} · Sent {formatDateTime(campaign.createdAt)} · {campaign.sentCount} sent / {campaign.failedCount} failed of {campaign.totalRecipients}
        </p>
      </Card>

      <Card title="Delivery Status">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gold/15 text-left text-xs uppercase text-brown-light">
                <th className="py-2">Customer</th>
                <th>Mobile</th>
                <th>Status</th>
                <th>Error</th>
                <th>Sent At</th>
              </tr>
            </thead>
            <tbody>
              {campaign.recipients.map((r) => (
                <tr key={r.id} className="border-b border-gold/10">
                  <td className="py-2">{r.customer.fullName}</td>
                  <td>{r.customer.mobile}</td>
                  <td><Badge tone={STATUS_TONE[r.status]}>{r.status}</Badge></td>
                  <td className="max-w-xs truncate text-xs text-red-600">{r.errorMessage ?? "—"}</td>
                  <td className="text-xs text-brown-light">{r.sentAt ? formatDateTime(r.sentAt) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
