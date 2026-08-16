import "server-only";
import { prisma } from "@/lib/db/prisma";
import { formatCustomerCode } from "@/lib/customer-code";
import { SETTINGS_KEYS } from "@/lib/settings-keys";
import { Prisma } from "@/generated/prisma/client";

/**
 * Customer intelligence — lifetime value, VIP/segmentation rules, dashboard
 * summary counts, and birthday/anniversary reminders. All rules live here,
 * centrally, so no UI component ever re-implements "what counts as VIP" or
 * "what counts as inactive" itself. See CUSTOMER-SEGMENTS.md.
 *
 * Every number here is computed live from `sales`/`customers` at read time
 * rather than cached, so a return approved after a sale is always reflected
 * correctly and there is nothing to keep in sync — see CUSTOMER-CRM.md "Why
 * spending isn't cached".
 */

export type CustomerLifetimeValue = {
  totalSpending: string;
  purchaseCount: number;
  averagePurchaseValue: string;
  highestPurchase: string;
  firstPurchaseAt: Date | null;
  lastPurchaseAt: Date | null;
};

/** Excludes fully RETURNED sales — a reversed sale has no economic value to the customer relationship. */
export async function getCustomerLifetimeValue(customerId: string): Promise<CustomerLifetimeValue> {
  const sales = await prisma.sale.findMany({
    where: { customerId, status: { not: "RETURNED" } },
    select: { grandTotal: true, saleDate: true },
    orderBy: { saleDate: "asc" },
  });

  if (sales.length === 0) {
    return {
      totalSpending: "0",
      purchaseCount: 0,
      averagePurchaseValue: "0",
      highestPurchase: "0",
      firstPurchaseAt: null,
      lastPurchaseAt: null,
    };
  }

  const totalSpending = sales.reduce((sum, s) => sum.add(s.grandTotal), new Prisma.Decimal(0));
  const highestPurchase = sales.reduce(
    (max, s) => (s.grandTotal.gt(max) ? s.grandTotal : max),
    new Prisma.Decimal(0),
  );
  const averagePurchaseValue = totalSpending.div(sales.length);

  return {
    totalSpending: totalSpending.toString(),
    purchaseCount: sales.length,
    averagePurchaseValue: averagePurchaseValue.toDecimalPlaces(2).toString(),
    highestPurchase: highestPurchase.toString(),
    firstPurchaseAt: sales[0].saleDate,
    lastPurchaseAt: sales[sales.length - 1].saleDate,
  };
}

export type SegmentationConfig = { vipThreshold: Prisma.Decimal; inactivityDays: number };

export async function getSegmentationConfig(): Promise<SegmentationConfig> {
  const rows = await prisma.systemSetting.findMany({
    where: { key: { in: [SETTINGS_KEYS.VIP_SPENDING_THRESHOLD, SETTINGS_KEYS.CUSTOMER_INACTIVITY_DAYS] } },
  });
  const vipRow = rows.find((r) => r.key === SETTINGS_KEYS.VIP_SPENDING_THRESHOLD);
  const inactivityRow = rows.find((r) => r.key === SETTINGS_KEYS.CUSTOMER_INACTIVITY_DAYS);

  let vipThreshold = new Prisma.Decimal(2_000_000);
  if (vipRow) {
    try {
      const parsed = new Prisma.Decimal(vipRow.value);
      if (parsed.isFinite() && parsed.gte(0)) vipThreshold = parsed;
    } catch {
      // keep default
    }
  }

  let inactivityDays = 90;
  if (inactivityRow) {
    const parsed = Number.parseInt(inactivityRow.value, 10);
    if (Number.isFinite(parsed) && parsed > 0) inactivityDays = parsed;
  }

  return { vipThreshold, inactivityDays };
}

