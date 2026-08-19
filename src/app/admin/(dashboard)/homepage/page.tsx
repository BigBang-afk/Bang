"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Trash2, ExternalLink } from "lucide-react";
import { Card, Badge } from "@/components/admin/Card";
import { Input, Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { ImageUploadField } from "@/components/admin/ImageUploadField";

interface HomepageData {
  status: "DRAFT" | "PUBLISHED";
  heroEnabled: boolean;
  heroTitle: string;
  heroSubtitle: string;
  heroImageUrl: string | null;
  heroButtonText: string;
  heroButtonUrl: string;
  heroButton2Text: string;
  heroButton2Url: string;
  goldRateBarEnabled: boolean;
  showRate24k: boolean;
  showRate21k: boolean;
  showRate18k: boolean;
  trustBadge1Title: string; trustBadge1Text: string;
  trustBadge2Title: string; trustBadge2Text: string;
  trustBadge3Title: string; trustBadge3Text: string;
  trustBadge4Title: string; trustBadge4Text: string;
  collections: { categoryId: string; category: { name: string }; sortOrder: number; isActive: boolean }[];
  featuredProducts: { productId: string; product: { name: string; sku: string }; sortOrder: number }[];
  banners: { id: string; imageUrl: string; heading: string | null; description: string | null; buttonText: string | null; buttonUrl: string | null; isActive: boolean }[];
}

interface Category { id: string; name: string; }
interface Product { id: string; name: string; sku: string; }

const TABS = ["Hero", "Gold Rate Bar", "Collections", "Featured Products", "Banners", "Trust Badges"] as const;

export default function HomepageCmsPage() {
  const [data, setData] = useState<HomepageData | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [tab, setTab] = useState<typeof TABS[number]>("Hero");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/admin/homepage");
    const d = await res.json();
    setData(d.homepage);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    fetch("/api/admin/categories").then((r) => r.json()).then((d) => setCategories(d.categories ?? []));
    fetch("/api/admin/products?pageSize=200&status=PUBLISHED").then((r) => r.json()).then((d) => setProducts((d.items ?? []).map((p: { id: string; name: string; sku: string }) => ({ id: p.id, name: p.name, sku: p.sku }))));
  }, []);

  async function saveMain(patch: Partial<HomepageData>) {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/homepage", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (res.ok) setMessage("Saved.");
      load();
    } finally {
      setSaving(false);
    }
  }

  if (!data) return <p className="text-brown-light">Loading…</p>;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl text-maroon">Homepage Management</h1>
        <div className="flex items-center gap-3">
          <Badge tone={data.status === "PUBLISHED" ? "success" : "warning"}>{data.status}</Badge>
          <Button
            size="sm"
            variant="outline"
            onClick={() => saveMain({ status: data.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED" })}
          >
            {data.status === "PUBLISHED" ? "Unpublish" : "Publish"}
          </Button>
          <Link href="/" target="_blank" className="flex items-center gap-1.5 text-xs text-maroon hover:underline">
            <ExternalLink className="h-3.5 w-3.5" /> Preview Website
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-gold/20 pb-3">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-full border px-4 py-1.5 text-xs font-medium ${tab === t ? "border-maroon bg-maroon text-cream" : "border-cream-dark text-brown-light"}`}
          >
            {t}
          </button>
        ))}
      </div>

      {message && <p className="text-sm text-green-700">{message}</p>}

      {tab === "Hero" && (
        <Card title="Hero Section">
          <div className="flex flex-col gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={data.heroEnabled} onChange={(e) => setData({ ...data, heroEnabled: e.target.checked })} className="h-4 w-4 accent-maroon" />
              Enable Hero Section
            </label>
            <Input label="Hero Title" value={data.heroTitle} onChange={(e) => setData({ ...data, heroTitle: e.target.value })} />
            <Textarea label="Subtitle" rows={2} value={data.heroSubtitle} onChange={(e) => setData({ ...data, heroSubtitle: e.target.value })} />
            <ImageUploadField label="Background Image" value={data.heroImageUrl ?? ""} onChange={(url) => setData({ ...data, heroImageUrl: url })} subdir="homepage" />
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Button 1 Text" value={data.heroButtonText} onChange={(e) => setData({ ...data, heroButtonText: e.target.value })} />
              <Input label="Button 1 URL" value={data.heroButtonUrl} onChange={(e) => setData({ ...data, heroButtonUrl: e.target.value })} />
              <Input label="Button 2 Text" value={data.heroButton2Text} onChange={(e) => setData({ ...data, heroButton2Text: e.target.value })} />
              <Input label="Button 2 URL" value={data.heroButton2Url} onChange={(e) => setData({ ...data, heroButton2Url: e.target.value })} />
            </div>
            <Button className="self-start" loading={saving} onClick={() => saveMain(data)}>Save Hero</Button>
          </div>
        </Card>
      )}

      {tab === "Gold Rate Bar" && (
        <Card title="Gold Rate Bar">
          <div className="flex flex-col gap-3">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={data.goldRateBarEnabled} onChange={(e) => setData({ ...data, goldRateBarEnabled: e.target.checked })} className="h-4 w-4 accent-maroon" />
              Enable Gold Rate Bar
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={data.showRate24k} onChange={(e) => setData({ ...data, showRate24k: e.target.checked })} className="h-4 w-4 accent-maroon" />
              Show 24K
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={data.showRate21k} onChange={(e) => setData({ ...data, showRate21k: e.target.checked })} className="h-4 w-4 accent-maroon" />
              Show 21K
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={data.showRate18k} onChange={(e) => setData({ ...data, showRate18k: e.target.checked })} className="h-4 w-4 accent-maroon" />
              Show 18K
            </label>
            <Button className="self-start" loading={saving} onClick={() => saveMain(data)}>Save</Button>
          </div>
        </Card>
      )}

      {tab === "Collections" && (
        <CollectionsTab categories={categories} initial={data.collections} onSaved={load} />
      )}

      {tab === "Featured Products" && (
        <FeaturedProductsTab products={products} initial={data.featuredProducts} onSaved={load} />
      )}

      {tab === "Banners" && <BannersTab banners={data.banners} onSaved={load} />}

      {tab === "Trust Badges" && (
        <Card title="Trust Badges">
          <div className="grid gap-6 sm:grid-cols-2">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="flex flex-col gap-2 rounded-sm border border-gold/15 p-3">
                <Input
                  label={`Badge ${n} Title`}
                  value={data[`trustBadge${n}Title` as keyof HomepageData] as string}
                  onChange={(e) => setData({ ...data, [`trustBadge${n}Title`]: e.target.value })}
                />
                <Input
                  label={`Badge ${n} Text`}
                  value={data[`trustBadge${n}Text` as keyof HomepageData] as string}
                  onChange={(e) => setData({ ...data, [`trustBadge${n}Text`]: e.target.value })}
                />
              </div>
            ))}
          </div>
          <Button className="mt-4" loading={saving} onClick={() => saveMain(data)}>Save Trust Badges</Button>
        </Card>
      )}
    </div>
  );
}

