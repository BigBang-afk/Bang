import type { Metadata } from "next";
import { SectionHeading } from "@/components/ui/section-heading";
import { CollectionCard } from "@/components/collection/collection-card";
import { listCollections, getCollectionProductCounts } from "@/lib/data/collections";
import { listCategories, getCategoryProductCounts } from "@/lib/data/categories";

export const metadata: Metadata = {
  title: "Collections",
  description: "Explore jewelry collections at Zarghoon Jewellers — bridal jewelry, gold rings, necklaces, bangles, and more.",
};

export default async function CollectionsPage() {
  const [collections, collectionCounts, categories, categoryCounts] = await Promise.all([
    listCollections(true),
    getCollectionProductCounts(),
    listCategories(true),
    getCategoryProductCounts(),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <SectionHeading eyebrow="Explore" title="Our Collections" description="Curated jewelry collections crafted with tradition, elegance, and modern refinement." />
      <div className="mt-12 grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
        {collections.map((c) => (
          <CollectionCard key={c.id} name={c.name} slug={c.slug} description={c.description} imageUrl={c.image_url} productCount={collectionCounts[c.id] ?? 0} />
        ))}
      </div>

      <div className="mt-20">
        <SectionHeading eyebrow="Browse By" title="Categories" />
        <div className="mt-10 grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
          {categories.map((c) => (
            <CollectionCard key={c.id} name={c.name} slug={c.slug} description={c.description} imageUrl={c.image_url} productCount={categoryCounts[c.id] ?? 0} />
          ))}
        </div>
      </div>
    </div>
  );
}
