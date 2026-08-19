import { prisma } from "@/lib/prisma";
import { isNextResponse, jsonOk, requireAdmin } from "@/lib/api-helpers";
import { getCurrentGoldRates } from "@/lib/gold";
import { birthdayBucket } from "@/lib/birthdays";

export async function GET() {
  const session = await requireAdmin();
  if (isNextResponse(session)) return session;

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);

  const [
    totalCustomers,
    totalProducts,
    totalCategories,
    newCustomersThisMonth,
    totalOrders,
    lowStock,
    recentOrders,
    recentActivity,
    allCustomerDobs,
    goldRates,
    orderItemsForSales,
    registrationsRaw,
    categoryPopularity,
  ] = await Promise.all([
    prisma.customer.count(),
    prisma.product.count(),
    prisma.category.count(),
    prisma.customer.count({ where: { createdAt: { gte: startOfMonth } } }),
    prisma.order.count(),
    prisma.product.count({ where: { stockStatus: "OUT_OF_STOCK" } }),
    prisma.order.findMany({
      orderBy: { createdAt: "desc" },
      take: 6,
      include: { customer: true, items: true },
    }),
    prisma.adminActivityLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { admin: { select: { name: true } } },
    }),
    prisma.customer.findMany({ select: { id: true, fullName: true, mobile: true, dob: true } }),
    getCurrentGoldRates(),
    prisma.orderItem.findMany({
      where: { order: { createdAt: { gte: thirtyDaysAgo } } },
      select: { finalPriceAtOrder: true, order: { select: { createdAt: true } } },
    }),
    prisma.customer.findMany({
      where: { createdAt: { gte: twelveMonthsAgo } },
      select: { createdAt: true },
    }),
    prisma.category.findMany({
      select: { name: true, _count: { select: { products: true } } },
      orderBy: { products: { _count: "desc" } },
      take: 6,
    }),
  ]);

  const todaysBirthdays = allCustomerDobs.filter((c) => birthdayBucket(c.dob, now) === "today");

  // Sales over the last 30 days, grouped by date.
  const salesByDay = new Map<string, number>();
  for (const item of orderItemsForSales) {
    const key = item.order.createdAt.toISOString().slice(0, 10);
    salesByDay.set(key, (salesByDay.get(key) ?? 0) + Number(item.finalPriceAtOrder));
  }
  const salesSeries = Array.from(salesByDay.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, total]) => ({ date, total }));

  const totalSales = orderItemsForSales.reduce((sum, i) => sum + Number(i.finalPriceAtOrder), 0);

  // Customer registrations by month, last 12 months.
  const regByMonth = new Map<string, number>();
  for (const c of registrationsRaw) {
    const key = c.createdAt.toISOString().slice(0, 7);
    regByMonth.set(key, (regByMonth.get(key) ?? 0) + 1);
  }
  const registrationSeries = Array.from(regByMonth.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, count]) => ({ month, count }));

  return jsonOk({
    cards: {
      totalCustomers,
      totalProducts,
      totalCategories,
      todaysGoldRate: goldRates,
      todaysBirthdays: todaysBirthdays.length,
      newCustomersThisMonth,
      totalOrders,
      totalSales,
      lowStockProducts: lowStock,
    },
    charts: {
      salesSeries,
      registrationSeries,
      categoryPopularity: categoryPopularity.map((c) => ({ name: c.name, count: c._count.products })),
    },
    recentOrders,
    recentActivity,
    todaysBirthdayList: todaysBirthdays,
  });
}
