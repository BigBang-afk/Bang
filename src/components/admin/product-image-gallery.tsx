"use client";

import { useTransition } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { Star, Trash2, ArrowUp, ArrowDown } from "lucide-react";
import {
  setCoverImageAction, deleteProductImageAction, reorderProductImageAction,
} from "@/app/admin/(protected)/products/[id]/edit/image-actions";
import type { ProductImage } from "@/types/database";

export function ProductImageGallery({ productId, images }: { productId: string; images: ProductImage[] }) {
  const [isPending, startTransition] = useTransition();

  if (images.length === 0) {
    return <p className="text-sm text-charcoal/50">No images yet. Add some below.</p>;
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {images.map((img, i) => (
        <div key={img.id} className="group relative overflow-hidden rounded-sm border border-charcoal/10">
          <div className="relative aspect-square">
            <Image src={img.image_url} alt={img.alt_text ?? ""} fill className="object-cover" />
          </div>
          {img.is_cover && (
            <span className="absolute left-1.5 top-1.5 rounded-full bg-gold px-2 py-0.5 text-[10px] font-medium text-black">Cover</span>
          )}
          <div className="flex items-center justify-center gap-1 bg-white p-1.5">
            <button
              type="button"
              title="Set as cover"
              disabled={isPending}
              onClick={() => startTransition(async () => {
                await setCoverImageAction(productId, img.id, img.image_url);
                toast.success("Cover image updated");
              })}
              className="rounded-sm p-1 text-charcoal/60 hover:bg-ivory-dark hover:text-gold-dark"
            >
              <Star size={14} className={img.is_cover ? "fill-gold text-gold" : ""} />
            </button>
            <button
              type="button"
              title="Move up"
              disabled={isPending || i === 0}
              onClick={() => startTransition(() => reorderProductImageAction(productId, img.id, "up"))}
              className="rounded-sm p-1 text-charcoal/60 hover:bg-ivory-dark disabled:opacity-30"
            >
              <ArrowUp size={14} />
            </button>
            <button
              type="button"
              title="Move down"
              disabled={isPending || i === images.length - 1}
              onClick={() => startTransition(() => reorderProductImageAction(productId, img.id, "down"))}
              className="rounded-sm p-1 text-charcoal/60 hover:bg-ivory-dark disabled:opacity-30"
            >
              <ArrowDown size={14} />
            </button>
            <button
              type="button"
              title="Delete"
              disabled={isPending}
              onClick={() => {
                if (!window.confirm("Delete this image?")) return;
                startTransition(async () => {
                  await deleteProductImageAction(productId, img.id, img.image_url);
                  toast.success("Image deleted");
                });
              }}
              className="rounded-sm p-1 text-red-500 hover:bg-red-50"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
