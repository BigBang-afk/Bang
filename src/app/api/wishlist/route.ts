import { NextRequest } from "next/server";
import { z, ZodError } from "zod";
import { prisma } from "@/lib/prisma";
import { getCustomerSession } from "@/lib/auth-customer";
import { jsonError, jsonOk, handleZodError } from "@/lib/api-helpers";

export async function GET() {
  const session = await getCustomerSession();
  if (!session) return jsonError("Please log in to continue.", 401);

  const items = await prisma.wishlist.findMany({
    where: { customerId: session.customerId },
    include: {
      product: {
        include: { images: { orderBy: { sortOrder: "asc" }, take: 1 }, category: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return jsonOk({ items });
}

const addSchema = z.object({ productId: z.string().min(1) });

export async function POST(request: NextRequest) {
  const session = await getCustomerSession();
  if (!session) return jsonError("Please log in to continue.", 401);

  try {
    const body = await request.json();
    const { productId } = addSchema.parse(body);

    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) return jsonError("Product not found.", 404);

    const item = await prisma.wishlist.upsert({
      where: { customerId_productId: { customerId: session.customerId, productId } },
      update: {},
      create: { customerId: session.customerId, productId },
    });

    return jsonOk({ item }, 201);
  } catch (err) {
    if (err instanceof ZodError) return handleZodError(err);
    console.error("wishlist add error", err);
    return jsonError("Something went wrong.", 500);
  }
}
