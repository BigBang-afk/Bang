import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentGoldRates } from "@/lib/gold";
import { jsonOk } from "@/lib/api-helpers";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const withHistory = searchParams.get("history");

  const current = await getCurrentGoldRates();

  if (!withHistory) return jsonOk({ current });

  const days = Math.min(365, Math.max(1, Number(searchParams.get("days") ?? "30")));
  const since = new Date();
  since.setDate(since.getDate() - days);

  const history = await prisma.goldRate.findMany({
    where: { effectiveAt: { gte: since } },
    orderBy: { effectiveAt: "asc" },
  });

  return jsonOk({ current, history });
}
