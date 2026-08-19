"use client";

import { useState } from "react";
import Image from "next/image";
import clsx from "clsx";

interface ImageItem {
  url: string;
  altText: string | null;
}

export function ProductImageGallery({ images, productName }: { images: ImageItem[]; productName: string }) {
  const [active, setActive] = useState(0);
  const current = images[active] ?? images[0];

  return (
    <div>
      <div className="relative aspect-square w-full overflow-hidden rounded-sm border border-gold/20 bg-cream-dark">
        {current ? (
          <Image
            src={current.url}
            alt={current.altText ?? productName}
            fill
            priority
            sizes="(max-width: 1024px) 100vw, 50vw"
            className="object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-brown-light">No image available</div>
        )}
      </div>
      {images.length > 1 && (
        <div className="mt-4 grid grid-cols-5 gap-3">
          {images.map((img, i) => (
            <button
              key={img.url + i}
              onClick={() => setActive(i)}
              className={clsx(
                "relative aspect-square overflow-hidden rounded-sm border-2 transition",
                i === active ? "border-maroon" : "border-transparent opacity-70 hover:opacity-100",
              )}
            >
              <Image src={img.url} alt={img.altText ?? productName} fill sizes="120px" className="object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
