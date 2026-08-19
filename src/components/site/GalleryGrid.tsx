"use client";

import { useState } from "react";
import Image from "next/image";
import { X } from "lucide-react";
import clsx from "clsx";

interface GalleryItem {
  id: string;
  title: string | null;
  imageUrl: string;
  category: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  SHOWROOM: "Showroom",
  JEWELLERY: "Jewellery",
  EVENTS: "Events",
  BRIDAL: "Bridal",
  CUSTOMERS: "Customers",
  COLLECTIONS: "Collections",
};

export function GalleryGrid({ items }: { items: GalleryItem[] }) {
  const [filter, setFilter] = useState<string>("ALL");
  const [lightbox, setLightbox] = useState<GalleryItem | null>(null);

  const categories = ["ALL", ...Array.from(new Set(items.map((i) => i.category)))];
  const filtered = filter === "ALL" ? items : items.filter((i) => i.category === filter);

  return (
    <div>
      <div className="flex flex-wrap justify-center gap-2">
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => setFilter(c)}
            className={clsx(
              "rounded-full border px-4 py-1.5 text-xs font-medium transition",
              filter === c ? "border-maroon bg-maroon text-cream" : "border-cream-dark text-brown-light hover:border-maroon",
            )}
          >
            {c === "ALL" ? "All" : CATEGORY_LABELS[c] ?? c}
          </button>
        ))}
      </div>

      <div className="mt-10 columns-2 gap-4 sm:columns-3 lg:columns-4 [&>*]:mb-4">
        {filtered.map((item) => (
          <button
            key={item.id}
            onClick={() => setLightbox(item)}
            className="block w-full overflow-hidden rounded-sm border border-gold/15 bg-cream-dark"
          >
            <Image
              src={item.imageUrl}
              alt={item.title ?? "Zarghoon Jewellers"}
              width={500}
              height={600}
              className="h-auto w-full object-cover transition-transform duration-500 hover:scale-105"
            />
          </button>
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="mt-16 text-center text-brown-light">No images in this category yet.</p>
      )}

      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-6"
          onClick={() => setLightbox(null)}
        >
          <button
            aria-label="Close"
            className="absolute right-6 top-6 text-white hover:text-gold"
            onClick={() => setLightbox(null)}
          >
            <X className="h-8 w-8" />
          </button>
          <div className="relative max-h-[85vh] max-w-4xl" onClick={(e) => e.stopPropagation()}>
            <Image
              src={lightbox.imageUrl}
              alt={lightbox.title ?? ""}
              width={1200}
              height={1400}
              className="max-h-[85vh] w-auto rounded-sm object-contain"
            />
            {lightbox.title && <p className="mt-3 text-center text-cream">{lightbox.title}</p>}
          </div>
        </div>
      )}
    </div>
  );
}
