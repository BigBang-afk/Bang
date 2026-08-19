import { NextRequest } from "next/server";
import { z, ZodError } from "zod";
import { prisma } from "@/lib/prisma";
import { isNextResponse, jsonError, jsonOk, handleZodError, requireAdmin } from "@/lib/api-helpers";
import { logAdminActivity } from "@/lib/activity-log";

export async function GET() {
  const session = await requireAdmin();
  if (isNextResponse(session)) return session;

  const homepage = await prisma.homepageSettings.findUnique({
    where: { id: "singleton" },
    include: {
      collections: { include: { category: true }, orderBy: { sortOrder: "asc" } },
      featuredProducts: { include: { product: { include: { images: { take: 1 } } } }, orderBy: { sortOrder: "asc" } },
      banners: { orderBy: { sortOrder: "asc" } },
    },
  });
  return jsonOk({ homepage });
}

const updateSchema = z.object({
  status: z.enum(["DRAFT", "PUBLISHED"]).optional(),
  heroEnabled: z.boolean().optional(),
  heroTitle: z.string().trim().max(200).optional(),
  heroSubtitle: z.string().trim().max(400).optional(),
  heroImageUrl: z.string().optional().nullable(),
  heroButtonText: z.string().trim().max(60).optional(),
  heroButtonUrl: z.string().trim().max(200).optional(),
  heroButton2Text: z.string().trim().max(60).optional(),
  heroButton2Url: z.string().trim().max(200).optional(),
  goldRateBarEnabled: z.boolean().optional(),
  showRate24k: z.boolean().optional(),
  showRate21k: z.boolean().optional(),
  showRate18k: z.boolean().optional(),
  trustBadge1Title: z.string().trim().max(80).optional(),
  trustBadge1Text: z.string().trim().max(200).optional(),
  trustBadge2Title: z.string().trim().max(80).optional(),
  trustBadge2Text: z.string().trim().max(200).optional(),
  trustBadge3Title: z.string().trim().max(80).optional(),
  trustBadge3Text: z.string().trim().max(200).optional(),
  trustBadge4Title: z.string().trim().max(80).optional(),
  trustBadge4Text: z.string().trim().max(200).optional(),
});

export async function PATCH(request: NextRequest) {
  const session = await requireAdmin();
  if (isNextResponse(session)) return session;

  try {
    const body = await request.json();
    const data = updateSchema.parse(body);

    const homepage = await prisma.homepageSettings.update({ where: { id: "singleton" }, data });

    await logAdminActivity({
      adminId: session.adminId,
      action: "HOMEPAGE_CHANGED",
      description: "Updated homepage settings",
      entityType: "HomepageSettings",
      entityId: "singleton",
      request,
    });

    return jsonOk({ homepage });
  } catch (err) {
    if (err instanceof ZodError) return handleZodError(err);
    console.error("update homepage error", err);
    return jsonError("Something went wrong.", 500);
  }
}
