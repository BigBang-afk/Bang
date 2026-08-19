import { prisma } from "@/lib/prisma";
import { jsonError, jsonOk } from "@/lib/api-helpers";
import { priceProduct } from "@/lib/gold";

export async function GET(
  _request: Request,
  ctx: RouteContext<"/api/products/[sku]">,
) {
  const { sku } = await ctx.params;

  const product = await prisma.product.findUnique({
    where: { sku },
    include: { images: { orderBy: { sortOrder: "asc" } }, category: true },
  });

  if (!product || product.status !== "PUBLISHED") {
    return jsonError("Product not found.", 404);
  }

  prisma.product
    .update({ where: { id: product.id }, data: { viewCount: { increment: 1 } } })
    .catch(() => {});

  const price = await priceProduct(product);

  const related = await prisma.product.findMany({
    where: { categoryId: product.categoryId, status: "PUBLISHED", NOT: { id: product.id } },
    include: { images: { orderBy: { sortOrder: "asc" }, take: 1 } },
    take: 4,
  });

  return jsonOk({ product, price, related });
}
