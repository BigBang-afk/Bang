import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { isNextResponse, jsonOk, requireAdmin } from "@/lib/api-helpers";
import { csvResponse } from "@/lib/csv";

export async function GET(request: NextRequest) {
  const session = await requireAdmin();
  if (isNextResponse(session)) return session;

  const { searchParams } = new URL(request.url);
  const format = searchParams.get("format");
  const days = Math.min(730, Math.max(1, Number(searchParams.get("days") ?? "90")));
  const since = new Date();
  since.setDate(since.getDate() - days);

  const rates = await prisma.goldRate.findMany({
    where: { effectiveAt: { gte: since } },
    orderBy: { effectiveAt: "asc" },
    include: { updatedByAdmin: { select: { name: true } } },
  });

  const rows = rates.map((r) => ({
    date: r.effectiveAt.toISOString(),
    purity: r.purity,
    ratePerGram: r.ratePerGram.toString(),
    updatedBy: r.updatedByAdmin?.name ?? "",
    notes: r.notes ?? "",
  }));

  if (format === "csv") return csvResponse("gold-rate-history.csv", rows);

  return jsonOk({
    rows,
    series: {
      K24: rates.filter((r) => r.purity === "K24").map((r) => ({ date: r.effectiveAt, rate: Number(r.ratePerGram) })),
      K21: rates.filter((r) => r.purity === "K21").map((r) => ({ date: r.effectiveAt, rate: Number(r.ratePerGram) })),
      K18: rates.filter((r) => r.purity === "K18").map((r) => ({ date: r.effectiveAt, rate: Number(r.ratePerGram) })),
    },
  });
}
