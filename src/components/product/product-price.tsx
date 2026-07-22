import { formatPKR } from "@/lib/utils";
import type { PriceResult } from "@/lib/pricing/product-pricing";

export function ProductPrice({ price, size = "md" }: { price: PriceResult; size?: "sm" | "md" | "lg" }) {
  const sizeClasses = { sm: "text-base", md: "text-xl", lg: "text-3xl" }[size];

  if (!price.visible) {
    return <p className={`font-serif ${sizeClasses} text-charcoal/70`}>{price.label}</p>;
  }

  return (
    <div className="flex flex-wrap items-baseline gap-2">
      <span className={`font-serif ${sizeClasses} text-charcoal`}>{formatPKR(price.finalPrice)}</span>
      {price.discountAmount > 0 && (
        <span className="text-sm text-charcoal/40 line-through">{formatPKR(price.basePrice)}</span>
      )}
      {price.discountPercentage && (
        <span className="rounded-sm bg-gold/15 px-1.5 py-0.5 text-xs font-medium text-gold-dark">
          -{price.discountPercentage}%
        </span>
      )}
    </div>
  );
}
