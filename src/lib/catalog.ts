import "server-only";
import { prisma } from "@/lib/prisma";
import { getPricingContext, priceProductWithRates } from "@/lib/gold";
import type { GoldPurity, ProductStatus, Prisma } from "@/generated/prisma/client";

export interface ProductFilters {
  category?: string | null;
  purity?: GoldPurity | null;
  search?: string | null;
  sort?: string | null;
  featured?: boolean;
  newArrival?: boolean;
  bestseller?: boolean;
  status?: ProductStatus;
  page?: number;
  pageSize?: number;
}

export async function listPricedProducts(filters: ProductFilters) {
  const {
    category, purity, search, sort = "newest",
    featured, newArrival, bestseller,
    status = "PUBLISHED",
    page = 1, pageSize = 12,
  } = filters;

  const where: Prisma.ProductWhereInput = { status };
  if (category) where.category = { slug: category };
  if (purity) where.purity = purity;
  if (featured) where.isFeatured = true;
  if (newArrival) where.isNewArrival = true;
  if (bestseller) where.isBestseller = true;
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { sku: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
    ];
  }

  const orderBy: Prisma.ProductOrderByWithRelationInput =
    sort === "oldest" ? { createdAt: "asc" } : sort === "name_asc" ? { name: "asc" } : { createdAt: "desc" };

  const products = await prisma.product.findMany({
    where,
    orderBy,
    include: { images: { orderBy: { sortOrder: "asc" } }, category: true },
  });

  const ctx = await getPricingContext();
  let priced = products.map((p) => ({ ...p, price: priceProductWithRates(p, ctx.rates, ctx.useExtras, ctx.precision) }));

  if (sort === "price_asc" || sort === "price_desc") {
    priced = priced.sort((a, b) => {
      const av = a.price.available ? a.price.breakdown.finalPrice : 0;
      const bv = b.price.available ? b.price.breakdown.finalPrice : 0;
      return sort === "price_asc" ? av - bv : bv - av;
    });
  }

  const total = priced.length;
  const start = (page - 1) * pageSize;
  const items = priced.slice(start, start + pageSize);

  return { items, pagination: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) } };
}
