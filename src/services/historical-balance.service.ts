import "server-only";
import Decimal from "decimal.js";
import { prisma } from "@/lib/db/prisma";
import { getSystemSetting } from "@/services/system-setting.service";
import { SETTINGS_KEYS } from "@/lib/settings-keys";
import { Prisma } from "@/generated/prisma/client";
import type { GoldPurity } from "@/generated/prisma/client";

/**
 * "Balance as of a past instant" for the three running-balance ledgers —
 * none of them cache a per-date snapshot, only a live current balance, so a
 * historical figure (Daily Closing's opening/closing lines, the Gold
 * Report's opening/closing gold) is reconstructed via `DISTINCT ON` over
 * each party's/customer's latest entry before the cutoff. Shared by
 * daily-closing.service.ts and financial-reports.service.ts so there is
 * exactly one implementation of this technique. See ACCOUNTING.md
 * "Historical balances".
 */

/** Cash balance immediately before `instant` — the opening base plus every CashTransaction that predates it. */
export async function getCashBalanceAsOf(instant: Date): Promise<Decimal> {
  const [openingSetting, inBefore, outBefore] = await Promise.all([
    getSystemSetting(SETTINGS_KEYS.CASH_OPENING_BALANCE),
    prisma.cashTransaction.aggregate({ where: { direction: "IN", createdAt: { lt: instant } }, _sum: { amount: true } }),
    prisma.cashTransaction.aggregate({ where: { direction: "OUT", createdAt: { lt: instant } }, _sum: { amount: true } }),
  ]);
  return new Decimal(openingSetting || "0")
    .add(new Decimal(inBefore._sum.amount ?? 0))
    .sub(new Decimal(outBefore._sum.amount ?? 0));
}

export async function getHistoricalTotalReceivable(asOf: Date): Promise<Decimal> {
  const rows = await prisma.$queryRaw<{ total: Prisma.Decimal }[]>`
    SELECT COALESCE(SUM(latest."balanceAfter"), 0) AS total
    FROM (
      SELECT DISTINCT ON ("customerId") "customerId", "balanceAfter"
      FROM customer_ledger_entries
      WHERE "createdAt" < ${asOf}
      ORDER BY "customerId", "createdAt" DESC
    ) latest
    WHERE latest."balanceAfter" > 0
  `;
  return new Decimal(rows[0]?.total ?? 0);
}

export async function getHistoricalTotalPartyPayable(asOf: Date, partyType: "SUPPLIER" | "KARIGAR"): Promise<Decimal> {
  const rows = await prisma.$queryRaw<{ total: Prisma.Decimal }[]>`
    SELECT COALESCE(SUM(latest."balanceAfter"), 0) AS total
    FROM (
      SELECT DISTINCT ON ("partyId") "partyId", "balanceAfter"
      FROM party_cash_ledger_entries
      WHERE "createdAt" < ${asOf} AND "partyType" = ${partyType}::"PartyType"
      ORDER BY "partyId", "createdAt" DESC
    ) latest
    WHERE latest."balanceAfter" > 0
  `;
  return new Decimal(rows[0]?.total ?? 0);
}

export async function getHistoricalSystemGoldWeight(purity: GoldPurity, asOf: Date): Promise<Decimal> {
  const rows = await prisma.$queryRaw<{ total: Prisma.Decimal }[]>`
    SELECT COALESCE(SUM(ABS(latest."balanceAfter")), 0) AS total
    FROM (
      SELECT DISTINCT ON ("partyType", "partyId") "partyType", "partyId", "balanceAfter"
      FROM gold_ledger_entries
      WHERE "createdAt" < ${asOf} AND "purity" = ${purity}::"GoldPurity"
      ORDER BY "partyType", "partyId", "createdAt" DESC
    ) latest
  `;
  return new Decimal(rows[0]?.total ?? 0);
}