function CollectionsTab({
  categories,
  initial,
  onSaved,
}: {
  categories: Category[];
  initial: HomepageData["collections"];
  onSaved: () => void;
}) {
  const [selected, setSelected] = useState<string[]>(initial.map((c) => c.categoryId));
  const [saving, setSaving] = useState(false);

  function toggle(id: string) {
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }

  async function save() {
    setSaving(true);
    try {
      await fetch("/api/admin/homepage/collections", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(selected.map((categoryId, i) => ({ categoryId, sortOrder: i }))),
      });
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card title="Homepage Collections">
      <p className="mb-3 text-xs text-brown-light">Select and order the categories shown on the homepage. Click to toggle; order follows click order.</p>
      <div className="flex flex-wrap gap-2">
        {categories.map((c) => (
          <button
            key={c.id}
            onClick={() => toggle(c.id)}
            className={`rounded-full border px-4 py-1.5 text-xs font-medium ${selected.includes(c.id) ? "border-maroon bg-maroon text-cream" : "border-cream-dark text-brown-light"}`}
          >
            {selected.includes(c.id) && `${selected.indexOf(c.id) + 1}. `}{c.name}
          </button>
        ))}
      </div>
      <Button className="mt-4" loading={saving} onClick={save}>Save Collections</Button>
    </Card>
  );
}

