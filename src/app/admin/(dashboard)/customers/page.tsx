"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Card, Badge } from "@/components/admin/Card";
import { Input, Select } from "@/components/ui/Input";
import { formatDate } from "@/lib/format";

interface CustomerRow {
  id: string;
  fullName: string;
  mobile: string;
  email: string | null;
  dob: string;
  createdAt: string;
  customerType: "REGULAR" | "VIP";
  marketingConsent: boolean;
  totalPurchases: number;
  lastPurchase: string | null;
  birthdayStatus: string;
}

const GROUPS = [
  { value: "", label: "All Customers" },
  { value: "new", label: "New Customers" },
  { value: "vip", label: "VIP Customers" },
  { value: "birthday_month", label: "Birthday This Month" },
  { value: "purchased", label: "Purchased" },
  { value: "inactive", label: "Inactive" },
];

export default function CustomersPage() {
  const [items, setItems] = useState<CustomerRow[]>([]);
  const [search, setSearch] = useState("");
  const [group, setGroup] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (group) params.set("group", group);
    params.set("pageSize", "200");
    const res = await fetch(`/api/admin/customers?${params.toString()}`);
    const data = await res.json();
    setItems(data.items ?? []);
  }, [search, group]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  function toggle(id: string) {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected((s) => (s.size === items.length ? new Set() : new Set(items.map((i) => i.id))));
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl text-maroon">Customers</h1>
        {selected.size > 0 && (
          <Link
            href={`/admin/customers/marketing?customerIds=${Array.from(selected).join(",")}`}
            className="rounded-sm bg-maroon px-4 py-2 text-xs font-medium text-cream"
          >
            Message {selected.size} Selected
          </Link>
        )}
      </div>

      <Card>
        <div className="mb-4 flex flex-wrap gap-3">
          <Input placeholder="Search by name, mobile, email…" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
          <Select value={group} onChange={(e) => setGroup(e.target.value)} className="max-w-[200px]">
            {GROUPS.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
          </Select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gold/15 text-left text-xs uppercase text-brown-light">
                <th className="py-2"><input type="checkbox" checked={selected.size === items.length && items.length > 0} onChange={toggleAll} /></th>
                <th>Name</th>
                <th>Mobile</th>
                <th>DOB</th>
                <th>Registered</th>
                <th>Purchases</th>
                <th>Type</th>
                <th>Marketing</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {items.map((c) => (
                <tr key={c.id} className="border-b border-gold/10">
                  <td className="py-2"><input type="checkbox" checked={selected.has(c.id)} onChange={() => toggle(c.id)} /></td>
                  <td>
                    <Link href={`/admin/customers/${c.id}`} className="text-maroon hover:underline">{c.fullName}</Link>
                    {c.birthdayStatus === "today" && <span className="ml-1">🎂</span>}
                  </td>
                  <td>{c.mobile}</td>
                  <td>{formatDate(c.dob)}</td>
                  <td>{formatDate(c.createdAt)}</td>
                  <td>{c.totalPurchases}</td>
                  <td><Badge tone={c.customerType === "VIP" ? "gold" : "neutral"}>{c.customerType}</Badge></td>
                  <td><Badge tone={c.marketingConsent ? "success" : "neutral"}>{c.marketingConsent ? "Opted In" : "Opted Out"}</Badge></td>
                  <td>
                    <Link href={`/admin/customers/marketing?customerIds=${c.id}`} className="text-xs text-maroon hover:underline">
                      Send Message
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {items.length === 0 && <p className="py-8 text-center text-brown-light">No customers found.</p>}
        </div>
      </Card>
    </div>
  );
}
