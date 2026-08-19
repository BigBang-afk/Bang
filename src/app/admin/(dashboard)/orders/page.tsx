"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Card, Badge } from "@/components/admin/Card";
import { Input, Select } from "@/components/ui/Input";
import { formatDateTime, formatPkr } from "@/lib/format";

interface OrderRow {
  id: string;
  orderNumber: string;
  status: string;
  createdAt: string;
  customer: { fullName: string; mobile: string } | null;
  guestName: string | null;
  guestMobile: string | null;
  items: { finalPriceAtOrder: string }[];
}

const STATUS_TONE: Record<string, "neutral" | "success" | "warning" | "danger" | "gold"> = {
  NEW: "gold",
  PENDING: "warning",
  CONFIRMED: "neutral",
  COMPLETED: "success",
  CANCELLED: "danger",
};

export default function OrdersPage() {
  const [items, setItems] = useState<OrderRow[]>([]);
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (search) params.set("search", search);
    params.set("pageSize", "100");
    const res = await fetch(`/api/admin/orders?${params.toString()}`);
    const data = await res.json();
    setItems(data.items ?? []);
  }, [status, search]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl text-maroon">Orders / Inquiries</h1>

      <Card>
        <div className="mb-4 flex flex-wrap gap-3">
          <Input placeholder="Search order #, name, mobile…" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
          <Select value={status} onChange={(e) => setStatus(e.target.value)} className="max-w-[180px]">
            <option value="">All Statuses</option>
            <option value="NEW">New</option>
            <option value="PENDING">Pending</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
          </Select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gold/15 text-left text-xs uppercase text-brown-light">
                <th className="py-2">Order #</th>
                <th>Customer</th>
                <th>Mobile</th>
                <th>Total</th>
                <th>Status</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {items.map((o) => (
                <tr key={o.id} className="border-b border-gold/10">
                  <td className="py-2"><Link href={`/admin/orders/${o.id}`} className="text-maroon hover:underline">{o.orderNumber}</Link></td>
                  <td>{o.customer?.fullName ?? o.guestName ?? "Guest"}</td>
                  <td>{o.customer?.mobile ?? o.guestMobile ?? "—"}</td>
                  <td>{formatPkr(o.items.reduce((s, i) => s + Number(i.finalPriceAtOrder), 0), 0)}</td>
                  <td><Badge tone={STATUS_TONE[o.status]}>{o.status}</Badge></td>
                  <td className="text-xs text-brown-light">{formatDateTime(o.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {items.length === 0 && <p className="py-8 text-center text-brown-light">No orders found.</p>}
        </div>
      </Card>
    </div>
  );
}
