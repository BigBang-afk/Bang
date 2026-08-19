import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { isNextResponse, jsonOk, requireAdmin } from "@/lib/api-helpers";

export async function GET(request: NextRequest) {
  const session = await requireAdmin();
  if (isNextResponse(session)) return session;

  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");
  const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
  const pageSize = Math.min(200, Math.max(1, Number(searchParams.get("pageSize") ?? "50")));

  const where = action ? { action } : {};

  const [total, items] = await Promise.all([
    prisma.adminActivityLog.count({ where }),
    prisma.adminActivityLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { admin: { select: { name: true, email: true } } },
    }),
  ]);

  return jsonOk({ items, pagination: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) } });
}
