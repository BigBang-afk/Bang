import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { isNextResponse, jsonOk, requireAdmin } from "@/lib/api-helpers";
import { csvResponse } from "@/lib/csv";

export async function GET(request: NextRequest) {
  const session = await requireAdmin();
  if (isNextResponse(session)) return session;

  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from") ? new Date(searchParams.get("from")!) : new Date(Date.now() - 30 * 86400000);
  const to = searchParams.get("to") ? new Date(searchParams.get("to")!) : new Date();
  const format = searchParams.get("format");

  const items = await prisma.orderItem.findMany({
    where: { order: { createdAt: { gte: from, lte: to } } },
    include: { order: true, product: { select: { name: true, sku: true } } },
    orderBy: { order: { createdAt: "desc" } },
  });

  const rows = items.map((i) => ({
    date: i.order.createdAt.toISOString().slice(0, 10),
    orderNumber: i.order.orderNumber,
    status: i.order.status,
    product: i.productNameAtOrder,
    sku: i.product?.sku ?? "",
    purity: i.purityAtOrder,
    grossWeight: i.grossWeightAtOrder.toString(),
    goldRate: i.goldRatePerGramAtOrder.toString(),
    finalPrice: i.finalPriceAtOrder.toString(),
  }));

  if (format === "csv") return csvResponse("sales-report.csv", rows);

  const total = rows.reduce((sum, r) => sum + Number(r.finalPrice), 0);
  const byDay = new Map<string, number>();
  for (const r of rows) byDay.set(r.date, (byDay.get(r.date) ?? 0) + Number(r.finalPrice));

  return jsonOk({
    rows,
    summary: { total, count: rows.length },
    series: Array.from(byDay.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([date, value]) => ({ date, value })),
  });
}
