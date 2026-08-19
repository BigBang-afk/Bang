import Image from "next/image";
import Link from "next/link";
import { PriceDisplay } from "@/components/site/PriceDisplay";
import { WishlistButton } from "@/components/site/WishlistButton";
import { purityLabel, formatWeight } from "@/lib/format";
import type { PricedProduct } from "@/lib/gold";
import type { Prisma } from "@/generated/prisma/client";

export interface ProductCardData {
  id: string;
  sku: string;
  name: string;
  purity: "K24" | "K21" | "K18";
  grossWeight: string | number | Prisma.Decimal;
  isNewArrival: boolean;
  isBestseller: boolean;
  images: { url: string; altText: string | null }[];
  price: PricedProduct;
}

export function ProductCard({
  product,
  initiallyWishlisted = false,
}: {
  product: ProductCardData;
  initiallyWishlisted?: boolean;
}) {
  const image = product.images[0];

  return (
    <Link
      href={`/product/${product.sku}`}
      className="group block animate-fade-in-up overflow-hidden rounded-sm border border-gold/15 bg-ivory shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl"
    >
      <div className="relative aspect-[4/5] w-full overflow-hidden bg-cream-dark">
        {image ? (
          <Image
            src={image.url}
            alt={image.altText ?? product.name}
            fill
            sizes="(max-width: 768px) 50vw, 25vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-brown-light/50">No image</div>
        )}
        <div className="absolute left-3 top-3 flex flex-col gap-1.5">
          {product.isNewArrival && (
            <span className="rounded-sm bg-maroon px-2 py-1 text-[10px] font-medium uppercase tracking-wider text-cream">
              New
            </span>
          )}
          {product.isBestseller && (
            <span className="rounded-sm bg-gold px-2 py-1 text-[10px] font-medium uppercase tracking-wider text-maroon-dark">
              Bestseller
            </span>
          )}
        </div>
        <WishlistButton
          productId={product.id}
          initiallyWishlisted={initiallyWishlisted}
          className="absolute right-3 top-3"
        />
      </div>
      <div className="p-4">
        <p className="text-xs uppercase tracking-wider text-gold-dark">
          {purityLabel(product.purity)} · {formatWeight(product.grossWeight)}
        </p>
        <h3 className="mt-1 truncate font-display text-lg text-brown">{product.name}</h3>
        <div className="mt-2">
          <PriceDisplay price={product.price} size="sm" />
        </div>
      </div>
    </Link>
  );
}