export const SEGMENTS = [
  "NEW_CUSTOMER",
  "REGULAR_CUSTOMER",
  "VIP",
  "HIGH_VALUE",
  "INACTIVE",
  "CREDIT_CUSTOMER",
  "RECENT_BUYER",
] as const;
export type Segment = (typeof SEGMENTS)[number];

export const SEGMENT_LABELS: Record<Segment, string> = {
  NEW_CUSTOMER: "New Customer",
  REGULAR_CUSTOMER: "Regular Customer",
  VIP: "VIP",
  HIGH_VALUE: "High Value",
  INACTIVE: "Inactive",
  CREDIT_CUSTOMER: "Credit Customer",
  RECENT_BUYER: "Recent Buyer",
};

const NEW_CUSTOMER_WINDOW_DAYS = 30;
const RECENT_BUYER_WINDOW_DAYS = 30;
/** The "approaching VIP" band — spending at least half the VIP threshold but not there yet. */
const HIGH_VALUE_FRACTION_OF_VIP = 0.5;

export type SegmentableCustomerStats = {
  createdAt: Date;
  lastPurchaseAt: Date | null;
  totalSpending: Prisma.Decimal | string | number;
  outstandingBalance: Prisma.Decimal | string | number;
  purchaseCount: number;
};

/**
 * The single, centralized segmentation rule set — every page that shows a
 * segment (VIP Customers, Inactive Customers, Customer Segments, the
 * profile page's badges) calls this, never re-derives the rule itself. A
 * customer can belong to several segments at once (e.g. VIP + RECENT_BUYER).
 */
export function computeCustomerSegments(
  stats: SegmentableCustomerStats,
  config: SegmentationConfig,
  now: Date = new Date(),
): Segment[] {
  const totalSpending = new Prisma.Decimal(stats.totalSpending);
  const outstandingBalance = new Prisma.Decimal(stats.outstandingBalance);
  const daysSince = (date: Date) => (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24);

  const isNew = daysSince(stats.createdAt) <= NEW_CUSTOMER_WINDOW_DAYS && stats.purchaseCount <= 1;
  const isRecentBuyer = stats.lastPurchaseAt !== null && daysSince(stats.lastPurchaseAt) <= RECENT_BUYER_WINDOW_DAYS;
  const isVip = totalSpending.gte(config.vipThreshold);
  const isHighValue = !isVip && totalSpending.gte(config.vipThreshold.mul(HIGH_VALUE_FRACTION_OF_VIP));
  const isInactive = stats.lastPurchaseAt === null
    ? daysSince(stats.createdAt) > config.inactivityDays
    : daysSince(stats.lastPurchaseAt) > config.inactivityDays;
  const isCreditCustomer = outstandingBalance.gt(0);

  const segments: Segment[] = [];
  if (isNew) segments.push("NEW_CUSTOMER");
  if (isVip) segments.push("VIP");
  if (isHighValue) segments.push("HIGH_VALUE");
  if (isInactive) segments.push("INACTIVE");
  if (isCreditCustomer) segments.push("CREDIT_CUSTOMER");
  if (isRecentBuyer) segments.push("RECENT_BUYER");
  if (!isNew && !isVip && !isHighValue && !isInactive) segments.push("REGULAR_CUSTOMER");

  return segments;
}

export async function getCustomerSegments(customerId: string): Promise<Segment[]> {
  const [customer, ltv, config] = await Promise.all([
    prisma.customer.findUniqueOrThrow({
      where: { id: customerId },
      select: { createdAt: true, outstandingBalance: true },
    }),
    getCustomerLifetimeValue(customerId),
    getSegmentationConfig(),
  ]);

  return computeCustomerSegments(
    {
      createdAt: customer.createdAt,
      lastPurchaseAt: ltv.lastPurchaseAt,
      totalSpending: ltv.totalSpending,
      outstandingBalance: customer.outstandingBalance,
      purchaseCount: ltv.purchaseCount,
    },
    config,
  );
}

