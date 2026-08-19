import { NextRequest } from "next/server";
import { ZodError } from "zod";
import { prisma } from "@/lib/prisma";
import { productSchema } from "@/lib/validation";
import { isNextResponse, jsonError, jsonOk, handleZodError, requireAdmin } from "@/lib/api-helpers";
import { logAdminActivity } from "@/lib/activity-log";
import { priceProduct } from "@/lib/gold";

export async function GET(_request: NextRequest, ctx: RouteContext<"/api/admin/products/[id]">) {
  const session = await requireAdmin();
  if (isNextResponse(session)) return session;

  const { id } = await ctx.params;
  const product = await prisma.product.findUnique({
    where: { id },
    include: { images: { orderBy: { sortOrder: "asc" } }, category: true },
  });
  if (!product) return jsonError("Product not found.", 404);

  const price = await priceProduct(product);
  return jsonOk({ product, price });
}

export async function PATCH(request: NextRequest, ctx: RouteContext<"/api/admin/products/[id]">) {
  const session = await requireAdmin();
  if (isNextResponse(session)) return session;

  const { id } = await ctx.params;

  try {
    const body = await request.json();
    const data = productSchema.partial().parse(body);

    if (data.sku) {
      const existing = await prisma.product.findFirst({ where: { sku: data.sku, NOT: { id } } });
      if (existing) {
        return jsonError("A product with this SKU already exists.", 409, {
          fieldErrors: { sku: "This SKU is already in use." },
        });
      }
    }

    const product = await prisma.product.update({
      where: { id },
      data,
      include: { images: { orderBy: { sortOrder: "asc" } }, category: true },
    });

    await logAdminActivity({
      adminId: session.adminId,
      action: "PRODUCT_EDITED",
      description: `Edited product "${product.name}" (${product.sku})`,
      entityType: "Product",
      entityId: product.id,
      request,
    });

    return jsonOk({ product });
  } catch (err) {
    if (err instanceof ZodError) return handleZodError(err);
    console.error("update product error", err);
    return jsonError("Something went wrong.", 500);
  }
}

export async function DELETE(request: NextRequest, ctx: RouteContext<"/api/admin/products/[id]">) {
  const session = await requireAdmin();
  if (isNextResponse(session)) return session;

  const { id } = await ctx.params;
  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) return jsonError("Product not found.", 404);

  await prisma.product.delete({ where: { id } });

  await logAdminActivity({
    adminId: session.adminId,
    action: "PRODUCT_DELETED",
    description: `Deleted product "${product.name}" (${product.sku})`,
    entityType: "Product",
    entityId: id,
    request,
  });

  return jsonOk({ success: true });
}
