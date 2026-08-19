"use client";

import { useEffect, useState, use as usePromise } from "react";
import { Card, Badge } from "@/components/admin/Card";
import { Select, Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { formatDateTime, formatPkr, formatWeight, purityLabel } from "@/lib/format";

interface OrderDetail {
  id: string;
  orderNumber: string;
  status: string;
  notes: string | null;
  createdAt: string;
  customer: { fullName: string; mobile: string; email: string | null } | null;
  guestName: string | null;
  guestMobile: string | null;
  items: {
    id: string;
    productNameAtOrder: string;
    purityAtOrder: "K24" | "K21" | "K18";
    grossWeightAtOrder: string;
    goldRatePerGramAtOrder: string;
    finalPriceAtOrder: string;
  }[];
}

export default function OrderDetailPage({ params }: PageProps<"/admin/orders/[id]">) {
  const { id } = usePromise(params);
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [status, setStatus] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    const res = await fetch(`/api/admin/orders/${id}`);
    const data = await res.json();
    setOrder(data.order);
    setStatus(data.order?.status ?? "");
    setNotes(data.order?.notes ?? "");
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function onSave() {
    setSaving(true);
    try {
      await fetch(`/api/admin/orders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, notes }),
      });
      load();
    } finally {
      setSaving(false);
    }
  }

  if (!order) return <p className="text-brown-light">Loading…</p>;

  const total = order.items.reduce((s, i) => s + Number(i.finalPriceAtOrder), 0);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl text-maroon">{order.orderNumber}</h1>
        <Badge>{order.status}</Badge>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card title="Customer" className="h-fit">
          <p className="font-medium text-brown">{order.customer?.fullName ?? order.guestName ?? "Guest"}</p>
          <p className="text-sm text-brown-light">{order.customer?.mobile ?? order.guestMobile}</p>
          {order.customer?.email && <p className="text-sm text-brown-light">{order.customer.email}</p>}
          <p className="mt-3 text-xs text-brown-light">Placed {formatDateTime(order.createdAt)}</p>
        </Card>

        <Card title="Items" className="lg:col-span-2">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gold/15 text-left text-xs uppercase text-brown-light">
                  <th className="py-2">Product</th>
                  <th>Purity</th>
                  <th>Weight</th>
                  <th>Rate Used</th>
                  <th>Price</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((i) => (
                  <tr key={i.id} className="border-b border-gold/10">
                    <td className="py-2">{i.productNameAtOrder}</td>
                    <td>{purityLabel(i.purityAtOrder)}</td>
                    <td>{formatWeight(i.grossWeightAtOrder)}</td>
                    <td>{formatPkr(Number(i.goldRatePerGramAtOrder), 0)}/g</td>
                    <td>{formatPkr(Number(i.finalPriceAtOrder))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-right font-display text-lg text-maroon">Total: {formatPkr(total)}</p>
        </Card>
      </div>

      <Card title="Update Status">
        <div className="grid gap-4 sm:grid-cols-2">
          <Select label="Status" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="NEW">New</option>
            <option value="PENDING">Pending</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
          </Select>
        </div>
        <Textarea label="Notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} className="mt-4" />
        <Button className="mt-4" loading={saving} onClick={onSave}>Save</Button>
      </Card>
    </div>
  );
}
