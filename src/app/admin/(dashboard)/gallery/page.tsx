"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Trash2, Eye, EyeOff } from "lucide-react";
import { Card } from "@/components/admin/Card";
import { Input, Select } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { ImageUploadField } from "@/components/admin/ImageUploadField";

interface GalleryItem {
  id: string;
  title: string | null;
  imageUrl: string;
  category: string;
  isActive: boolean;
  sortOrder: number;
}

const CATEGORIES = ["SHOWROOM", "JEWELLERY", "EVENTS", "BRIDAL", "CUSTOMERS", "COLLECTIONS"];

export default function AdminGalleryPage() {
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("SHOWROOM");
  const [imageUrl, setImageUrl] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    const res = await fetch("/api/admin/gallery");
    const data = await res.json();
    setItems(data.items ?? []);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!imageUrl) return;
    setSaving(true);
    try {
      await fetch("/api/admin/gallery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, category, imageUrl }),
      });
      setTitle("");
      setImageUrl("");
      load();
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(item: GalleryItem) {
    await fetch(`/api/admin/gallery/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !item.isActive }),
    });
    load();
  }

  async function onDelete(id: string) {
    if (!confirm("Delete this image?")) return;
    await fetch(`/api/admin/gallery/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl text-maroon">Gallery</h1>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card title="Upload Photo" className="h-fit">
          <form onSubmit={onSubmit} className="flex flex-col gap-4">
            <ImageUploadField label="Image" value={imageUrl} onChange={setImageUrl} subdir="gallery" />
            <Input label="Title (optional)" value={title} onChange={(e) => setTitle(e.target.value)} />
            <Select label="Category" value={category} onChange={(e) => setCategory(e.target.value)}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </Select>
            <Button type="submit" loading={saving} disabled={!imageUrl}>Add to Gallery</Button>
          </form>
        </Card>

        <Card title="All Photos" className="lg:col-span-2">
          <div className="grid grid-cols-3 gap-3">
            {items.map((item) => (
              <div key={item.id} className="group relative aspect-square overflow-hidden rounded-sm border border-gold/15">
                <img src={item.imageUrl} alt={item.title ?? ""} className="h-full w-full object-cover" />
                <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-black/50 px-2 py-1 text-[10px] text-white">
                  <span>{item.category}</span>
                  <div className="flex gap-1.5">
                    <button onClick={() => toggleActive(item)}>{item.isActive ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}</button>
                    <button onClick={() => onDelete(item.id)}><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {items.length === 0 && <p className="text-center text-brown-light">No photos uploaded yet.</p>}
        </Card>
      </div>
    </div>
  );
}
