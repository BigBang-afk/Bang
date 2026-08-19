"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Plus, Trash2, Pencil } from "lucide-react";
import { Card, Badge } from "@/components/admin/Card";
import { Input, Select } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { formatPkr, purityLabel } from "@/lib/format";

interface ProductRow {
  id: string;
  name: string;
  sku: string;
  purity: "K24" | "K21" | "K18";
  grossWeight: string;
  status: string;
  stockStatus: string;
  category: { name: string };
  images: { url: string }[];
  price: { available: boolean; breakdown?: { finalPrice: number } };
}

function ProductsList() {
  const searchParams = useSearchParams();
  const [items, setItems] = useState<ProductRow[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [stockStatus, setStockStatus] = useState(searchParams.get("stockStatus") ?? "");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (status) params.set("status", status);
    params.set("pageSize", "100");
    const res = await fetch(`/api/admin/products?${params.toString()}`);
    const data = await res.json();
    let list: ProductRow[] = data.items ?? [];
    if (stockStatus) list = list.filter((p) => p.stockStatus === stockStatus);
    setItems(list);
    setLoading(false);
  }, [search, status, stockStatus]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  async function onDelete(id: string) {
    if (!confirm("Delete this product? This cannot be undone.")) return;
    await fetch(`/api/admin/products/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl text-maroon">Products</h1>
        <Link href="/admin/products/new">
          <Button size="sm"><Plus className="h-4 w-4" /> Add Product</Button>
        </Link>
      </div>

      <Card>
        <div className="mb-4 flex flex-wrap gap-3">
          <Input placeholder="Search by name or SKU…" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
          <Select value={status} onChange={(e) => setStatus(e.target.value)} className="max-w-[160px]">
            <option value="">All Statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="PUBLISHED">Published</option>
            <option value="ARCHIVED">Archived</option>
          </Select>
          <Select value={stockStatus} onChange={(e) => setStockStatus(e.target.value)} className="max-w-[160px]">
            <option value="">All Stock</option>
            <option value="IN_STOCK">In Stock</option>
            <option value="OUT_OF_STOCK">Out of Stock</option>
            <option value="MADE_TO_ORDER">Made to Order</option>
          </Select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gold/15 text-left text-xs uppercase text-brown-light">
                <th className="py-2">Product</th>
                <th>SKU</th>
                <th>Category</th>
                <th>Purity</th>
                <th>Weight</th>
                <th>Price</th>
                <th>Status</th>
                <th>Stock</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {items.map((p) => (
                <tr key={p.id} className="border-b border-gold/10">
                  <td className="flex items-center gap-2 py-2.5">
                    {p.images[0] && <img src={p.images[0].url} alt="" className="h-9 w-9 rounded-sm object-cover" />}
                    <span className="max-w-[180px] truncate">{p.name}</span>
                  </td>
                  <td className="text-xs text-brown-light">{p.sku}</td>
                  <td>{p.category.name}</td>
                  <td>{purityLabel(p.purity)}</td>
                  <td>{Number(p.grossWeight).toFixed(2)}g</td>
                  <td>{p.price.available ? formatPkr(p.price.breakdown!.finalPrice, 0) : "—"}</td>
                  <td><Badge tone={p.status === "PUBLISHED" ? "success" : p.status === "DRAFT" ? "neutral" : "warning"}>{p.status}</Badge></td>
                  <td><Badge tone={p.stockStatus === "IN_STOCK" ? "success" : p.stockStatus === "OUT_OF_STOCK" ? "danger" : "gold"}>{p.stockStatus.replace(/_/g, " ")}</Badge></td>
                  <td>
                    <div className="flex gap-2">
                      <Link href={`/admin/products/${p.id}`} className="text-brown-light hover:text-maroon"><Pencil className="h-4 w-4" /></Link>
                      <button onClick={() => onDelete(p.id)} className="text-brown-light hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!loading && items.length === 0 && <p className="py-8 text-center text-brown-light">No products found.</p>}
        </div>
      </Card>
    </div>
  );
}

export default function AdminProductsPage() {
  return (
    <Suspense>
      <ProductsList />
    </Suspense>
  );
}
