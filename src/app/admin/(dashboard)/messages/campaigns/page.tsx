"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, Badge } from "@/components/admin/Card";
import { Select } from "@/components/ui/Input";
import { formatDateTime } from "@/lib/format";

interface Campaign {
  id: string;
  name: string;
  channel: string;
  status: string;
  totalRecipients: number;
  sentCount: number;
  failedCount: number;
  createdAt: string;
  template: { name: string } | null;
  group: { name: string } | null;
  createdByAdmin: { name: string } | null;
}

const STATUS_TONE: Record<string, "neutral" | "success" | "warning" | "danger" | "gold"> = {
  DRAFT: "neutral",
  QUEUED: "gold",
  SENDING: "warning",
  SENT: "success",
  FAILED: "danger",
  PARTIAL: "warning",
};

export default function CampaignsPage() {
  const [items, setItems] = useState<Campaign[]>([]);
  const [status, setStatus] = useState("");

  async function load() {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    const res = await fetch(`/api/admin/messages/campaigns?${params.toString()}`);
    const data = await res.json();
    setItems(data.items ?? []);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl text-maroon">Sent Messages</h1>

      <Card>
        <div className="mb-4">
          <Select value={status} onChange={(e) => setStatus(e.target.value)} className="max-w-[200px]">
            <option value="">All</option>
            <option value="SENT">Sent</option>
            <option value="PARTIAL">Partial</option>
            <option value="FAILED">Failed</option>
          </Select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gold/15 text-left text-xs uppercase text-brown-light">
                <th className="py-2">Campaign</th>
                <th>Channel</th>
                <th>Audience</th>
                <th>Recipients</th>
                <th>Sent / Failed</th>
                <th>Status</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {items.map((c) => (
                <tr key={c.id} className="border-b border-gold/10">
                  <td className="py-2"><Link href={`/admin/messages/campaigns/${c.id}`} className="text-maroon hover:underline">{c.name}</Link></td>
                  <td>{c.channel}</td>
                  <td className="text-xs text-brown-light">{c.group?.name ?? "Segment"}</td>
                  <td>{c.totalRecipients}</td>
                  <td>{c.sentCount} / {c.failedCount}</td>
                  <td><Badge tone={STATUS_TONE[c.status]}>{c.status}</Badge></td>
                  <td className="text-xs text-brown-light">{formatDateTime(c.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {items.length === 0 && <p className="py-8 text-center text-brown-light">No campaigns sent yet.</p>}
        </div>
      </Card>
    </div>
  );
}
