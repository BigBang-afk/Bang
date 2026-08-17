import { ProductMarketingGenerator } from "@/components/ai-marketing/product-marketing-generator";

export const metadata = { title: "AI Product Marketing | Zarghoon Jewellers" };

export default function ProductMarketingPage() {
  return (
    <div className="flex flex-1 flex-col gap-6 p-4 sm:p-6">
      <div>
        <h1 className="font-display text-xl font-semibold text-foreground">AI Product Marketing</h1>
        <p className="text-sm text-muted-foreground">
          Generate Instagram, Facebook, TikTok, and WhatsApp captions from a product&apos;s real recorded details —
          name, purity, weight, and category only. Every caption starts as a DRAFT and is never published
          automatically.
        </p>
      </div>
      <ProductMarketingGenerator />
    </div>
  );
}
