import "server-only";
import { prisma } from "@/lib/db/prisma";
import { writeAuditLog } from "@/services/audit.service";
import type { SetGoldRatesInput } from "@/lib/validation/gold-rate";
import { GOLD_PURITIES, type GoldPurity } from "@/types/gold";
import type { Prisma } from "@/generated/prisma/client";
import { toBusinessDate, getTodayBusinessDate } from "@/lib/business-date";

export { toBusinessDate, getTodayBusinessDate };

export type EffectiveRateRow = {
  id: string;
  purity: GoldPurity;
  ratePerGram: Prisma.Decimal;
  createdAt: Date;
  createdBy: { id: string; name: string };
};

/**
 * Returns the effective (most recently created) rate per purity for a given
 * business date. Historical rows are never updated, so "effective" means
 * "latest createdAt" within that date — this lets an owner correct a
 * same-day mistake by inserting a newer row instead of mutating history.
 */
export async function getEffectiveRatesForDate(businessDate: Date): Promise<EffectiveRateRow[]> {
  const rows = await prisma.goldRate.findMany({
    where: { businessDate },
    orderBy: [{ purity: "asc" }, { createdAt: "desc" }],
    distinct: ["purity"],
    select: {
      id: true,
      purity: true,
      ratePerGram: true,
      createdAt: true,
      createdBy: { select: { id: true, name: true } },
    },
  });
  return rows as EffectiveRateRow[];
}

export async function todaysRatesExist(): Promise<boolean> {
  const rows = await getEffectiveRatesForDate(getTodayBusinessDate());
  return rows.length > 0;
}

export async function createTodaysGoldRates(
  input: SetGoldRatesInput,
  createdById: string,
): Promise<void> {
  const businessDate = getTodayBusinessDate();

  const entries: { purity: GoldPurity; ratePerGram: number }[] = [
    { purity: "K24", ratePerGram: input.k24 },
    { purity: "K22", ratePerGram: input.k22 },
    { purity: "K21", ratePerGram: input.k21 },
    { purity: "K18", ratePerGram: input.k18 },
  ];
  if (input.silver !== undefined) {
    entries.push({ purity: "SILVER", ratePerGram: input.silver });
  }

  await prisma.$transaction(
    entries.map((entry) =>
      prisma.goldRate.create({
        data: {
          businessDate,
          purity: entry.purity,
          ratePerGram: entry.ratePerGram,
          createdById,
        },
      }),
    ),
  );

  await writeAuditLog({
    userId: createdById,
    action: "GOLD_RATE_CREATED",
    entity: "GoldRate",
    metadata: {
      businessDate: businessDate.toISOString().slice(0, 10),
      rates: Object.fromEntries(entries.map((e) => [e.purity, e.ratePerGram])),
    },
  });
}

export type GoldRateHistoryDay = {
  businessDate: Date;
  rates: Partial<Record<GoldPurity, string>>;
  updatedBy: { id: string; name: string } | null;
  updatedAt: Date | null;
};

export async function getGoldRateHistory(filter: {
  from?: Date;
  to?: Date;
}): Promise<GoldRateHistoryDay[]> {
  const rows = await prisma.goldRate.findMany({
    where: {
      businessDate: {
        gte: filter.from,
        lte: filter.to,
      },
    },
    orderBy: [{ businessDate: "asc" }, { purity: "asc" }, { createdAt: "desc" }],
    distinct: ["businessDate", "purity"],
    select: {
      businessDate: true,
      purity: true,
      ratePerGram: true,
      createdAt: true,
      createdBy: { select: { id: true, name: true } },
    },
  });

  const byDate = new Map<string, GoldRateHistoryDay>();

  for (const row of rows) {
    const key = row.businessDate.toISOString();
    let day = byDate.get(key);
    if (!day) {
      day = { businessDate: row.businessDate, rates: {}, updatedBy: null, updatedAt: null };
      byDate.set(key, day);
    }
    day.rates[row.purity as GoldPurity] = row.ratePerGram.toString();
    if (!day.updatedAt || row.createdAt > day.updatedAt) {
      day.updatedAt = row.createdAt;
      day.updatedBy = row.createdBy;
    }
  }

  return Array.from(byDate.values()).sort(
    (a, b) => b.businessDate.getTime() - a.businessDate.getTime(),
  );
}

export { GOLD_PURITIES };
