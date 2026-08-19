"use client";

import { useEffect, useState, use as usePromise } from "react";
import { useRouter } from "next/navigation";
import { Card, Badge } from "@/components/admin/Card";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { formatDate, formatDateTime, formatPkr } from "@/lib/format";

interface CustomerDetail {
  id: string;
  fullName: string;
  mobile: string;
  email: string | null;
  dob: string;
  createdAt: string;
  customerType: "REGULAR" | "VIP";
  marketingConsent: boolean;
  isActive: boolean;
  notes: string | null;
  orders: { id: string; orderNumber: string; status: string; createdAt: string; items: { finalPriceAtOrder: string }[] }[];
  wishlist: { id: string; product: { name: string } }[];
  messageRecipients: { id: string; status: string; sentAt: string | null; createdAt: string; campaign: { name: string; channel: string } }[];
}

export default function CustomerDetailPage({ params }: PageProps<"/admin/customers/[id]">) {
  const { id } = usePromise(params);
  const router = useRouter();
  const [customer, setCustomer] = useState<CustomerDetail | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function load() {
    const res = await fetch(`/api/admin/customers/${id}`);
    const data = await res.json();
    setCustomer(data.customer);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    if (!customer) return;
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/customers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: customer.fullName,
          email: customer.email ?? "",
          customerType: customer.customerType,
          marketingConsent: customer.marketingConsent,
          isActive: customer.isActive,
          notes: customer.notes ?? "",
        }),
      });
      setMessage(res.ok ? "Saved." : "Failed to save.");
    } finally {
      setSaving(false);
    }
  }

  async function onDelete() {
    if (!confirm("Delete this customer? This cannot be undone.")) return;
    await fetch(`/api/admin/customers/${id}`, { method: "DELETE" });
    router.push("/admin/customers");
  }

  if (!customer) return <p className="text-brown-light">Loading…</p>;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl text-maroon">{customer.fullName}</h1>
        <Button variant="danger" size="sm" onClick={onDelete}>Delete Customer</Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card title="Profile" className="h-fit">
          <form onSubmit={onSave} className="flex flex-col gap-4">
            <Input label="Full Name" value={customer.fullName} onChange={(e) => setCustomer({ ...customer, fullName: e.target.value })} />
            <Input label="Mobile" value={customer.mobile} disabled />
            <Input label="Email" value={customer.email ?? ""} onChange={(e) => setCustomer({ ...customer, email: e.target.value })} />
            <Input label="Date of Birth" value={formatDate(customer.dob)} disabled />
            <Input label="Registered" value={formatDate(customer.createdAt)} disabled />
            <Select label="Customer Type" value={customer.customerType} onChange={(e) => setCustomer({ ...customer, customerType: e.target.value as "REGULAR" | "VIP" })}>
              <option value="REGULAR">Regular</option>
              <option value="VIP">VIP</option>
            </Select>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={customer.marketingConsent} onChange={(e) => setCustomer({ ...customer, marketingConsent: e.target.checked })} className="h-4 w-4 accent-maroon" />
              Marketing consent
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={customer.isActive} onChange={(e) => setCustomer({ ...customer, isActive: e.target.checked })} className="h-4 w-4 accent-maroon" />
              Active account
            </label>
            <Textarea label="Notes" rows={3} value={customer.notes ?? ""} onChange={(e) => setCustomer({ ...customer, notes: e.target.value })} />
            {message && <p className="text-sm text-brown-light">{message}</p>}
            <Button type="submit" loading={saving}>Save Changes</Button>
          </form>
        </Card>

        <div className="flex flex-col gap-6 lg:col-span-2">
          <Card title="Order &amp; Inquiry History">
            {customer.orders.length === 0 ? (
              <p className="text-sm text-brown-light">No orders yet.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {customer.orders.map((o) => (
                  <li key={o.id} className="flex items-center justify-between rounded-sm border border-gold/15 px-3 py-2 text-sm">
                    <span>{o.orderNumber}</span>
                    <Badge>{o.status}</Badge>
                    <span>{formatPkr(o.items.reduce((s, i) => s + Number(i.finalPriceAtOrder), 0), 0)}</span>
                    <span className="text-xs text-brown-light">{formatDate(o.createdAt)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title="Wishlist">
            {customer.wishlist.length === 0 ? (
              <p className="text-sm text-brown-light">No saved products.</p>
            ) : (
              <ul className="flex flex-wrap gap-2">
                {customer.wishlist.map((w) => (
                  <li key={w.id}><Badge tone="gold">{w.product.name}</Badge></li>
                ))}
              </ul>
            )}
          </Card>

          <Card title="Message History">
            {customer.messageRecipients.length === 0 ? (
              <p className="text-sm text-brown-light">No messages sent yet.</p>
            ) : (
              <ul className="flex flex-col gap-2 text-sm">
                {customer.messageRecipients.map((m) => (
                  <li key={m.id} className="flex items-center justify-between rounded-sm border border-gold/15 px-3 py-2">
                    <span>{m.campaign.name} ({m.campaign.channel})</span>
                    <Badge tone={m.status === "SENT" || m.status === "DELIVERED" ? "success" : m.status === "FAILED" ? "danger" : "neutral"}>{m.status}</Badge>
                    <span className="text-xs text-brown-light">{formatDateTime(m.createdAt)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
