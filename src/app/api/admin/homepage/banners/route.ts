import { NextRequest } from "next/server";
import { z, ZodError } from "zod";
import { prisma } from "@/lib/prisma";
import { isNextResponse, jsonError, jsonOk, handleZodError, requireAdmin } from "@/lib/api-helpers";

const schema = z.object({
  imageUrl: z.string().min(1),
  heading: z.string().trim().max(150).optional(),
  description: z.string().trim().max(400).optional(),
  buttonText: z.string().trim().max(60).optional(),
  buttonUrl: z.string().trim().max(200).optional(),
  isActive: z.boolean().optional().default(true),
  sortOrder: z.coerce.number().int().optional().default(0),
});

export async function POST(request: NextRequest) {
  const session = await requireAdmin();
  if (isNextResponse(session)) return session;

  try {
    const body = await request.json();
    const data = schema.parse(body);
    const banner = await prisma.banner.create({ data: { ...data, homepageSettingsId: "singleton" } });
    return jsonOk({ banner }, 201);
  } catch (err) {
    if (err instanceof ZodError) return handleZodError(err);
    console.error("create banner error", err);
    return jsonError("Something went wrong.", 500);
  }
}
