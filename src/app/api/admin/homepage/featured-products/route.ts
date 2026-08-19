import { NextRequest } from "next/server";
import { z, ZodError } from "zod";
import { prisma } from "@/lib/prisma";
import { isNextResponse, jsonError, jsonOk, handleZodError, requireAdmin } from "@/lib/api-helpers";

const schema = z.array(z.object({ productId: z.string(), sortOrder: z.number().int() }));

export async function PUT(request: NextRequest) {
  const session = await requireAdmin();
  if (isNextResponse(session)) return session;

  try {
    const body = await request.json();
    const data = schema.parse(body);

    await prisma.$transaction([
      prisma.homepageFeaturedProduct.deleteMany({ where: { homepageSettingsId: "singleton" } }),
      prisma.homepageFeaturedProduct.createMany({
        data: data.map((d) => ({ homepageSettingsId: "singleton", productId: d.productId, sortOrder: d.sortOrder })),
      }),
    ]);

    const featuredProducts = await prisma.homepageFeaturedProduct.findMany({
      where: { homepageSettingsId: "singleton" },
      include: { product: { include: { images: { take: 1 } } } },
      orderBy: { sortOrder: "asc" },
    });

    return jsonOk({ featuredProducts });
  } catch (err) {
    if (err instanceof ZodError) return handleZodError(err);
    console.error("update homepage featured products error", err);
    return jsonError("Something went wrong.", 500);
  }
}
