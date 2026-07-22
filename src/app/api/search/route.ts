import { NextResponse } from "next/server";
import { listProducts } from "@/lib/data/products";
import { getActiveRateMap } from "@/lib/data/gold-rates";
import { computeProductPrice } from "@/lib/pricing/compute";
import { formatPKR } from "@/lib/utils";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();

  if (!q || q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const [activeRates, { products }] = await Promise.all([
    getActiveRateMap(),
    listProducts({ filters: { search: q }, pageSize: 8 }),
  ]);

  const results = products.map((p) => {
    const price = computeProductPrice(p, activeRates);
    return {
      slug: p.slug,
      name: p.name,
      code: p.product_code,
      image: p.cover_image_url ?? "/placeholder-product.svg",
      purity: p.purity,
      weight: p.gross_weight_grams,
      priceLabel: price.visible ? formatPKR(price.finalPrice) : price.label,
      availability: p.availability_status,
    };
  });

  return NextResponse.json({ results });
}