function FeaturedProductsTab({
  products,
  initial,
  onSaved,
}: {
  products: Product[];
  initial: HomepageData["featuredProducts"];
  onSaved: () => void;
}) {
  const [selected, setSelected] = useState<string[]>(initial.map((p) => p.productId));
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");

  function toggle(id: string) {
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }

  async function save() {
    setSaving(true);
    try {
      await fetch("/api/admin/homepage/featured-products", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(selected.map((productId, i) => ({ productId, sortOrder: i }))),
      });
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  const filtered = products.filter((p) => !search || p.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <Card title="Featured Products">
      <Input placeholder="Search products…" value={search} onChange={(e) => setSearch(e.target.value)} className="mb-3 max-w-sm" />
      <div className="max-h-80 overflow-y-auto rounded-sm border border-cream-dark thin-scrollbar">
        {filtered.map((p) => (
          <label key={p.id} className="flex items-center gap-2 border-b border-cream-dark/60 px-3 py-2 text-sm last:border-0">
            <input type="checkbox" checked={selected.includes(p.id)} onChange={() => toggle(p.id)} className="h-4 w-4 accent-maroon" />
            {p.name} <span className="text-xs text-brown-light">({p.sku})</span>
            {selected.includes(p.id) && <Badge tone="gold">#{selected.indexOf(p.id) + 1}</Badge>}
          </label>
        ))}
      </div>
      <Button className="mt-4" loading={saving} onClick={save}>Save Featured Products</Button>
    </Card>
  );
}

function BannersTab({ banners, onSaved }: { banners: HomepageData["banners"]; onSaved: () => void }) {
  const [imageUrl, setImageUrl] = useState("");
  const [heading, setHeading] = useState("");
  const [description, setDescription] = useState("");
  const [buttonText, setButtonText] = useState("");
  const [buttonUrl, setButtonUrl] = useState("");
  const [saving, setSaving] = useState(false);

  async function add() {
    if (!imageUrl) return;
    setSaving(true);
    try {
      await fetch("/api/admin/homepage/banners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl, heading, description, buttonText, buttonUrl }),
      });
      setImageUrl(""); setHeading(""); setDescription(""); setButtonText(""); setButtonUrl("");
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(id: string, isActive: boolean) {
    await fetch(`/api/admin/homepage/banners/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !isActive }),
    });
    onSaved();
  }

  async function remove(id: string) {
    if (!confirm("Delete this banner?")) return;
    await fetch(`/api/admin/homepage/banners/${id}`, { method: "DELETE" });
    onSaved();
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card title="Add Promotional Banner">
        <div className="flex flex-col gap-4">
          <ImageUploadField label="Banner Image" value={imageUrl} onChange={setImageUrl} subdir="banners" />
          <Input label="Heading" value={heading} onChange={(e) => setHeading(e.target.value)} />
          <Textarea label="Description" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
          <Input label="Button Text" value={buttonText} onChange={(e) => setButtonText(e.target.value)} />
          <Input label="Button URL" value={buttonUrl} onChange={(e) => setButtonUrl(e.target.value)} />
          <Button loading={saving} disabled={!imageUrl} onClick={add}>Add Banner</Button>
        </div>
      </Card>
      <Card title="Existing Banners">
        <div className="flex flex-col gap-3">
          {banners.map((b) => (
            <div key={b.id} className="flex items-center gap-3 rounded-sm border border-gold/15 p-2">
              <img src={b.imageUrl} alt="" className="h-14 w-20 rounded-sm object-cover" />
              <div className="flex-1">
                <p className="text-sm font-medium text-brown">{b.heading}</p>
                <Badge tone={b.isActive ? "success" : "neutral"}>{b.isActive ? "Active" : "Hidden"}</Badge>
              </div>
              <button onClick={() => toggleActive(b.id, b.isActive)} className="text-xs text-maroon hover:underline">Toggle</button>
              <button onClick={() => remove(b.id)} className="text-brown-light hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
            </div>
          ))}
          {banners.length === 0 && <p className="text-sm text-brown-light">No banners yet.</p>}
        </div>
      </Card>
    </div>
  );
}
