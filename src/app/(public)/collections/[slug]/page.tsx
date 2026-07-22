import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductCard } from "@/components/product/product-card";
import { SectionHeading } from "@/components/ui/section-heading";
import { AdminPagination } from "@/components/admin/pagination";
import { getCategoryBySlug } from "@/lib/data/categories";
import { getCollectionBySlug } from "@/lib/data/collections";
import { listProducts } from "@/lib/data/products";
import { getActiveRateMap } from "@/lib/data/gold-rates";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const category = await getCategoryBySlug(slug);
  const collection = category ? null : await getCollectionBySlug(slug);
  const entity = category ?? collection;
  if (!entity) return {};

  return {
    title: entity.seo_title || entity.name,
    description: entity.seo_description || entity.description || undefined,
    alternates: { canonical: `/collections/${slug}` },
  };
}

export default async function CollectionDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { slug } = await params;
  const { page: pageParam } = await searchParams;
  const page = parseInt(pageParam ?? "1", 10) || 1;

  const category = await getCategoryBySlug(slug);
  const collection = category ? null : await getCollectionBySlug(slug);
  const entity = category ?? collection;
  if (!entity) notFound();

  const [activeRates, result] = await Promise.all([
    getActiveRateMap(),
    listProducts({
      filters: category ? { categorySlug: slug } : { collectionSlug: slug },
      sort: "newest",
      page,
      pageSize: 12,
    }),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <SectionHeading eyebrow={category ? "Category" : "Collection"} title={entity.name} description={entity.description ?? undefined} />
      <p className="mt-2 text-center text-xs text-charcoal/40">{result.total} products</p>

      {result.products.length === 0 ? (
        <p className="mt-12 text-center text-charcoal/50">No products in this {category ? "category" : "collection"} yet.</p>
      ) : (
        <div className="mt-12 grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
          {result.products.map((p) => <ProductCard key={p.id} product={p} activeRates={activeRates} />)}
        </div>
      )}

      <AdminPagination page={page} totalPages={result.totalPages} baseUrl={`/collections/${slug}`} />
    </div>
  );
}
