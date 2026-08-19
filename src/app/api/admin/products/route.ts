import { NextRequest } from "next/server";
import { ZodError } from "zod";
import { prisma } from "@/lib/prisma";
import { productSchema } from "@/lib/validation";
import { isNextResponse, jsonError, jsonOk, handleZodError, requireAdmin, generateSku } from "@/lib/api-helpers";
import { logAdminActivity } from "@/lib/activity-log";
import { getPricingContext, priceProductWithRates } from "@/lib/gold";
import type { Prisma, ProductStatus } from "@/generated/prisma/client";

export async function GET(request: NextRequest) {
  const session = await requireAdmin();
  if (isNextResponse(session)) return session;

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search")?.trim();
  const category = searchParams.get("category");
  const status = searchParams.get("status") as ProductStatus | null;
  const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
  const pageSize = Math.min(100, Math.max(1, Number(searchParams.get("pageSize") ?? "20")));

  const where: Prisma.ProductWhereInput = {};
  if (status) where.status = status;
  if (category) where.categoryId = category;
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { sku: { contains: search, mode: "insensitive" } },
    ];
  }

  const [total, products] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { images: { orderBy: { sortOrder: "asc" } }, category: true },
    }),
  ]);

  const ctx = await getPricingContext();
  const items = products.map((p) => ({
    ...p,
    price: priceProductWithRates(p, ctx.rates, ctx.useExtras, ctx.precision),
  }));

  return jsonOk({ items, pagination: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) } });
}

export async function POST(request: NextRequest) {
  const session = await requireAdmin();
  if (isNextResponse(session)) return session;

  try {
    const body = await request.json();
    const data = productSchema.parse(body);

    const sku = data.sku?.trim() || generateSku();
    const existing = await prisma.product.findUnique({ where: { sku } });
    if (existing) {
      return jsonError("A product with this SKU already exists.", 409, {
        fieldErrors: { sku: "This SKU is already in use." },
      });
    }

    const product = await prisma.product.create({
      data: { ...data, sku },
      include: { images: true, category: true },
    });

    await logAdminActivity({
      adminId: session.adminId,
      action: "PRODUCT_ADDED",
      description: `Added product "${product.name}" (${product.sku})`,
      entityType: "Product",
      entityId: product.id,
      request,
    });

    return jsonOk({ product }, 201);
  } catch (err) {
    if (err instanceof ZodError) return handleZodError(err);
    console.error("create product error", err);
    return jsonError("Something went wrong.", 500);
  }
}
