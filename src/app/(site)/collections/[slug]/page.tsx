import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { listPricedProducts } from "@/lib/catalog";
import { ProductCard } from "@/components/site/ProductCard";
import clsx from "clsx";

export async function generateMetadata({ params }: PageProps<"/collections/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const category = await prisma.category.findUnique({ where: { slug } });
  if (!category) return {};
  return {
    title: category.name,
    description: category.description ?? `Shop our ${category.name} collection at Zarghoon Jewellers.`,
    alternates: { canonical: `/collections/${slug}` },
  };
}

const PURITY_OPTIONS = [
  { value: "", label: "All Purities" },
  { value: "K24", label: "24K" },
  { value: "K21", label: "21K" },
  { value: "K18", label: "18K" },
];

const SORT_OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "price_asc", label: "Price: Low to High" },
  { value: "price_desc", label: "Price: High to Low" },
];

export default async function CategoryPage({
  params,
  searchParams,
}: PageProps<"/collections/[slug]">) {
  const { slug } = await params;
  const sp = await searchParams;
  const purity = typeof sp.purity === "string" ? sp.purity : undefined;
  const sort = typeof sp.sort === "string" ? sp.sort : "newest";

  const category = await prisma.category.findUnique({
    where: { slug },
    include: { children: { where: { isActive: true } } },
  });
  if (!category || !category.isActive) notFound();

  const { items } = await listPricedProducts({
    category: slug,
    purity: purity as "K24" | "K21" | "K18" | undefined,
    sort,
    pageSize: 48,
  });

  return (
    <div className="mx-auto max-w-7xl px-6 py-16">
      <nav className="text-xs text-brown-light">
        <Link href="/collections" className="hover:text-maroon">Collections</Link> / {category.name}
      </nav>
      <h1 className="mt-2 font-display text-4xl text-maroon">{category.name}</h1>
      {category.description && <p className="mt-3 max-w-2xl text-brown-light">{category.description}</p>}

      <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-y border-gold/20 py-4">
        <div className="flex flex-wrap gap-2">
          {PURITY_OPTIONS.map((opt) => (
            <Link
              key={opt.value}
              href={`/collections/${slug}${opt.value ? `?purity=${opt.value}` : ""}`}
              className={clsx(
                "rounded-full border px-4 py-1.5 text-xs font-medium transition",
                (purity ?? "") === opt.value
                  ? "border-maroon bg-maroon text-cream"
                  : "border-cream-dark text-brown-light hover:border-maroon",
              )}
            >
              {opt.label}
            </Link>
          ))}
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="text-brown-light">Sort:</span>
          {SORT_OPTIONS.map((opt) => (
            <Link
              key={opt.value}
              href={`/collections/${slug}?${purity ? `purity=${purity}&` : ""}sort=${opt.value}`}
              className={clsx(
                "rounded-full border px-3 py-1.5 font-medium transition",
                sort === opt.value ? "border-gold-dark bg-gold text-maroon-dark" : "border-cream-dark text-brown-light hover:border-gold-dark",
              )}
            >
              {opt.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="mt-10 grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-4">
        {items.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>

      {items.length === 0 && (
        <p className="mt-16 text-center text-brown-light">
          No products are available in this collection yet. Please check back soon.
        </p>
      )}
    </div>
  );
}