export type SegmentCustomerRow = {
  id: string;
  customerCode: string;
  name: string;
  phone: string;
  totalSpending: string;
  outstandingBalance: string;
  purchaseCount: number;
  lastPurchaseAt: Date | null;
  createdAt: Date;
};

type RawCustomerStatsRow = {
  id: string;
  customerCode: number;
  name: string;
  phone: string;
  outstandingBalance: Prisma.Decimal;
  createdAt: Date;
  totalSpending: Prisma.Decimal;
  purchaseCount: bigint;
  lastPurchaseAt: Date | null;
};

function toSegmentRow(row: RawCustomerStatsRow): SegmentCustomerRow {
  return {
    id: row.id,
    customerCode: formatCustomerCode(row.customerCode),
    name: row.name,
    phone: row.phone,
    totalSpending: row.totalSpending.toString(),
    outstandingBalance: row.outstandingBalance.toString(),
    purchaseCount: Number(row.purchaseCount),
    lastPurchaseAt: row.lastPurchaseAt,
    createdAt: row.createdAt,
  };
}

const CUSTOMER_STATS_BASE = Prisma.sql`
  SELECT
    c.id, c."customerCode", c.name, c.phone, c."outstandingBalance", c."createdAt",
    COALESCE(SUM(s."grandTotal"), 0) AS "totalSpending",
    COUNT(s.id) AS "purchaseCount",
    MAX(s."saleDate") AS "lastPurchaseAt"
  FROM customers c
  LEFT JOIN sales s ON s."customerId" = c.id AND s.status != 'RETURNED'
`;

export async function listVipCustomers(limit = 100): Promise<SegmentCustomerRow[]> {
  const { vipThreshold } = await getSegmentationConfig();
  const rows = await prisma.$queryRaw<RawCustomerStatsRow[]>(Prisma.sql`
    ${CUSTOMER_STATS_BASE}
    GROUP BY c.id
    HAVING COALESCE(SUM(s."grandTotal"), 0) >= ${vipThreshold}
    ORDER BY "totalSpending" DESC
    LIMIT ${limit}
  `);
  return rows.map(toSegmentRow);
}

/** No completed purchase in `inactivityDays` — including a customer who has
 * never purchased at all, provided their account is at least that old. */
export async function listInactiveCustomers(limit = 100): Promise<SegmentCustomerRow[]> {
  const { inactivityDays } = await getSegmentationConfig();
  const cutoff = new Date(Date.now() - inactivityDays * 24 * 60 * 60 * 1000);

  const rows = await prisma.$queryRaw<RawCustomerStatsRow[]>(Prisma.sql`
    ${CUSTOMER_STATS_BASE}
    GROUP BY c.id
    HAVING
      (MAX(s."saleDate") IS NOT NULL AND MAX(s."saleDate") < ${cutoff})
      OR (MAX(s."saleDate") IS NULL AND c."createdAt" < ${cutoff})
    ORDER BY "lastPurchaseAt" ASC NULLS FIRST
    LIMIT ${limit}
  `);
  return rows.map(toSegmentRow);
}

export async function listCustomersInSegment(segment: Segment, limit = 200): Promise<SegmentCustomerRow[]> {
  const config = await getSegmentationConfig();
  const rows = await prisma.$queryRaw<RawCustomerStatsRow[]>(Prisma.sql`
    ${CUSTOMER_STATS_BASE}
    GROUP BY c.id
  `);

  const now = new Date();
  const matched = rows.filter((row) =>
    computeCustomerSegments(
      {
        createdAt: row.createdAt,
        lastPurchaseAt: row.lastPurchaseAt,
        totalSpending: row.totalSpending,
        outstandingBalance: row.outstandingBalance,
        purchaseCount: Number(row.purchaseCount),
      },
      config,
      now,
    ).includes(segment),
  );

  return matched.slice(0, limit).map(toSegmentRow);
}

