"use client";

import { useState } from "react";
import Image from "next/image";
import { X, ChevronLeft, ChevronRight, ZoomIn } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ProductImage } from "@/types/database";

export function ProductGallery({ images, productName }: { images: ProductImage[]; productName: string }) {
  const [active, setActive] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const list = images.length > 0 ? images : [{ id: "placeholder", image_url: "/placeholder-product.svg", alt_text: productName, is_cover: true, display_order: 0, product_id: "", created_at: "" }];

  return (
    <div>
      <div className="relative aspect-square overflow-hidden rounded-sm border border-charcoal/10 bg-ivory-dark">
        <Image
          src={list[active].image_url}
          alt={list[active].alt_text ?? productName}
          fill
          priority
          sizes="(max-width: 1024px) 100vw, 50vw"
          className="object-cover"
        />
        <button
          type="button"
          onClick={() => setLightboxOpen(true)}
          aria-label="View full screen"
          className="absolute bottom-3 right-3 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-charcoal shadow-md transition-colors hover:bg-white"
        >
          <ZoomIn size={18} />
        </button>
      </div>

      {list.length > 1 && (
        <div className="mt-3 flex gap-2 overflow-x-auto">
          {list.map((img, i) => (
            <button
              key={img.id}
              type="button"
              onClick={() => setActive(i)}
              aria-label={`View image ${i + 1}`}
              className={cn(
                "relative h-16 w-16 shrink-0 overflow-hidden rounded-sm border-2",
                active === i ? "border-gold" : "border-transparent opacity-70 hover:opacity-100"
              )}
            >
              <Image src={img.image_url} alt={img.alt_text ?? `${productName} ${i + 1}`} fill className="object-cover" />
            </button>
          ))}
        </div>
      )}

      {lightboxOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 p-4" role="dialog" aria-modal="true" aria-label="Product image full screen viewer">
          <button aria-label="Close" onClick={() => setLightboxOpen(false)} className="absolute right-4 top-4 text-white hover:text-gold">
            <X size={28} />
          </button>
          {list.length > 1 && (
            <button aria-label="Previous image" onClick={() => setActive((a) => (a - 1 + list.length) % list.length)} className="absolute left-4 text-white hover:text-gold">
              <ChevronLeft size={36} />
            </button>
          )}
          <div className="relative h-[85vh] w-full max-w-3xl">
            <Image src={list[active].image_url} alt={list[active].alt_text ?? productName} fill className="object-contain" />
          </div>
          {list.length > 1 && (
            <button aria-label="Next image" onClick={() => setActive((a) => (a + 1) % list.length)} className="absolute right-4 text-white hover:text-gold">
              <ChevronRight size={36} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
