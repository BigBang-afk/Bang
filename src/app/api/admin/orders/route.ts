import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { isNextResponse, jsonOk, requireAdmin } from "@/lib/api-helpers";
import type { OrderStatus, Prisma } from "@/generated/prisma/client";

export async function GET(request: NextRequest) {
  const session = await requireAdmin();
  if (isNextResponse(session)) return session;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") as OrderStatus | null;
  const search = searchParams.get("search")?.trim();
  const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
  const pageSize = Math.min(100, Math.max(1, Number(searchParams.get("pageSize") ?? "25")));

  const where: Prisma.OrderWhereInput = {};
  if (status) where.status = status;
  if (search) {
    where.OR = [
      { orderNumber: { contains: search, mode: "insensitive" } },
      { guestName: { contains: search, mode: "insensitive" } },
      { guestMobile: { contains: search, mode: "insensitive" } },
      { customer: { fullName: { contains: search, mode: "insensitive" } } },
      { customer: { mobile: { contains: search, mode: "insensitive" } } },
    ];
  }

  const [total, orders] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { customer: true, items: true },
    }),
  ]);

  return jsonOk({ items: orders, pagination: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) } });
}
