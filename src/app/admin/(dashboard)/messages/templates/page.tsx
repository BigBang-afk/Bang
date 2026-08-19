"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Trash2, Pencil } from "lucide-react";
import { Card, Badge } from "@/components/admin/Card";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

interface Template {
  id: string;
  name: string;
  type: string;
  channel: "SMS" | "WHATSAPP";
  body: string;
  isActive: boolean;
}

const TYPES = ["BIRTHDAY", "NEW_COLLECTION", "GOLD_RATE_UPDATE", "SPECIAL_OFFER", "FESTIVAL", "ANNOUNCEMENT", "CUSTOM"];

interface TemplateForm {
  name: string;
  type: string;
  channel: "SMS" | "WHATSAPP";
  body: string;
}

const EMPTY: TemplateForm = { name: "", type: "CUSTOM", channel: "SMS", body: "" };

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [form, setForm] = useState<TemplateForm>(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    const res = await fetch("/api/admin/messages/templates");
    const data = await res.json();
    setTemplates(data.templates ?? []);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, []);

  function startEdit(t: Template) {
    setEditingId(t.id);
    setForm({ name: t.name, type: t.type, channel: t.channel, body: t.body });
  }

  function resetForm() {
    setEditingId(null);
    setForm(EMPTY);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await fetch(editingId ? `/api/admin/messages/templates/${editingId}` : "/api/admin/messages/templates", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      resetForm();
      load();
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(id: string) {
    if (!confirm("Delete this template?")) return;
    await fetch(`/api/admin/messages/templates/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl text-maroon">Message Templates</h1>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card title={editingId ? "Edit Template" : "New Template"} className="h-fit">
          <form onSubmit={onSubmit} className="flex flex-col gap-4">
            <Input label="Name" required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            <Select label="Type" value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}>
              {TYPES.map((t) => <option key={t} value={t}>{t.replace(/_/g, " ")}</option>)}
            </Select>
            <Select label="Channel" value={form.channel} onChange={(e) => setForm((f) => ({ ...f, channel: e.target.value as "SMS" | "WHATSAPP" }))}>
              <option value="SMS">SMS</option>
              <option value="WHATSAPP">WhatsApp</option>
            </Select>
            <Textarea
              label="Message Body"
              rows={5}
              required
              value={form.body}
              onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
              hint="Placeholders: {customer_name}, {gold_rate}, {store_name}, {phone}, {date}"
            />
            <div className="flex gap-2">
              <Button type="submit" loading={saving}>{editingId ? "Save" : "Create"}</Button>
              {editingId && <Button type="button" variant="ghost" onClick={resetForm}>Cancel</Button>}
            </div>
          </form>
        </Card>

        <Card title="All Templates" className="lg:col-span-2">
          <div className="flex flex-col divide-y divide-gold/10">
            {templates.map((t) => (
              <div key={t.id} className="flex items-start justify-between gap-4 py-3">
                <div>
                  <p className="font-medium text-brown">{t.name} <Badge tone="gold">{t.type.replace(/_/g, " ")}</Badge> <Badge>{t.channel}</Badge></p>
                  <p className="mt-1 text-sm text-brown-light">{t.body}</p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button onClick={() => startEdit(t)} className="text-brown-light hover:text-maroon"><Pencil className="h-4 w-4" /></button>
                  <button onClick={() => onDelete(t.id)} className="text-brown-light hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
