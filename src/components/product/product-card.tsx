import Link from "next/link";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { ProductPrice } from "@/components/product/product-price";
import { ProductWhatsAppButton } from "@/components/product/product-whatsapp-button";
import { AVAILABILITY_LABELS } from "@/lib/constants";
import { formatWeight } from "@/lib/utils";
import type { ActiveRateMap } from "@/lib/pricing/product-pricing";
import { computeProductPrice } from "@/lib/pricing/compute";
import type { ProductWithRelations } from "@/types/database";

export function ProductCard({ product, activeRates }: { product: ProductWithRelations; activeRates: ActiveRateMap }) {
  const price = computeProductPrice(product, activeRates);
  const cover = product.cover_image_url ?? product.images[0]?.image_url ?? "/placeholder-product.svg";

  return (
    <div className="card-lift group flex flex-col overflow-hidden rounded-sm border border-charcoal/10 bg-white">
      <Link href={`/products/${product.slug}`} className="relative block aspect-square overflow-hidden bg-ivory-dark">
        <Image
          src={cover}
          alt={product.images[0]?.alt_text ?? product.name}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          className="object-cover transition-transform duration-700 ease-out group-hover:scale-110"
        />
        <div className="absolute left-2 top-2 flex flex-col gap-1.5">
          {product.is_featured && <Badge tone="gold">Featured</Badge>}
          {product.is_new_arrival && <Badge tone="charcoal">New</Badge>}
        </div>
        {product.availability_status !== "in_stock" && (
          <div className="absolute right-2 top-2">
            <Badge tone={product.availability_status === "sold" || product.availability_status === "out_of_stock" ? "red" : "amber"}>
              {AVAILABILITY_LABELS[product.availability_status]}
            </Badge>
          </div>
        )}
      </Link>

      <div className="flex flex-1 flex-col gap-1.5 p-4">
        <p className="text-xs uppercase tracking-wide text-charcoal/40">{product.category?.name ?? "Jewelry"} · {product.product_code}</p>
        <Link href={`/products/${product.slug}`}>
          <h3 className="font-serif text-lg leading-snug text-charcoal transition-colors hover:text-gold-dark">{product.name}</h3>
        </Link>
        <p className="text-xs text-charcoal/50">{product.purity} · {formatWeight(product.gross_weight_grams)}</p>

        <div className="mt-2">
          <ProductPrice price={price} size="sm" />
        </div>

        <div className="mt-3 flex gap-2">
          <Link
            href={`/products/${product.slug}`}
            className="flex-1 rounded-sm border border-charcoal px-3 py-2 text-center text-xs font-medium text-charcoal transition-colors hover:bg-charcoal hover:text-ivory"
          >
            View Details
          </Link>
          <ProductWhatsAppButton product={product} price={price} compact />
        </div>
      </div>
    </div>
  );
}
