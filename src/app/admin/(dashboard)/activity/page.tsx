"use client";

import { useEffect, useState } from "react";
import { Card, Badge } from "@/components/admin/Card";
import { formatDateTime } from "@/lib/format";

interface ActivityItem {
  id: string;
  action: string;
  description: string | null;
  ipAddress: string | null;
  createdAt: string;
  admin: { name: string; email: string } | null;
}

export default function ActivityPage() {
  const [items, setItems] = useState<ActivityItem[]>([]);

  useEffect(() => {
    fetch("/api/admin/activity?pageSize=100").then((r) => r.json()).then((d) => setItems(d.items ?? []));
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl text-maroon">Admin Activity Log</h1>
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gold/15 text-left text-xs uppercase text-brown-light">
                <th className="py-2">Admin</th>
                <th>Action</th>
                <th>Description</th>
                <th>IP</th>
                <th>Date &amp; Time</th>
              </tr>
            </thead>
            <tbody>
              {items.map((a) => (
                <tr key={a.id} className="border-b border-gold/10">
                  <td className="py-2">{a.admin?.name ?? "System"}</td>
                  <td><Badge tone="gold">{a.action.replace(/_/g, " ")}</Badge></td>
                  <td className="text-brown-light">{a.description}</td>
                  <td className="text-xs text-brown-light">{a.ipAddress ?? "—"}</td>
                  <td className="text-xs text-brown-light">{formatDateTime(a.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {items.length === 0 && <p className="py-8 text-center text-brown-light">No activity recorded yet.</p>}
        </div>
      </Card>
    </div>
  );
}
