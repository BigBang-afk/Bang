import { formatPkr } from "@/lib/format";
import type { PricedProduct } from "@/lib/gold";

export function PriceDisplay({ price, size = "md" }: { price: PricedProduct; size?: "sm" | "md" | "lg" }) {
  if (!price.available) {
    return <span className="text-sm text-brown-light italic">Price on request</span>;
  }

  const textSize = size === "lg" ? "text-3xl" : size === "sm" ? "text-base" : "text-xl";

  return (
    <span className={`font-display ${textSize} font-semibold text-maroon`}>
      {formatPkr(price.breakdown.finalPrice)}
    </span>
  );
}
