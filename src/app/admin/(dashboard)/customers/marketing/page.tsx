"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Card, Badge } from "@/components/admin/Card";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

interface Template {
  id: string;
  name: string;
  type: string;
  channel: "SMS" | "WHATSAPP";
  body: string;
}
interface Group {
  id: string;
  name: string;
  _count: { members: number };
}
interface CustomerLite {
  id: string;
  fullName: string;
  mobile: string;
  customerType: string;
}

const BUILT_IN_GROUPS = [
  { value: "all", label: "All Customers" },
  { value: "new_customers", label: "New Customers" },
  { value: "vip", label: "VIP Customers" },
  { value: "birthday_customers", label: "Birthday Customers" },
  { value: "purchased", label: "Customers Who Purchased" },
  { value: "inactive", label: "Inactive Customers" },
];

function MarketingComposer() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [templates, setTemplates] = useState<Template[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [customers, setCustomers] = useState<CustomerLite[]>([]);

  const initialCustomerIds = searchParams.get("customerIds")?.split(",").filter(Boolean) ?? [];
  const initialGroupId = searchParams.get("groupId") ?? "";

  const [audienceMode, setAudienceMode] = useState<"segment" | "selected">(
    initialCustomerIds.length ? "selected" : "segment",
  );
  const [groupKey, setGroupKey] = useState(initialGroupId || "all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(initialCustomerIds));
  const [search, setSearch] = useState("");

  const [name, setName] = useState("New Campaign");
  const [channel, setChannel] = useState<"SMS" | "WHATSAPP">("SMS");
  const [templateId, setTemplateId] = useState("");
  const [body, setBody] = useState("");

  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ sentCount: number; failedCount: number; status: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/messages/templates").then((r) => r.json()).then((d) => setTemplates(d.templates ?? []));
    fetch("/api/admin/customer-groups").then((r) => r.json()).then((d) => setGroups(d.groups ?? []));
    fetch("/api/admin/customers?pageSize=500").then((r) => r.json()).then((d) => setCustomers(d.items ?? []));
  }, []);

  useEffect(() => {
    const templateParam = searchParams.get("template");
    if (templateParam && templates.length) {
      const match = templates.find((t) => t.type.toLowerCase() === templateParam.toLowerCase());
      if (match) {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing selected template from the ?template= URL param on load
        setTemplateId(match.id);
        setBody(match.body);
        setChannel(match.channel);
        setName(match.name);
      }
    }
  }, [templates, searchParams]);

  function applyTemplate(id: string) {
    setTemplateId(id);
    const t = templates.find((x) => x.id === id);
    if (t) {
      setBody(t.body);
      setChannel(t.channel);
      setName(t.name);
    }
  }

  function toggleCustomer(id: string) {
    setSelectedIds((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAllFiltered() {
    setSelectedIds(new Set(filteredCustomers.map((c) => c.id)));
  }

  const filteredCustomers = customers.filter(
    (c) => !search || c.fullName.toLowerCase().includes(search.toLowerCase()) || c.mobile.includes(search),
  );

  const previewBody = body
    .replace(/\{customer_name\}/g, "Ahmed Khan")
    .replace(/\{store_name\}/g, "Zarghoon Jewellers")
    .replace(/\{gold_rate\}/g, "25,800")
    .replace(/\{phone\}/g, "+92 300 0000000")
    .replace(/\{date\}/g, new Date().toLocaleDateString());

  async function onSend() {
    setSending(true);
    setError(null);
    setResult(null);
    try {
      const payload =
        audienceMode === "selected"
          ? { groupKey: "selected", customerIds: Array.from(selectedIds) }
          : { groupKey };

      const res = await fetch("/api/admin/messages/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, templateId: templateId || null, channel, body, ...payload }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to send campaign.");
        return;
      }
      setResult({ sentCount: data.campaign.sentCount, failedCount: data.campaign.failedCount, status: data.campaign.status });
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl text-maroon">Customer Marketing</h1>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <Card title="1. Choose Audience">
            <div className="mb-4 flex gap-2">
              <button
                onClick={() => setAudienceMode("segment")}
                className={`rounded-full border px-4 py-1.5 text-xs font-medium ${audienceMode === "segment" ? "border-maroon bg-maroon text-cream" : "border-cream-dark text-brown-light"}`}
              >
                Segment / Group
              </button>
              <button
                onClick={() => setAudienceMode("selected")}
                className={`rounded-full border px-4 py-1.5 text-xs font-medium ${audienceMode === "selected" ? "border-maroon bg-maroon text-cream" : "border-cream-dark text-brown-light"}`}
              >
                Select Individually
              </button>
            </div>

            {audienceMode === "segment" ? (
              <Select label="Audience" value={groupKey} onChange={(e) => setGroupKey(e.target.value)}>
                <optgroup label="Built-in Segments">
                  {BUILT_IN_GROUPS.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
                </optgroup>
                {groups.length > 0 && (
                  <optgroup label="Saved Groups">
                    {groups.map((g) => <option key={g.id} value={g.id}>{g.name} ({g._count.members})</option>)}
                  </optgroup>
                )}
              </Select>
            ) : (
              <div>
                <div className="mb-2 flex gap-2">
                  <Input placeholder="Search customers…" value={search} onChange={(e) => setSearch(e.target.value)} />
                  <Button type="button" variant="outline" size="sm" onClick={selectAllFiltered}>Select All</Button>
                </div>
                <div className="max-h-72 overflow-y-auto rounded-sm border border-cream-dark thin-scrollbar">
                  {filteredCustomers.map((c) => (
                    <label key={c.id} className="flex items-center gap-2 border-b border-cream-dark/60 px-3 py-2 text-sm last:border-0">
                      <input type="checkbox" checked={selectedIds.has(c.id)} onChange={() => toggleCustomer(c.id)} className="h-4 w-4 accent-maroon" />
                      {c.fullName} <span className="text-xs text-brown-light">({c.mobile})</span>
                      {c.customerType === "VIP" && <Badge tone="gold">VIP</Badge>}
                    </label>
                  ))}
                </div>
                <p className="mt-2 text-xs text-brown-light">{selectedIds.size} customer(s) selected</p>
              </div>
            )}
          </Card>

          <Card title="2. Compose Message">
            <div className="flex flex-col gap-4">
              <Input label="Campaign Name" value={name} onChange={(e) => setName(e.target.value)} />
              <div className="grid grid-cols-2 gap-4">
                <Select label="Channel" value={channel} onChange={(e) => setChannel(e.target.value as "SMS" | "WHATSAPP")}>
                  <option value="SMS">SMS</option>
                  <option value="WHATSAPP">WhatsApp</option>
                </Select>
                <Select label="Use Template" value={templateId} onChange={(e) => applyTemplate(e.target.value)}>
                  <option value="">Custom message</option>
                  {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </Select>
              </div>
              <Textarea
                label="Message Body"
                rows={5}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                hint="Placeholders: {customer_name}, {gold_rate}, {store_name}, {phone}, {date}"
              />
            </div>
          </Card>
        </div>

        <div className="flex flex-col gap-6">
          <Card title="Message Preview">
            <div className="rounded-sm bg-cream-dark/50 p-4 text-sm text-brown">
              {previewBody || <span className="italic text-brown-light">Your message will appear here…</span>}
            </div>
            <p className="mt-2 text-xs text-brown-light">Preview uses sample data — actual sends personalize each recipient.</p>
          </Card>

          <Card title="3. Send">
            {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
            {result && (
              <div className="mb-3 rounded-sm border border-gold/30 bg-gold-light/30 p-3 text-sm">
                <p>Status: <Badge tone={result.status === "SENT" ? "success" : result.status === "FAILED" ? "danger" : "warning"}>{result.status}</Badge></p>
                <p className="mt-1">✓ {result.sentCount} sent · ✗ {result.failedCount} failed</p>
                {result.failedCount > 0 && (
                  <p className="mt-1 text-xs text-brown-light">
                    Failures usually mean no SMS/WhatsApp provider is configured yet — see Settings.
                  </p>
                )}
                <button onClick={() => router.push("/admin/messages/campaigns")} className="mt-2 text-xs text-maroon hover:underline">
                  View Sent Messages →
                </button>
              </div>
            )}
            <Button className="w-full" loading={sending} onClick={onSend} disabled={!body}>
              Send Message
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function MarketingPage() {
  return (
    <Suspense>
      <MarketingComposer />
    </Suspense>
  );
}
