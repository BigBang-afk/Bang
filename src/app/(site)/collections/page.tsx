import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { getActiveCategories } from "@/lib/site-data";
import { listPricedProducts } from "@/lib/catalog";
import { ProductCard } from "@/components/site/ProductCard";

export const metadata: Metadata = {
  title: "Collections",
  description: "Browse our full range of 24K, 21K and 18K gold jewellery collections — necklaces, bangles, rings, bridal sets and more.",
  alternates: { canonical: "/collections" },
};

export default async function CollectionsPage({
  searchParams,
}: PageProps<"/collections">) {
  const params = await searchParams;
  const search = typeof params.search === "string" ? params.search : undefined;
  const categories = await getActiveCategories();

  if (search) {
    const { items } = await listPricedProducts({ search, pageSize: 48 });
    return (
      <div className="mx-auto max-w-7xl px-6 py-16">
        <h1 className="font-display text-3xl text-maroon">Search results for &ldquo;{search}&rdquo;</h1>
        <p className="mt-2 text-sm text-brown-light">{items.length} product(s) found</p>
        <div className="mt-10 grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
        {items.length === 0 && (
          <p className="mt-16 text-center text-brown-light">
            No products matched your search. Try a different keyword or browse our collections below.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-6 py-16">
      <div className="text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-gold-dark">Explore</p>
        <h1 className="mt-2 font-display text-4xl text-maroon">Our Collections</h1>
        <div className="gold-divider mx-auto my-6 w-32" />
      </div>
      <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-4">
        {categories.map((category) => (
          <Link
            key={category.id}
            href={`/collections/${category.slug}`}
            className="group overflow-hidden rounded-sm border border-gold/15 bg-ivory shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
          >
            <div className="relative aspect-square w-full bg-cream-dark">
              {category.imageUrl && (
                <Image
                  src={category.imageUrl}
                  alt={category.name}
                  fill
                  sizes="(max-width: 768px) 50vw, 25vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
              )}
            </div>
            <div className="p-4 text-center">
              <p className="font-display text-lg text-brown group-hover:text-maroon">{category.name}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
