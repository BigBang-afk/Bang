import { NextRequest } from "next/server";
import { jsonOk } from "@/lib/api-helpers";
import { listPricedProducts } from "@/lib/catalog";
import type { GoldPurity, ProductStatus } from "@/generated/prisma/enums";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const result = await listPricedProducts({
    category: searchParams.get("category"),
    purity: searchParams.get("purity") as GoldPurity | null,
    search: searchParams.get("search")?.trim(),
    sort: searchParams.get("sort"),
    featured: Boolean(searchParams.get("featured")),
    newArrival: Boolean(searchParams.get("newArrival")),
    bestseller: Boolean(searchParams.get("bestseller")),
    status: (searchParams.get("status") as ProductStatus | null) ?? "PUBLISHED",
    page: Math.max(1, Number(searchParams.get("page") ?? "1")),
    pageSize: Math.min(48, Math.max(1, Number(searchParams.get("pageSize") ?? "12"))),
  });

  return jsonOk(result);
}
