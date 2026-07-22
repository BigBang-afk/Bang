import type { Metadata } from "next";
import Link from "next/link";
import { X } from "lucide-react";
import { ProductCard } from "@/components/product/product-card";
import { SortSelect } from "@/components/product/sort-select";
import { AdminPagination } from "@/components/admin/pagination";
import { listProducts, type ProductSort } from "@/lib/data/products";
import { listCategories } from "@/lib/data/categories";
import { listCollections } from "@/lib/data/collections";
import { getActiveRateMap } from "@/lib/data/gold-rates";
import { GOLD_PURITIES } from "@/lib/constants";

export const metadata: Metadata = {
  title: "All Products",
  description: "Browse the full jewelry catalog at Zarghoon Jewellers — gold rings, necklaces, bangles, bridal sets and more, priced by live gold rate.",
};

interface SearchParams {
  page?: string; category?: string; collection?: string; purity?: string; gender?: string;
  bridal?: string; new?: string; featured?: string; availability?: string; sort?: string; search?: string;
}

export default async function ProductsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const page = parseInt(params.page ?? "1", 10) || 1;
  const sort = (params.sort as ProductSort) ?? "newest";

  const [categories, collections, activeRates, result] = await Promise.all([
    listCategories(true),
    listCollections(true),
    getActiveRateMap(),
    listProducts({
      filters: {
        categorySlug: params.category,
        collectionSlug: params.collection,
        purity: params.purity,
        gender: params.gender,
        isBridal: params.bridal === "1",
        isNewArrival: params.new === "1",
        isFeatured: params.featured === "1",
        availability: params.availability,
        search: params.search,
      },
      sort,
      page,
      pageSize: 12,
    }),
  ]);

  const activeFilters: { label: string; key: string }[] = [];
  if (params.category) activeFilters.push({ label: `Category: ${categories.find((c) => c.slug === params.category)?.name ?? params.category}`, key: "category" });
  if (params.collection) activeFilters.push({ label: `Collection: ${collections.find((c) => c.slug === params.collection)?.name ?? params.collection}`, key: "collection" });
  if (params.purity) activeFilters.push({ label: `Purity: ${params.purity}`, key: "purity" });
  if (params.gender) activeFilters.push({ label: `Gender: ${params.gender}`, key: "gender" });
  if (params.bridal === "1") activeFilters.push({ label: "Bridal", key: "bridal" });
  if (params.new === "1") activeFilters.push({ label: "New Arrivals", key: "new" });
  if (params.featured === "1") activeFilters.push({ label: "Featured", key: "featured" });
  if (params.search) activeFilters.push({ label: `Search: "${params.search}"`, key: "search" });

  const buildUrl = (overrides: Record<string, string | undefined>) => {
    const merged = { ...params, ...overrides, page: undefined };
    const usp = new URLSearchParams();
    Object.entries(merged).forEach(([k, v]) => { if (v) usp.set(k, v); });
    const qs = usp.toString();
    return `/products${qs ? `?${qs}` : ""}`;
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="font-serif text-3xl text-charcoal">All Products</h1>
        <p className="mt-1 text-sm text-charcoal/60">{result.total} products found</p>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-4">
        <aside className="space-y-6 lg:col-span-1">
          <form method="get" className="space-y-5 rounded-sm border border-charcoal/10 bg-white p-5">
            <div>
              <label className="mb-1.5 block text-xs uppercase tracking-wide text-charcoal/60">Search</label>
              <input name="search" defaultValue={params.search} className="w-full rounded-sm border border-charcoal/20 px-3 py-2 text-sm" placeholder="Search products…" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs uppercase tracking-wide text-charcoal/60">Category</label>
              <select name="category" defaultValue={params.category ?? ""} className="w-full rounded-sm border border-charcoal/20 px-3 py-2 text-sm">
                <option value="">All Categories</option>
                {categories.map((c) => <option key={c.id} value={c.slug}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs uppercase tracking-wide text-charcoal/60">Collection</label>
              <select name="collection" defaultValue={params.collection ?? ""} className="w-full rounded-sm border border-charcoal/20 px-3 py-2 text-sm">
                <option value="">All Collections</option>
                {collections.map((c) => <option key={c.id} value={c.slug}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs uppercase tracking-wide text-charcoal/60">Gold Purity</label>
              <select name="purity" defaultValue={params.purity ?? ""} className="w-full rounded-sm border border-charcoal/20 px-3 py-2 text-sm">
                <option value="">Any Purity</option>
                {GOLD_PURITIES.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs uppercase tracking-wide text-charcoal/60">Gender</label>
              <select name="gender" defaultValue={params.gender ?? ""} className="w-full rounded-sm border border-charcoal/20 px-3 py-2 text-sm">
                <option value="">Any</option>
                <option value="women">Women</option>
                <option value="men">Men</option>
                <option value="kids">Kids</option>
              </select>
            </div>
            <div className="space-y-2 text-sm">
              <label className="flex items-center gap-2"><input type="checkbox" name="bridal" value="1" defaultChecked={params.bridal === "1"} /> Bridal Collection</label>
              <label className="flex items-center gap-2"><input type="checkbox" name="new" value="1" defaultChecked={params.new === "1"} /> New Arrivals</label>
              <label className="flex items-center gap-2"><input type="checkbox" name="featured" value="1" defaultChecked={params.featured === "1"} /> Featured</label>
            </div>
            <input type="hidden" name="sort" value={params.sort ?? "newest"} />
            <button type="submit" className="w-full rounded-sm bg-charcoal px-4 py-2.5 text-sm text-ivory">Apply Filters</button>
            {activeFilters.length > 0 && (
              <Link href="/products" className="block text-center text-xs text-charcoal/50 underline">Clear all filters</Link>
            )}
          </form>
        </aside>

        <div className="lg:col-span-3">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              {activeFilters.map((f) => (
                <Link key={f.key} href={buildUrl({ [f.key]: undefined })} className="inline-flex items-center gap-1 rounded-full border border-charcoal/20 px-3 py-1 text-xs text-charcoal/70 hover:border-charcoal">
                  {f.label} <X size={12} />
                </Link>
              ))}
            </div>
            <SortSelect current={sort} hiddenParams={{ ...params, sort: undefined, page: undefined } as Record<string, string | undefined>} />
          </div>

          {result.products.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-sm border border-charcoal/10 bg-white py-20 text-center">
              <p className="text-charcoal/60">No products match your filters.</p>
              <Link href="/products" className="text-sm font-medium text-gold-dark underline">Clear filters</Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-5 sm:grid-cols-3">
              {result.products.map((p) => <ProductCard key={p.id} product={p} activeRates={activeRates} />)}
            </div>
          )}

          <AdminPagination page={page} totalPages={result.totalPages} baseUrl="/products" searchParams={params as Record<string, string | undefined>} />
        </div>
      </div>
    </div>
  );
}
