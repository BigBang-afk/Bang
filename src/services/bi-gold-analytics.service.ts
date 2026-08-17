import "server-only";
import Decimal from "decimal.js";
import { prisma } from "@/lib/db/prisma";
import type { GoldPurity } from "@/generated/prisma/client";
import { getGoldReport, type GoldReportRow } from "@/services/financial-reports.service";
import { listGoldWithKarigars, listGoldWithSuppliers, getSystemGoldWeightForPurity } from "@/services/gold-ledger.service";
import { getEffectiveRatesForDate, getGoldRateHistory, getTodayBusinessDate } from "@/services/gold-rate.service";
import type { ReportDatePreset } from "@/lib/report-date-range";

/**
 * Gold Intelligence — see ANALYTICS.md "Gold analytics". Every figure is
 * purity-separated and never summed across purities (21K gold and 22K
 * gold are never added together into one meaningless "grams of gold"
 * total) — see GOLD-LEDGER.md. Rates always come from GoldRate, never an
 * AI-invented number.
 */

/** By-purity purchased/sold/received/given/returned/closing — a direct pass-through of financial-reports.service.ts's getGoldReport(), the exact same per-purity figures the Gold Report page already shows. */
export async function getGoldByPurity(preset: ReportDatePreset, custom?: { from: Date; to: Date }): Promise<GoldReportRow[]> {
  const report = await getGoldReport(preset, custom);
  return report.rows;
}

export type GoldRateAnalytics = {
  current: { purity: GoldPurity; ratePerGram: string }[];
  previous: { purity: GoldPurity; ratePerGram: string }[];
  changeByPurity: { purity: GoldPurity; change: string; changePercent: string | null }[];
  history: { businessDate: string; rates: Partial<Record<GoldPurity, string>> }[];
};

/** Current vs. most-recent-prior rate, plus history for the requested window — every number read directly from the GoldRate table, never generated. */
export async function getGoldRateAnalytics(historyDays: 7 | 30 | 90 = 30): Promise<GoldRateAnalytics> {
  const today = getTodayBusinessDate();
  const current = await getEffectiveRatesForDate(today);

  const previousDayRow = await prisma.goldRate.findFirst({
    where: { businessDate: { lt: today } },
    orderBy: { businessDate: "desc" },
    select: { businessDate: true },
  });
  const previous = previousDayRow ? await getEffectiveRatesForDate(previousDayRow.businessDate) : [];

  const previousByPurity = new Map(previous.map((r) => [r.purity, r.ratePerGram]));
  const changeByPurity = current.map((r) => {
    const prev = previousByPurity.get(r.purity);
    if (!prev) return { purity: r.purity, change: "0", changePercent: null };
    const change = new Decimal(r.ratePerGram).sub(prev);
    const changePercent = prev.isZero() ? null : change.div(prev).mul(100).toDecimalPlaces(2).toString();
    return { purity: r.purity, change: change.toString(), changePercent };
  });

  const from = new Date(today.getTime() - historyDays * 24 * 60 * 60 * 1000);
  const historyRows = await getGoldRateHistory({ from, to: today });

  return {
    current: current.map((r) => ({ purity: r.purity, ratePerGram: r.ratePerGram.toString() })),
    previous: previous.map((r) => ({ purity: r.purity, ratePerGram: r.ratePerGram.toString() })),
    changeByPurity,
    history: historyRows.map((h) => ({ businessDate: h.businessDate.toISOString().slice(0, 10), rates: h.rates })),
  };
}

export type GoldExposureRow = {
  purity: GoldPurity;
  physicalInStock: string;
  withKarigars: string;
  withSuppliers: string;
};

/** Physical shop stock (from InventoryItem net weight, IN_STOCK/RESERVED only) plus gold currently held by karigars/suppliers — always reported per-purity, never a single blended "total gold" figure. Pure Gold Equivalent is intentionally NOT computed here — see BUSINESS-INTELLIGENCE.md "Gold exposure" for why. */
export async function getGoldExposure(): Promise<GoldExposureRow[]> {
  const purities: GoldPurity[] = ["K24", "K22", "K21", "K18", "SILVER"];

  const [physicalRows, karigars, suppliers] = await Promise.all([
    prisma.inventoryItem.groupBy({
      by: ["purity"],
      where: { archivedAt: null, status: { in: ["IN_STOCK", "RESERVED"] } },
      _sum: { netWeight: true },
    }),
    listGoldWithKarigars(),
    listGoldWithSuppliers(),
  ]);

  const physicalByPurity = new Map(physicalRows.map((r) => [r.purity, r._sum.netWeight ?? new Decimal(0)]));
  const sumHolds = (parties: Awaited<ReturnType<typeof listGoldWithKarigars>>, purity: GoldPurity) =>
    parties.reduce((sum, party) => {
      const position = party.positions.find((p) => p.purity === purity && p.status === "HOLDS_GOLD");
      return position ? sum.add(position.balance) : sum;
    }, new Decimal(0));

  return purities.map((purity) => ({
    purity,
    physicalInStock: (physicalByPurity.get(purity) ?? new Decimal(0)).toString(),
    withKarigars: sumHolds(karigars, purity).toString(),
    withSuppliers: sumHolds(suppliers, purity).toString(),
  }));
}

export { getSystemGoldWeightForPurity };
