import "server-only";
import crypto from "node:crypto";
import Decimal from "decimal.js";
import { prisma } from "@/lib/db/prisma";
import { writeAuditLog } from "@/services/audit.service";
import { getSystemSetting } from "@/services/system-setting.service";
import { appendGoldLedgerEntry } from "@/services/gold-ledger.service";
import { SETTINGS_KEYS } from "@/lib/settings-keys";
import type { GoldPurity, JobReconciliationStatus, KarigarGoldJob } from "@/generated/prisma/client";

/**
 * Karigar job-work — the "give raw gold, receive finished goods back" cycle
 * and its wastage reconciliation. See KARIGAR-SYSTEM.md "Wastage
 * reconciliation".
 *
 * The gold ledger only ever records what ACTUALLY moved (the given weight,
 * the received weight); a KarigarGoldJob row is the layer above it that
 * additionally tracks what was EXPECTED, so the difference is always
 * visible and never silently absorbed into either number.
 */

export class KarigarNotFoundForJobError extends Error {
  constructor() {
    super("Karigar could not be found.");
    this.name = "KarigarNotFoundForJobError";
  }
}

export class KarigarBlockedError extends Error {
  constructor() {
    super("This karigar is blocked and cannot be given gold.");
    this.name = "KarigarBlockedError";
  }
}

export class GoldJobNotFoundError extends Error {
  constructor() {
    super("Gold job could not be found.");
    this.name = "GoldJobNotFoundError";
  }
}

export class GoldJobAlreadyReceivedError extends Error {
  constructor() {
    super("This gold job has already been reconciled — gold was already received against it.");
    this.name = "GoldJobAlreadyReceivedError";
  }
}

export class InvalidGoldWeightError extends Error {
  constructor(message = "Weight must be greater than zero.") {
    super(message);
    this.name = "InvalidGoldWeightError";
  }
}

export type GiveGoldToKarigarInput = {
  karigarId: string;
  purity: GoldPurity;
  weight: number;
  goldRate: number;
  purpose?: string;
  jobReference?: string;
  /** The weight agreed to be returned (given weight minus agreed wastage), if known up front. Editable later at receive time. */
  expectedWeight?: number;
  notes?: string;
};

export async function giveGoldToKarigar(
  input: GiveGoldToKarigarInput,
  userId: string,
): Promise<{ jobId: string }> {
  if (!(input.weight > 0)) throw new InvalidGoldWeightError();
  const karigar = await prisma.karigar.findUnique({ where: { id: input.karigarId }, select: { status: true } });
  if (!karigar) throw new KarigarNotFoundForJobError();
  if (karigar.status === "BLOCKED") throw new KarigarBlockedError();

  const goldValue = new Decimal(input.weight).mul(input.goldRate);
  const jobId = crypto.randomUUID();

  await prisma.$transaction(async (tx) => {
    await tx.karigarGoldJob.create({
      data: {
        id: jobId,
        karigarId: input.karigarId,
        purity: input.purity,
        purpose: input.purpose || null,
        jobReference: input.jobReference || null,
        givenWeight: input.weight.toString(),
        givenGoldRate: input.goldRate.toString(),
        expectedWeight: input.expectedWeight !== undefined ? input.expectedWeight.toString() : null,
        notes: input.notes || null,
        createdById: userId,
      },
    });

    const ledger = await appendGoldLedgerEntry(tx, {
      partyType: "KARIGAR",
      partyId: input.karigarId,
      transactionType: "GOLD_GIVEN",
      purity: input.purity,
      debit: input.weight,
      goldRate: input.goldRate,
      goldValue: goldValue.toString(),
      referenceType: "KarigarGoldJob",
      referenceId: jobId,
      description: input.purpose ? `Gold given for ${input.purpose}` : "Gold given for job work",
      createdById: userId,
    });

    await tx.karigarGoldJob.update({ where: { id: jobId }, data: { givenLedgerEntryId: ledger.id } });
  });

  await writeAuditLog({
    userId,
    action: "GOLD_GIVEN",
    entity: "KarigarGoldJob",
    entityId: jobId,
    metadata: { karigarId: input.karigarId, purity: input.purity, weight: input.weight, goldRate: input.goldRate },
  });

  return { jobId };
}

