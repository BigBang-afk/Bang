import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { isNextResponse, jsonOk, requireAdmin } from "@/lib/api-helpers";
import { csvResponse } from "@/lib/csv";

export async function GET(request: NextRequest) {
  const session = await requireAdmin();
  if (isNextResponse(session)) return session;

  const { searchParams } = new URL(request.url);
  const format = searchParams.get("format");

  const products = await prisma.product.findMany({
    include: { category: true, _count: { select: { orderItems: true } } },
    orderBy: { viewCount: "desc" },
  });

  const rows = products.map((p) => ({
    name: p.name,
    sku: p.sku,
    category: p.category.name,
    purity: p.purity,
    views: p.viewCount,
    inquiries: p.inquiryCount,
    timesSold: p._count.orderItems,
    status: p.status,
    stockStatus: p.stockStatus,
  }));

  if (format === "csv") return csvResponse("products-report.csv", rows);

  return jsonOk({
    mostViewed: [...rows].sort((a, b) => b.views - a.views).slice(0, 10),
    mostInquired: [...rows].sort((a, b) => b.inquiries - a.inquiries).slice(0, 10),
    mostSold: [...rows].sort((a, b) => b.timesSold - a.timesSold).slice(0, 10),
    rows,
  });
}
