import "server-only";
import { prisma } from "@/lib/db/prisma";
import { listGoldWithKarigars } from "@/services/gold-ledger.service";
import { listKarigarCashPositions } from "@/services/party-cash-ledger.service";

/**
 * Karigar Analytics — see ANALYTICS.md "Karigar analytics". Metrics are
 * strictly operational (jobs completed, gold reconciliation differences,
 * completion time) — never a subjective quality ranking. See
 * KARIGAR-SYSTEM.md "Wastage reconciliation" for what
 * `reconciliationStatus` actually means.
 */

export type KarigarAnalyticsSummary = {
  activeKarigars: number;
  jobsCompleted: number;
  jobsPending: number;
  goldGiven: string;
  goldReceived: string;
  /** goldGiven − goldReceived across every job that has been received — a positive figure is more likely wastage/shortage, never itself an accusation. */
  goldDifference: string;
  cashPayableTotal: string;
  cashReceivableTotal: string;
};

export async function getKarigarAnalyticsSummary(): Promise<KarigarAnalyticsSummary> {
  const [activeKarigars, jobStats, cashPositions] = await Promise.all([
    prisma.karigar.count({ where: { status: "ACTIVE" } }),
    prisma.karigarGoldJob.aggregate({
      where: { receivedAt: { not: null } },
      _sum: { givenWeight: true, receivedWeight: true, differenceWeight: true },
      _count: true,
    }),
    listKarigarCashPositions(),
  ]);

  const jobsPending = await prisma.karigarGoldJob.count({ where: { receivedAt: null } });

  let cashPayableTotal = 0;
  let cashReceivableTotal = 0;
  for (const position of cashPositions) {
    cashPayableTotal += Number(position.payable);
    cashReceivableTotal += Number(position.receivable);
  }

  return {
    activeKarigars,
    jobsCompleted: jobStats._count,
    jobsPending,
    goldGiven: (jobStats._sum.givenWeight ?? 0).toString(),
    goldReceived: (jobStats._sum.receivedWeight ?? 0).toString(),
    goldDifference: (jobStats._sum.differenceWeight ?? 0).toString(),
    cashPayableTotal: cashPayableTotal.toString(),
    cashReceivableTotal: cashReceivableTotal.toString(),
  };
}

export type KarigarPerformanceRow = {
  karigarId: string;
  karigarCode: string;
  name: string;
  jobsCompleted: number;
  /** Average hours from "gold given" to "gold received" across this karigar's completed jobs — an operational duration, not a productivity score. */
  averageCompletionHours: number | null;
  withinAllowanceCount: number;
  excessDifferenceCount: number;
  shortageCount: number;
};

/** Operational facts only — job counts, timing, and reconciliation outcomes. Never a "best/worst karigar" quality score, per ANALYTICS.md's explicit instruction not to rank on unsupported quality assumptions. */
export async function getKarigarPerformance(): Promise<KarigarPerformanceRow[]> {
  const karigars = await prisma.karigar.findMany({
    where: { status: "ACTIVE" },
    select: {
      id: true,
      karigarCode: true,
      name: true,
      goldJobs: {
        where: { receivedAt: { not: null } },
        select: { createdAt: true, receivedAt: true, reconciliationStatus: true },
      },
    },
  });

  const { formatKarigarCode } = await import("@/lib/karigar-code");

  return karigars.map((karigar) => {
    const jobs = karigar.goldJobs;
    const completionHours = jobs
      .filter((j) => j.receivedAt)
      .map((j) => (j.receivedAt!.getTime() - j.createdAt.getTime()) / (1000 * 60 * 60));
    const averageCompletionHours = completionHours.length > 0 ? completionHours.reduce((a, b) => a + b, 0) / completionHours.length : null;

    return {
      karigarId: karigar.id,
      karigarCode: formatKarigarCode(karigar.karigarCode),
      name: karigar.name,
      jobsCompleted: jobs.length,
      averageCompletionHours: averageCompletionHours !== null ? Math.round(averageCompletionHours * 10) / 10 : null,
      withinAllowanceCount: jobs.filter((j) => j.reconciliationStatus === "WITHIN_ALLOWANCE").length,
      excessDifferenceCount: jobs.filter((j) => j.reconciliationStatus === "EXCESS_DIFFERENCE").length,
      shortageCount: jobs.filter((j) => j.reconciliationStatus === "SHORTAGE").length,
    };
  });
}

export { listGoldWithKarigars };
