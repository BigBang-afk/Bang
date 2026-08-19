import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { isNextResponse, jsonOk, requireAdmin } from "@/lib/api-helpers";
import { birthdayBucket } from "@/lib/birthdays";
import type { Prisma, CustomerType } from "@/generated/prisma/client";

export async function GET(request: NextRequest) {
  const session = await requireAdmin();
  if (isNextResponse(session)) return session;

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search")?.trim();
  const customerType = searchParams.get("customerType") as CustomerType | null;
  const group = searchParams.get("group"); // new | birthday_today | birthday_week | birthday_month | purchased | inactive
  const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
  const pageSize = Math.min(200, Math.max(1, Number(searchParams.get("pageSize") ?? "25")));

  const where: Prisma.CustomerWhereInput = {};
  if (customerType) where.customerType = customerType;
  if (search) {
    where.OR = [
      { fullName: { contains: search, mode: "insensitive" } },
      { mobile: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
    ];
  }
  if (group === "new") {
    const since = new Date();
    since.setDate(since.getDate() - 30);
    where.createdAt = { gte: since };
  }

  const all = await prisma.customer.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { orders: true, wishlist: true } },
      orders: { orderBy: { createdAt: "desc" }, take: 1, select: { createdAt: true, items: { select: { finalPriceAtOrder: true } } } },
    },
  });

  const now = new Date();
  let filtered = all;
  if (group === "birthday_today") filtered = all.filter((c) => birthdayBucket(c.dob, now) === "today");
  if (group === "birthday_week") filtered = all.filter((c) => ["today", "this_week"].includes(birthdayBucket(c.dob, now)));
  if (group === "birthday_month") filtered = all.filter((c) => ["today", "this_week", "this_month"].includes(birthdayBucket(c.dob, now)));
  if (group === "purchased") filtered = all.filter((c) => c._count.orders > 0);
  if (group === "inactive") {
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    filtered = all.filter((c) => !c.orders[0] || c.orders[0].createdAt < ninetyDaysAgo);
  }
  if (group === "vip") filtered = all.filter((c) => c.customerType === "VIP");

  const total = filtered.length;
  const start = (page - 1) * pageSize;
  const items = filtered.slice(start, start + pageSize).map((c) => ({
    id: c.id,
    fullName: c.fullName,
    mobile: c.mobile,
    email: c.email,
    dob: c.dob,
    createdAt: c.createdAt,
    customerType: c.customerType,
    marketingConsent: c.marketingConsent,
    isActive: c.isActive,
    totalPurchases: c._count.orders,
    lastPurchase: c.orders[0]?.createdAt ?? null,
    birthdayStatus: birthdayBucket(c.dob, now),
  }));

  return jsonOk({ items, pagination: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) } });
}
