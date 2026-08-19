"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Plus, Trash2, Pencil, Eye, EyeOff } from "lucide-react";
import { Card } from "@/components/admin/Card";
import { Input, Textarea, Select } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { ImageUploadField } from "@/components/admin/ImageUploadField";

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  parentId: string | null;
  sortOrder: number;
  isActive: boolean;
  _count: { products: number; children: number };
}

const EMPTY = { name: "", slug: "", description: "", imageUrl: "", parentId: "" };

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    const res = await fetch("/api/admin/categories");
    const data = await res.json();
    setCategories(data.categories ?? []);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, []);

  function startEdit(c: Category) {
    setEditingId(c.id);
    setForm({ name: c.name, slug: c.slug, description: c.description ?? "", imageUrl: c.imageUrl ?? "", parentId: c.parentId ?? "" });
  }

  function resetForm() {
    setEditingId(null);
    setForm(EMPTY);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(editingId ? `/api/admin/categories/${editingId}` : "/api/admin/categories", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, parentId: form.parentId || null }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Save failed.");
        return;
      }
      resetForm();
      load();
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(id: string) {
    if (!confirm("Delete this category?")) return;
    const res = await fetch(`/api/admin/categories/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json();
      alert(data.error ?? "Could not delete category.");
      return;
    }
    load();
  }

  async function toggleActive(c: Category) {
    await fetch(`/api/admin/categories/${c.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !c.isActive }),
    });
    load();
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl text-maroon">Categories</h1>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card title={editingId ? "Edit Category" : "Add Category"} className="lg:col-span-1 h-fit">
          <form onSubmit={onSubmit} className="flex flex-col gap-4">
            <Input label="Name" required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            <Input label="Slug" placeholder="Auto-generated if blank" value={form.slug} onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))} />
            <Select label="Parent Category" value={form.parentId} onChange={(e) => setForm((f) => ({ ...f, parentId: e.target.value }))}>
              <option value="">None (top-level)</option>
              {categories.filter((c) => c.id !== editingId).map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </Select>
            <Textarea label="Description" rows={3} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
            <ImageUploadField label="Category Image" value={form.imageUrl} onChange={(url) => setForm((f) => ({ ...f, imageUrl: url }))} subdir="categories" />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex gap-2">
              <Button type="submit" loading={saving}>{editingId ? "Save" : "Add"} <Plus className="h-4 w-4" /></Button>
              {editingId && <Button type="button" variant="ghost" onClick={resetForm}>Cancel</Button>}
            </div>
          </form>
        </Card>

        <Card title="All Categories" className="lg:col-span-2">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gold/15 text-left text-xs uppercase text-brown-light">
                  <th className="py-2">Name</th>
                  <th>Products</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {categories.map((c) => (
                  <tr key={c.id} className="border-b border-gold/10">
                    <td className="flex items-center gap-2 py-2.5">
                      {c.imageUrl && <img src={c.imageUrl} alt="" className="h-8 w-8 rounded-full object-cover" />}
                      {c.parentId && <span className="text-brown-light">↳</span>} {c.name}
                    </td>
                    <td>{c._count.products}</td>
                    <td>
                      <button onClick={() => toggleActive(c)} className="flex items-center gap-1 text-xs text-brown-light hover:text-maroon">
                        {c.isActive ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                        {c.isActive ? "Visible" : "Hidden"}
                      </button>
                    </td>
                    <td>
                      <div className="flex gap-2">
                        <button onClick={() => startEdit(c)} className="text-brown-light hover:text-maroon"><Pencil className="h-4 w-4" /></button>
                        <button onClick={() => onDelete(c.id)} className="text-brown-light hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