const DEFAULT_TOLERANCE_GRAMS = "0.100";

function classifyDifference(
  differenceWeight: Decimal,
  toleranceGrams: Decimal,
): JobReconciliationStatus {
  if (differenceWeight.abs().lte(toleranceGrams)) return "WITHIN_ALLOWANCE";
  // difference = expected - received. Positive beyond tolerance means the
  // karigar returned LESS than expected (a shortage); negative beyond
  // tolerance means MORE came back than expected (an unexplained excess).
  return differenceWeight.gt(0) ? "SHORTAGE" : "EXCESS_DIFFERENCE";
}

export type ReceiveGoldFromKarigarInput = {
  jobId: string;
  receivedWeight: number;
  /** Overrides the job's stored expectedWeight, if the agreed return weight is only known now. Falls back to the job's own expectedWeight, then to the full given weight. */
  expectedWeight?: number;
  notes?: string;
};

export type ReceiveGoldFromKarigarResult = {
  differenceWeight: string;
  toleranceGrams: string;
  reconciliationStatus: JobReconciliationStatus;
};

/**
 * Records gold actually received back from a karigar. `expectedWeight`,
 * `receivedWeight`, and the resulting `differenceWeight` are ALL stored
 * explicitly and are never silently reconciled into a single "wastage"
 * figure — see the spec's critical test (10.000g given, 9.700g received,
 * difference 0.300g must remain visible as-is). Classifying that
 * difference (e.g. "approved wastage") is a separate, explicit step —
 * classifyGoldJobDifference() — never automatic here.
 */
export async function receiveGoldFromKarigar(
  input: ReceiveGoldFromKarigarInput,
  userId: string,
): Promise<ReceiveGoldFromKarigarResult> {
  if (!(input.receivedWeight >= 0)) throw new InvalidGoldWeightError("Received weight cannot be negative.");
  const job = await prisma.karigarGoldJob.findUnique({ where: { id: input.jobId } });
  if (!job) throw new GoldJobNotFoundError();
  if (job.receivedWeight !== null) throw new GoldJobAlreadyReceivedError();

  const expectedWeight = new Decimal(
    input.expectedWeight ?? job.expectedWeight?.toString() ?? job.givenWeight.toString(),
  );
  const receivedWeight = new Decimal(input.receivedWeight);
  const differenceWeight = expectedWeight.sub(receivedWeight);

  const toleranceSetting = await getSystemSetting(SETTINGS_KEYS.KARIGAR_WASTAGE_TOLERANCE_GRAMS);
  const toleranceGrams = new Decimal(toleranceSetting || DEFAULT_TOLERANCE_GRAMS);
  const reconciliationStatus = classifyDifference(differenceWeight, toleranceGrams);

  const goldValue = receivedWeight.mul(job.givenGoldRate);

  await prisma.$transaction(async (tx) => {
    const ledger = await appendGoldLedgerEntry(tx, {
      partyType: "KARIGAR",
      partyId: job.karigarId,
      transactionType: "GOLD_RECEIVED",
      purity: job.purity,
      credit: receivedWeight,
      goldRate: job.givenGoldRate,
      goldValue: goldValue.toString(),
      referenceType: "KarigarGoldJob",
      referenceId: job.id,
      description: "Gold received (job completion)",
      createdById: userId,
    });

    await tx.karigarGoldJob.update({
      where: { id: job.id },
      data: {
        expectedWeight: expectedWeight.toString(),
        receivedWeight: receivedWeight.toString(),
        receivedLedgerEntryId: ledger.id,
        differenceWeight: differenceWeight.toString(),
        toleranceGrams: toleranceGrams.toString(),
        reconciliationStatus,
        notes: input.notes ?? job.notes,
        receivedAt: new Date(),
      },
    });
  });

  await writeAuditLog({
    userId,
    action: "GOLD_RECEIVED",
    entity: "KarigarGoldJob",
    entityId: job.id,
    metadata: {
      karigarId: job.karigarId,
      expectedWeight: expectedWeight.toString(),
      receivedWeight: receivedWeight.toString(),
      differenceWeight: differenceWeight.toString(),
      reconciliationStatus,
    },
  });
  await writeAuditLog({
    userId,
    action: "GOLD_JOB_COMPLETED",
    entity: "KarigarGoldJob",
    entityId: job.id,
    metadata: { reconciliationStatus },
  });

  return {
    differenceWeight: differenceWeight.toString(),
    toleranceGrams: toleranceGrams.toString(),
    reconciliationStatus,
  };
}

