import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonOk } from "@/lib/api-helpers";
import type { GalleryCategory } from "@/generated/prisma/enums";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category") as GalleryCategory | null;

  const items = await prisma.galleryItem.findMany({
    where: { isActive: true, ...(category ? { category } : {}) },
    orderBy: { sortOrder: "asc" },
  });

  return jsonOk({ items });
}
