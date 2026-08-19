import "server-only";
import { prisma } from "@/lib/prisma";
import { birthdayBucket } from "@/lib/birthdays";

export type DynamicGroupKey =
  | "all"
  | "new_customers"
  | "vip"
  | "birthday_customers"
  | "purchased"
  | "inactive";

export const DYNAMIC_GROUP_LABELS: Record<DynamicGroupKey, string> = {
  all: "All Customers",
  new_customers: "New Customers",
  vip: "VIP Customers",
  birthday_customers: "Birthday Customers (this week)",
  purchased: "Customers Who Purchased",
  inactive: "Inactive Customers (90+ days)",
};

/**
 * Resolves a target audience for a marketing campaign. `groupKey` may be one
 * of the built-in dynamic segment keys above, a saved CustomerGroup id, or
 * "selected" to use the explicit `customerIds` list as-is. Only customers
 * who have not opted out of marketing (marketingConsent) are ever included.
 */
export async function resolveRecipients(groupKey: string, customerIds?: string[]) {
  if (groupKey === "selected") {
    if (!customerIds?.length) return [];
    return prisma.customer.findMany({
      where: { id: { in: customerIds }, isActive: true, marketingConsent: true },
    });
  }

  const dynamicKeys = Object.keys(DYNAMIC_GROUP_LABELS);
  if (dynamicKeys.includes(groupKey)) {
    const all = await prisma.customer.findMany({
      where: { isActive: true, marketingConsent: true },
      include: { _count: { select: { orders: true } }, orders: { orderBy: { createdAt: "desc" }, take: 1 } },
    });
    const now = new Date();

    switch (groupKey as DynamicGroupKey) {
      case "all":
        return all;
      case "vip":
        return all.filter((c) => c.customerType === "VIP");
      case "new_customers": {
        const since = new Date();
        since.setDate(since.getDate() - 30);
        return all.filter((c) => c.createdAt >= since);
      }
      case "birthday_customers":
        return all.filter((c) => ["today", "this_week"].includes(birthdayBucket(c.dob, now)));
      case "purchased":
        return all.filter((c) => c._count.orders > 0);
      case "inactive": {
        const ninetyDaysAgo = new Date();
        ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
        return all.filter((c) => !c.orders[0] || c.orders[0].createdAt < ninetyDaysAgo);
      }
    }
  }

  // Otherwise, treat groupKey as a saved CustomerGroup id.
  const members = await prisma.customerGroupMember.findMany({
    where: { groupId: groupKey, customer: { isActive: true, marketingConsent: true } },
    include: { customer: true },
  });
  return members.map((m) => m.customer);
}