/**
 * Explicitly classifies an already-recorded difference (e.g. "approved
 * wastage", "shortage — investigate") — an annotation only, never
 * mutates givenWeight/receivedWeight/differenceWeight. To actually settle
 * the karigar's remaining gold balance (e.g. writing off approved wastage
 * so it no longer shows as owed), call gold-ledger.service.ts's
 * recordGoldAdjustment() separately and explicitly — this function alone
 * never touches the ledger.
 */
export async function classifyGoldJobDifference(
  jobId: string,
  classification: string,
  userId: string,
): Promise<void> {
  const job = await prisma.karigarGoldJob.findUnique({ where: { id: jobId }, select: { id: true } });
  if (!job) throw new GoldJobNotFoundError();

  await prisma.karigarGoldJob.update({ where: { id: jobId }, data: { classification } });

  await writeAuditLog({
    userId,
    action: "GOLD_JOB_COMPLETED",
    entity: "KarigarGoldJob",
    entityId: jobId,
    metadata: { classification },
  });
}

export type KarigarGoldJobRow = {
  id: string;
  karigarId: string;
  purity: GoldPurity;
  purpose: string | null;
  jobReference: string | null;
  givenWeight: string;
  givenGoldRate: string;
  expectedWeight: string | null;
  receivedWeight: string | null;
  differenceWeight: string | null;
  toleranceGrams: string | null;
  reconciliationStatus: JobReconciliationStatus | null;
  classification: string | null;
  notes: string | null;
  createdAt: Date;
  receivedAt: Date | null;
};

function toJobRow(job: KarigarGoldJob): KarigarGoldJobRow {
  return {
    id: job.id,
    karigarId: job.karigarId,
    purity: job.purity,
    purpose: job.purpose,
    jobReference: job.jobReference,
    givenWeight: job.givenWeight.toString(),
    givenGoldRate: job.givenGoldRate.toString(),
    expectedWeight: job.expectedWeight?.toString() ?? null,
    receivedWeight: job.receivedWeight?.toString() ?? null,
    differenceWeight: job.differenceWeight?.toString() ?? null,
    toleranceGrams: job.toleranceGrams?.toString() ?? null,
    reconciliationStatus: job.reconciliationStatus,
    classification: job.classification,
    notes: job.notes,
    createdAt: job.createdAt,
    receivedAt: job.receivedAt,
  };
}

export async function listKarigarGoldJobs(
  karigarId: string,
  filter: { page?: number; pageSize?: number } = {},
): Promise<{ rows: KarigarGoldJobRow[]; total: number }> {
  const page = Math.max(1, filter.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, filter.pageSize ?? 20));

  const [rows, total] = await Promise.all([
    prisma.karigarGoldJob.findMany({
      where: { karigarId },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.karigarGoldJob.count({ where: { karigarId } }),
  ]);

  return { rows: rows.map(toJobRow), total };
}

export async function getKarigarGoldJobById(jobId: string): Promise<KarigarGoldJobRow | null> {
  const job = await prisma.karigarGoldJob.findUnique({ where: { id: jobId } });
  return job ? toJobRow(job) : null;
}

/** Open jobs — gold given but not yet received back. */
export async function listPendingKarigarGoldJobs(karigarId?: string): Promise<KarigarGoldJobRow[]> {
  const jobs = await prisma.karigarGoldJob.findMany({
    where: { receivedWeight: null, ...(karigarId ? { karigarId } : {}) },
    orderBy: { createdAt: "desc" },
  });
  return jobs.map(toJobRow);
}
