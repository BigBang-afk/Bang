import { NextRequest } from "next/server";
import { ZodError } from "zod";
import { prisma } from "@/lib/prisma";
import { gallerySchema } from "@/lib/validation";
import { isNextResponse, jsonError, jsonOk, handleZodError, requireAdmin } from "@/lib/api-helpers";

export async function GET() {
  const session = await requireAdmin();
  if (isNextResponse(session)) return session;

  const items = await prisma.galleryItem.findMany({ orderBy: [{ category: "asc" }, { sortOrder: "asc" }] });
  return jsonOk({ items });
}

export async function POST(request: NextRequest) {
  const session = await requireAdmin();
  if (isNextResponse(session)) return session;

  try {
    const body = await request.json();
    const data = gallerySchema.parse(body);
    const item = await prisma.galleryItem.create({ data });
    return jsonOk({ item }, 201);
  } catch (err) {
    if (err instanceof ZodError) return handleZodError(err);
    console.error("create gallery item error", err);
    return jsonError("Something went wrong.", 500);
  }
}
