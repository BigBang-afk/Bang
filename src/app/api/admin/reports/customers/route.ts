import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { isNextResponse, jsonOk, requireAdmin } from "@/lib/api-helpers";
import { csvResponse } from "@/lib/csv";
import { birthdayBucket } from "@/lib/birthdays";

export async function GET(request: NextRequest) {
  const session = await requireAdmin();
  if (isNextResponse(session)) return session;

  const { searchParams } = new URL(request.url);
  const format = searchParams.get("format");

  const customers = await prisma.customer.findMany({
    include: { _count: { select: { orders: true } }, orders: { orderBy: { createdAt: "desc" }, take: 1 } },
    orderBy: { createdAt: "desc" },
  });

  const now = new Date();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const rows = customers.map((c) => ({
    name: c.fullName,
    mobile: c.mobile,
    email: c.email ?? "",
    registeredOn: c.createdAt.toISOString().slice(0, 10),
    customerType: c.customerType,
    totalPurchases: c._count.orders,
    lastPurchase: c.orders[0]?.createdAt.toISOString().slice(0, 10) ?? "",
    birthdayStatus: birthdayBucket(c.dob, now),
  }));

  if (format === "csv") return csvResponse("customers-report.csv", rows);

  return jsonOk({
    rows,
    summary: {
      total: customers.length,
      newLast30Days: customers.filter((c) => c.createdAt >= thirtyDaysAgo).length,
      returning: customers.filter((c) => c._count.orders > 0).length,
      vip: customers.filter((c) => c.customerType === "VIP").length,
      birthdayThisWeek: customers.filter((c) => ["today", "this_week"].includes(birthdayBucket(c.dob, now))).length,
    },
  });
}
