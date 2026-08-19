import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { GalleryGrid } from "@/components/site/GalleryGrid";

export const metadata: Metadata = {
  title: "Gallery",
  description: "Browse photos of our showroom, jewellery, bridal collections and events at Zarghoon Jewellers.",
  alternates: { canonical: "/gallery" },
};

export default async function GalleryPage() {
  const items = await prisma.galleryItem.findMany({
    where: { isActive: true },
    orderBy: [{ category: "asc" }, { sortOrder: "asc" }],
  });

  return (
    <div className="mx-auto max-w-7xl px-6 py-16">
      <div className="text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-gold-dark">Take a Look</p>
        <h1 className="mt-2 font-display text-4xl text-maroon">Gallery</h1>
        <div className="gold-divider mx-auto my-6 w-32" />
      </div>
      <GalleryGrid
        items={items.map((i) => ({ id: i.id, title: i.title, imageUrl: i.imageUrl, category: i.category }))}
      />
    </div>
  );
}
