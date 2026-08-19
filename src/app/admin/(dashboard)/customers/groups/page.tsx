"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { Trash2, Users } from "lucide-react";
import { Card } from "@/components/admin/Card";
import { Input, Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

interface Group {
  id: string;
  name: string;
  description: string | null;
  _count: { members: number };
}

interface CustomerLite {
  id: string;
  fullName: string;
  mobile: string;
}

export default function CustomerGroupsPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [customers, setCustomers] = useState<CustomerLite[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  async function loadGroups() {
    const res = await fetch("/api/admin/customer-groups");
    const data = await res.json();
    setGroups(data.groups ?? []);
  }

  async function loadCustomers() {
    const res = await fetch("/api/admin/customers?pageSize=500");
    const data = await res.json();
    setCustomers(data.items ?? []);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadGroups();
    loadCustomers();
  }, []);

  function toggle(id: string) {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await fetch("/api/admin/customer-groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description, customerIds: Array.from(selected) }),
      });
      setName("");
      setDescription("");
      setSelected(new Set());
      loadGroups();
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(id: string) {
    if (!confirm("Delete this group?")) return;
    await fetch(`/api/admin/customer-groups/${id}`, { method: "DELETE" });
    loadGroups();
  }

  const filteredCustomers = customers.filter((c) =>
    !search || c.fullName.toLowerCase().includes(search.toLowerCase()) || c.mobile.includes(search),
  );

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl text-maroon">Customer Groups</h1>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Saved Groups">
          {groups.length === 0 ? (
            <p className="text-sm text-brown-light">No custom groups yet. Create one alongside the built-in segments (All, New, VIP, Birthday, Purchased, Inactive) used in Marketing.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-gold/10">
              {groups.map((g) => (
                <li key={g.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="font-medium text-brown flex items-center gap-2"><Users className="h-4 w-4 text-gold-dark" /> {g.name}</p>
                    <p className="text-xs text-brown-light">{g._count.members} member(s) {g.description && `· ${g.description}`}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Link href={`/admin/customers/marketing?groupId=${g.id}`} className="text-xs text-maroon hover:underline">Message</Link>
                    <button onClick={() => onDelete(g.id)} className="text-brown-light hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Create New Group">
          <form onSubmit={onSubmit} className="flex flex-col gap-4">
            <Input label="Group Name" required value={name} onChange={(e) => setName(e.target.value)} />
            <Textarea label="Description" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
            <Input label="Search customers" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Name or mobile…" />
            <div className="max-h-64 overflow-y-auto rounded-sm border border-cream-dark thin-scrollbar">
              {filteredCustomers.map((c) => (
                <label key={c.id} className="flex items-center gap-2 border-b border-cream-dark/60 px-3 py-2 text-sm last:border-0">
                  <input type="checkbox" checked={selected.has(c.id)} onChange={() => toggle(c.id)} className="h-4 w-4 accent-maroon" />
                  {c.fullName} <span className="text-xs text-brown-light">({c.mobile})</span>
                </label>
              ))}
            </div>
            <p className="text-xs text-brown-light">{selected.size} customer(s) selected</p>
            <Button type="submit" loading={saving}>Create Group</Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
