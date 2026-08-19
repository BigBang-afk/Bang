import { NextRequest } from "next/server";
import { z, ZodError } from "zod";
import { prisma } from "@/lib/prisma";
import { isNextResponse, jsonError, jsonOk, handleZodError, requireAdmin } from "@/lib/api-helpers";

const schema = z.array(z.object({ categoryId: z.string(), sortOrder: z.number().int(), isActive: z.boolean().optional() }));

export async function PUT(request: NextRequest) {
  const session = await requireAdmin();
  if (isNextResponse(session)) return session;

  try {
    const body = await request.json();
    const data = schema.parse(body);

    await prisma.$transaction([
      prisma.homepageCollection.deleteMany({ where: { homepageSettingsId: "singleton" } }),
      prisma.homepageCollection.createMany({
        data: data.map((d) => ({
          homepageSettingsId: "singleton",
          categoryId: d.categoryId,
          sortOrder: d.sortOrder,
          isActive: d.isActive ?? true,
        })),
      }),
    ]);

    const collections = await prisma.homepageCollection.findMany({
      where: { homepageSettingsId: "singleton" },
      include: { category: true },
      orderBy: { sortOrder: "asc" },
    });

    return jsonOk({ collections });
  } catch (err) {
    if (err instanceof ZodError) return handleZodError(err);
    console.error("update homepage collections error", err);
    return jsonError("Something went wrong.", 500);
  }
}
