import type { Metadata } from "next";
import { SearchBox } from "@/components/product/search-box";
import { ProductCard } from "@/components/product/product-card";
import { listProducts } from "@/lib/data/products";
import { getActiveRateMap } from "@/lib/data/gold-rates";

export const metadata: Metadata = { title: "Search Products", robots: { index: false, follow: true } };

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const activeRates = await getActiveRateMap();
  const result = q ? await listProducts({ filters: { search: q }, pageSize: 24 }) : null;

  return (
    <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
      <h1 className="mb-6 text-center font-serif text-3xl text-charcoal">Search Products</h1>
      <SearchBox initialQuery={q} />

      {result && (
        <div className="mt-10">
          <p className="mb-4 text-sm text-charcoal/60">{result.total} result(s) for &ldquo;{q}&rdquo;</p>
          {result.products.length === 0 ? (
            <p className="text-charcoal/50">No products matched your search. Try a different term or browse our collections.</p>
          ) : (
            <div className="grid grid-cols-2 gap-5 sm:grid-cols-3">
              {result.products.map((p) => <ProductCard key={p.id} product={p} activeRates={activeRates} />)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
