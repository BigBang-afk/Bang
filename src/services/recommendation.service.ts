import "server-only";
import { prisma } from "@/lib/db/prisma";
import { Prisma } from "@/generated/prisma/client";

/**
 * AI product recommendations — see AI-MARKETING.md "Product
 * recommendations". Recommendations are built entirely from (a) the
 * customer's own real purchase history and (b) currently available
 * (IN_STOCK, non-archived) inventory — never sold-out stock, never a
 * fabricated product. Every recommendation carries an explicit, factual
 * reason string; there is no "just trust the AI" recommendation anywhere
 * in this service.
 */

export type ProductRecommendation = {
  inventoryItemId: string;
  productName: string;
  categoryName: string;
  purity: string;
  netWeight: string;
  sellingPrice: string;
  reason: string;
};

type PurchaseHistoryFact = {
  categoryIds: Set<string>;
  categoryNames: Map<string, string>;
  purities: Set<string>;
  minPrice: Prisma.Decimal;
  maxPrice: Prisma.Decimal;
};

async function getPurchaseHistoryFacts(customerId: string): Promise<PurchaseHistoryFact | null> {
  const items = await prisma.saleItem.findMany({
    where: { sale: { customerId, status: { not: "RETURNED" } } },
    select: {
      purity: true,
      finalPrice: true,
      inventoryItem: { select: { product: { select: { categoryId: true, category: { select: { name: true } } } } } },
    },
  });

  if (items.length === 0) return null;

  const categoryIds = new Set<string>();
  const categoryNames = new Map<string, string>();
  const purities = new Set<string>();
  let minPrice = items[0].finalPrice;
  let maxPrice = items[0].finalPrice;

  for (const item of items) {
    const categoryId = item.inventoryItem.product.categoryId;
    categoryIds.add(categoryId);
    categoryNames.set(categoryId, item.inventoryItem.product.category.name);
    purities.add(item.purity);
    if (item.finalPrice.lt(minPrice)) minPrice = item.finalPrice;
    if (item.finalPrice.gt(maxPrice)) maxPrice = item.finalPrice;
  }

  return { categoryIds, categoryNames, purities, minPrice, maxPrice };
}

/**
 * Recommends currently-available inventory the customer has never bought,
 * ranked by how many of (same category, same purity, similar price band)
 * it matches. Returns an empty list — never a guess — when the customer
 * has no purchase history to base a recommendation on.
 */
export async function getRecommendationsForCustomer(customerId: string, limit = 5): Promise<ProductRecommendation[]> {
  const facts = await getPurchaseHistoryFacts(customerId);
  if (!facts) return [];

  const priceFloor = facts.minPrice.mul(0.5);
  const priceCeil = facts.maxPrice.mul(1.5);

  const candidates = await prisma.inventoryItem.findMany({
    where: {
      status: "IN_STOCK",
      archivedAt: null,
      OR: [
        { product: { categoryId: { in: [...facts.categoryIds] } } },
        { purity: { in: [...facts.purities] as never[] } },
      ],
    },
    // Newest stock first — both a sensible relevance default (recent
    // arrivals) and what keeps the `take` cap below from silently missing
    // an item at a shop with a large catalog.
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      purity: true,
      netWeight: true,
      sellingPrice: true,
      product: { select: { name: true, categoryId: true, category: { select: { name: true } } } },
    },
    take: 200,
  });

  const scored = candidates.map((item) => {
    const categoryMatch = facts.categoryIds.has(item.product.categoryId);
    const purityMatch = facts.purities.has(item.purity);
    const priceMatch = item.sellingPrice.gte(priceFloor) && item.sellingPrice.lte(priceCeil);
    const score = (categoryMatch ? 2 : 0) + (purityMatch ? 1 : 0) + (priceMatch ? 1 : 0);

    const reasons: string[] = [];
    if (categoryMatch) reasons.push(`this customer previously purchased ${item.product.category.name}`);
    if (purityMatch) reasons.push(`this customer previously purchased ${item.purity} purity jewelry`);
    if (priceMatch) reasons.push(`the price is within this customer's usual purchase range`);

    return { item, score, reason: reasons.length > 0 ? `Recommended because ${reasons.join(" and ")}.` : "" };
  });

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ item, reason }) => ({
      inventoryItemId: item.id,
      productName: item.product.name,
      categoryName: item.product.category.name,
      purity: item.purity,
      netWeight: item.netWeight.toString(),
      sellingPrice: item.sellingPrice.toString(),
      reason,
    }));
}
