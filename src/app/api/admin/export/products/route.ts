import { requireAdmin } from "@/lib/auth";
import { listProducts } from "@/lib/data/products";
import { getActiveRateMap } from "@/lib/data/gold-rates";
import { computeProductPrice } from "@/lib/pricing/compute";
import { toCsv, csvResponse } from "@/lib/csv";

export async function GET() {
  await requireAdmin();

  const [{ products }, activeRates] = await Promise.all([
    listProducts({ filters: { includeInactive: true, includeDrafts: true }, pageSize: 5000 }),
    getActiveRateMap(),
  ]);

  const rows = products.map((p) => {
    const price = computeProductPrice(p, activeRates);
    return {
      product_code: p.product_code,
      name: p.name,
      category: p.category?.name ?? "",
      purity: p.purity,
      gross_weight_grams: p.gross_weight_grams,
      pricing_method: p.pricing_method,
      final_price: price.visible ? price.finalPrice : price.label,
      availability_status: p.availability_status,
      is_active: p.is_active,
      is_featured: p.is_featured,
      is_new_arrival: p.is_new_arrival,
      view_count: p.view_count,
      inquiry_count: p.inquiry_count,
      created_at: p.created_at,
    };
  });

  const csv = toCsv(rows, [
    { key: "product_code", header: "Code" },
    { key: "name", header: "Name" },
    { key: "category", header: "Category" },
    { key: "purity", header: "Purity" },
    { key: "gross_weight_grams", header: "Gross Weight (g)" },
    { key: "pricing_method", header: "Pricing Method" },
    { key: "final_price", header: "Price" },
    { key: "availability_status", header: "Availability" },
    { key: "is_active", header: "Active" },
    { key: "is_featured", header: "Featured" },
    { key: "is_new_arrival", header: "New Arrival" },
    { key: "view_count", header: "Views" },
    { key: "inquiry_count", header: "Inquiries" },
    { key: "created_at", header: "Created At" },
  ]);

  return csvResponse("products.csv", csv);
}