export async function getSegmentCounts(): Promise<Record<Segment, number>> {
  const config = await getSegmentationConfig();
  const rows = await prisma.$queryRaw<RawCustomerStatsRow[]>(Prisma.sql`
    ${CUSTOMER_STATS_BASE}
    GROUP BY c.id
  `);

  const counts: Record<Segment, number> = {
    NEW_CUSTOMER: 0,
    REGULAR_CUSTOMER: 0,
    VIP: 0,
    HIGH_VALUE: 0,
    INACTIVE: 0,
    CREDIT_CUSTOMER: 0,
    RECENT_BUYER: 0,
  };
  const now = new Date();
  for (const row of rows) {
    const segments = computeCustomerSegments(
      {
        createdAt: row.createdAt,
        lastPurchaseAt: row.lastPurchaseAt,
        totalSpending: row.totalSpending,
        outstandingBalance: row.outstandingBalance,
        purchaseCount: Number(row.purchaseCount),
      },
      config,
      now,
    );
    for (const segment of segments) counts[segment] += 1;
  }
  return counts;
}

export type CustomerDashboardSummary = {
  totalCustomers: number;
  newThisMonth: number;
  active: number;
  vip: number;
  inactive: number;
  withOutstandingBalance: number;
};

export async function getCustomerDashboardSummary(): Promise<CustomerDashboardSummary> {
  const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

  const [totalCustomers, newThisMonth, active, withOutstandingBalance, vipRows, inactiveRows] =
    await Promise.all([
      prisma.customer.count(),
      prisma.customer.count({ where: { createdAt: { gte: startOfMonth } } }),
      prisma.customer.count({ where: { status: "ACTIVE" } }),
      prisma.customer.count({ where: { outstandingBalance: { gt: 0 } } }),
      listVipCustomers(10_000),
      listInactiveCustomers(10_000),
    ]);

  return {
    totalCustomers,
    newThisMonth,
    active,
    vip: vipRows.length,
    inactive: inactiveRows.length,
    withOutstandingBalance,
  };
}

export type UpcomingDateEntry = { id: string; name: string; phone: string; date: Date; daysAway: number };

function upcomingFromField(
  customers: { id: string; name: string; phone: string; date: Date | null }[],
  daysAhead: number,
): UpcomingDateEntry[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const results: UpcomingDateEntry[] = [];
  for (const customer of customers) {
    if (!customer.date) continue;
    const month = customer.date.getUTCMonth();
    const day = customer.date.getUTCDate();

    let nextOccurrence = new Date(today.getFullYear(), month, day);
    if (nextOccurrence < today) {
      nextOccurrence = new Date(today.getFullYear() + 1, month, day);
    }
    const daysAway = Math.round((nextOccurrence.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (daysAway <= daysAhead) {
      results.push({ id: customer.id, name: customer.name, phone: customer.phone, date: customer.date, daysAway });
    }
  }
  return results.sort((a, b) => a.daysAway - b.daysAway);
}

export async function getUpcomingBirthdays(daysAhead = 30): Promise<UpcomingDateEntry[]> {
  const customers = await prisma.customer.findMany({
    where: { dateOfBirth: { not: null }, status: { not: "BLOCKED" } },
    select: { id: true, name: true, phone: true, dateOfBirth: true },
  });
  return upcomingFromField(
    customers.map((c) => ({ id: c.id, name: c.name, phone: c.phone, date: c.dateOfBirth })),
    daysAhead,
  );
}

export async function getUpcomingAnniversaries(daysAhead = 30): Promise<UpcomingDateEntry[]> {
  const customers = await prisma.customer.findMany({
    where: { anniversaryDate: { not: null }, status: { not: "BLOCKED" } },
    select: { id: true, name: true, phone: true, anniversaryDate: true },
  });
  return upcomingFromField(
    customers.map((c) => ({ id: c.id, name: c.name, phone: c.phone, date: c.anniversaryDate })),
    daysAhead,
  );
}
