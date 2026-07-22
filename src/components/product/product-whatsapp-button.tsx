"use client";

import { MessageCircle } from "lucide-react";
import { buildWhatsAppUrl, productInquiryMessage } from "@/lib/whatsapp";
import { formatPKR } from "@/lib/utils";
import type { PriceResult } from "@/lib/pricing/product-pricing";
import type { ProductWithRelations } from "@/types/database";
import { cn } from "@/lib/utils";

export function ProductWhatsAppButton({
  product,
  price,
  whatsappNumber,
  compact = false,
}: {
  product: ProductWithRelations;
  price: PriceResult;
  whatsappNumber?: string;
  compact?: boolean;
}) {
  const displayPrice = price.visible ? formatPKR(price.finalPrice) : price.label;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const productUrl = `${siteUrl}/products/${product.slug}`;

  const message = productInquiryMessage({
    productName: product.name,
    productCode: product.product_code,
    purity: product.purity,
    grossWeightGrams: product.gross_weight_grams,
    displayPrice,
    productUrl,
  });

  const number = whatsappNumber ?? process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "923000000000";

  return (
    <a
      href={buildWhatsAppUrl(number, message)}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`WhatsApp inquiry for ${product.name}`}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-sm bg-[#25D366] text-white transition-colors hover:bg-[#1ebe57]",
        compact ? "px-3 py-2 text-xs" : "px-5 py-2.5 text-sm font-medium"
      )}
    >
      <MessageCircle size={compact ? 14 : 17} />
      {!compact && "WhatsApp Inquiry"}
    </a>
  );
}
