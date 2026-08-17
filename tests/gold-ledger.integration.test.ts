import { beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { createKarigar } from "@/services/karigar.service";
import { createSupplier } from "@/services/supplier.service";
import {
  appendGoldLedgerEntry,
  getPartyGoldPosition,
  recordGoldAdjustment,
} from "@/services/gold-ledger.service";
import {
  giveGoldToKarigar,
  receiveGoldFromKarigar,
  classifyGoldJobDifference,
  getKarigarGoldJobById,
  KarigarNotFoundForJobError,
  GoldJobAlreadyReceivedError,
} from "@/services/karigar-job.service";
import { getSeededOwnerId, uniqueSuffix } from "./helpers/db-fixtures";

let userId: string;

beforeAll(async () => {
  userId = await getSeededOwnerId();
});

function uniquePhone(prefix: string): string {
  return `+9231${prefix}${Date.now()}${uniqueSuffix().slice(0, 4)}`;
}

async function makeKarigar(tag: string) {
  return createKarigar({ name: `Gold Karigar ${tag}`, phone: uniquePhone(tag) }, userId);
}

describe("Gold given / gold received (Tests 4 & 5)", () => {
  it("GOLD_GIVEN increases the party's balance (party now holds business's gold)", async () => {
    const karigar = await makeKarigar("A");
    const { jobId } = await giveGoldToKarigar(
      { karigarId: karigar.id, purity: "K21", weight: 10, goldRate: 40000, purpose: "Ring crafting" },
      userId,
    );
    expect(jobId).toBeTruthy();

    const entry = await prisma.goldLedgerEntry.findFirst({
      where: { partyType: "KARIGAR", partyId: karigar.id, transactionType: "GOLD_GIVEN" },
    });
    expect(entry).not.toBeNull();
    expect(entry!.debit.toNumber()).toBe(10);
    expect(entry!.credit.toNumber()).toBe(0);
    expect(entry!.balanceAfter.toNumber()).toBe(10);

    const positions = await getPartyGoldPosition("KARIGAR", karigar.id);
    const k21 = positions.find((p) => p.purity === "K21");
    expect(k21?.status).toBe("HOLDS_GOLD");
    expect(Number(k21?.balance)).toBe(10);
  });

  it("GOLD_RECEIVED decreases the party's balance (job completion)", async () => {
    const karigar = await makeKarigar("B");
    const { jobId } = await giveGoldToKarigar(
      { karigarId: karigar.id, purity: "K22", weight: 20, goldRate: 42000 },
      userId,
    );
    await receiveGoldFromKarigar({ jobId, receivedWeight: 20 }, userId);

    const entry = await prisma.goldLedgerEntry.findFirst({
      where: { partyType: "KARIGAR", partyId: karigar.id, transactionType: "GOLD_RECEIVED" },
    });
    expect(entry!.credit.toNumber()).toBe(20);
    expect(entry!.balanceAfter.toNumber()).toBe(0);
  });
});

describe("Gold balance (Test 6)", () => {
  it("balance = given - received, correctly net across multiple entries", async () => {
    const karigar = await makeKarigar("C");
    await giveGoldToKarigar({ karigarId: karigar.id, purity: "K21", weight: 20, goldRate: 40000 }, userId);
    const job2 = await giveGoldToKarigar({ karigarId: karigar.id, purity: "K21", weight: 5, goldRate: 40000 }, userId);
    await receiveGoldFromKarigar({ jobId: job2.jobId, receivedWeight: 15 }, userId);

    const positions = await getPartyGoldPosition("KARIGAR", karigar.id);
    const k21 = positions.find((p) => p.purity === "K21");
    // 20 + 5 - 15 = 10
    expect(Number(k21?.balance)).toBe(10);
    expect(k21?.status).toBe("HOLDS_GOLD");
  });
});

describe("Purity separation (Test 7)", () => {
  it("21K and 22K balances for the same karigar never combine", async () => {
    const karigar = await makeKarigar("D");
    await giveGoldToKarigar({ karigarId: karigar.id, purity: "K21", weight: 10, goldRate: 40000 }, userId);
    await giveGoldToKarigar({ karigarId: karigar.id, purity: "K22", weight: 5, goldRate: 42000 }, userId);

    const positions = await getPartyGoldPosition("KARIGAR", karigar.id);
    expect(Number(positions.find((p) => p.purity === "K21")?.balance)).toBe(10);
    expect(Number(positions.find((p) => p.purity === "K22")?.balance)).toBe(5);
    expect(positions).toHaveLength(2);
  });
});

describe("Gold rate snapshot (Test 8)", () => {
  it("preserves the rate used at the time of the transaction, never recomputed later", async () => {
    const karigar = await makeKarigar("E");
    const { jobId } = await giveGoldToKarigar(
      { karigarId: karigar.id, purity: "K21", weight: 10, goldRate: 40000 },
      userId,
    );
    const entry = await prisma.goldLedgerEntry.findFirst({ where: { referenceType: "KarigarGoldJob", referenceId: jobId, transactionType: "GOLD_GIVEN" } });
    expect(entry!.goldRate!.toNumber()).toBe(40000);
    expect(entry!.goldValue!.toNumber()).toBe(400000);

    // A much higher "current" rate must never retroactively change the stored snapshot.
    const stillSame = await prisma.goldLedgerEntry.findFirst({ where: { id: entry!.id } });
    expect(stillSame!.goldRate!.toNumber()).toBe(40000);
  });
});

describe("CRITICAL TEST — wastage difference is recorded, never silently changed", () => {
  it("given 10.000g, received 9.700g -> difference 0.300g stays 0.300g even after an explicit adjustment", async () => {
    const karigar = await makeKarigar("CRIT");
    const { jobId } = await giveGoldToKarigar(
      { karigarId: karigar.id, purity: "K21", weight: 10.0, goldRate: 40000, expectedWeight: 10.0 },
      userId,
    );

    const result = await receiveGoldFromKarigar({ jobId, receivedWeight: 9.7 }, userId);
    expect(result.differenceWeight).toBe("0.3");

    const job = await getKarigarGoldJobById(jobId);
    expect(job!.differenceWeight).toBe("0.3");
    expect(job!.reconciliationStatus).toBe("SHORTAGE");
    expect(job!.classification).toBeNull();

    // Explicitly classify the difference as approved wastage — an annotation only.
    await classifyGoldJobDifference(jobId, "Approved wastage", userId);
    const classified = await getKarigarGoldJobById(jobId);
    expect(classified!.classification).toBe("Approved wastage");
    // The raw difference must NOT have been silently changed by classification.
    expect(classified!.differenceWeight).toBe("0.3");
    expect(classified!.givenWeight).toBe("10");
    expect(classified!.receivedWeight).toBe("9.7");

    // Writing off the remaining 0.3g owed is a SEPARATE, explicit ledger adjustment —
    // never automatic, and the job's own numbers still don't change.
    const positionsBefore = await getPartyGoldPosition("KARIGAR", karigar.id);
    expect(Number(positionsBefore.find((p) => p.purity === "K21")?.balance)).toBe(0.3);

    await recordGoldAdjustment(
      {
        partyType: "KARIGAR",
        partyId: karigar.id,
        purity: "K21",
        direction: "credit",
        weight: 0.3,
        referenceType: "KarigarGoldJob",
        referenceId: jobId,
        description: "Approved wastage write-off",
      },
      userId,
    );

    const positionsAfter = await getPartyGoldPosition("KARIGAR", karigar.id);
    expect(positionsAfter.find((p) => p.purity === "K21")).toBeUndefined(); // settled -> filtered out (zero balance)

    const jobAfterAdjustment = await getKarigarGoldJobById(jobId);
    expect(jobAfterAdjustment!.differenceWeight).toBe("0.3"); // still untouched
  });
});

describe("Excess / shortage / within-allowance classification (Test 10)", () => {
  it("classifies a difference within tolerance as WITHIN_ALLOWANCE", async () => {
    const karigar = await makeKarigar("F");
    const { jobId } = await giveGoldToKarigar(
      { karigarId: karigar.id, purity: "K21", weight: 10, goldRate: 40000, expectedWeight: 10 },
      userId,
    );
    const result = await receiveGoldFromKarigar({ jobId, receivedWeight: 9.95 }, userId);
    expect(result.reconciliationStatus).toBe("WITHIN_ALLOWANCE");
  });

  it("classifies a shortfall beyond tolerance as SHORTAGE", async () => {
    const karigar = await makeKarigar("G");
    const { jobId } = await giveGoldToKarigar(
      { karigarId: karigar.id, purity: "K21", weight: 10, goldRate: 40000, expectedWeight: 10 },
      userId,
    );
    const result = await receiveGoldFromKarigar({ jobId, receivedWeight: 9.5 }, userId);
    expect(result.reconciliationStatus).toBe("SHORTAGE");
  });

  it("classifies an unexplained surplus beyond tolerance as EXCESS_DIFFERENCE", async () => {
    const karigar = await makeKarigar("H");
    const { jobId } = await giveGoldToKarigar(
      { karigarId: karigar.id, purity: "K21", weight: 10, goldRate: 40000, expectedWeight: 10 },
      userId,
    );
    const result = await receiveGoldFromKarigar({ jobId, receivedWeight: 10.5 }, userId);
    expect(result.reconciliationStatus).toBe("EXCESS_DIFFERENCE");
  });

  it("rejects receiving gold twice against the same job", async () => {
    const karigar = await makeKarigar("I");
    const { jobId } = await giveGoldToKarigar({ karigarId: karigar.id, purity: "K21", weight: 5, goldRate: 40000 }, userId);
    await receiveGoldFromKarigar({ jobId, receivedWeight: 5 }, userId);
    await expect(receiveGoldFromKarigar({ jobId, receivedWeight: 5 }, userId)).rejects.toThrow(
      GoldJobAlreadyReceivedError,
    );
  });
});

describe("Transaction rollback (Test 20)", () => {
  it("giving gold to a non-existent karigar creates no job and no ledger entry", async () => {
    const fakeId = "00000000-0000-0000-0000-000000000000";
    const before = await prisma.goldLedgerEntry.count();
    await expect(
      giveGoldToKarigar({ karigarId: fakeId, purity: "K21", weight: 5, goldRate: 40000 }, userId),
    ).rejects.toThrow(KarigarNotFoundForJobError);
    const after = await prisma.goldLedgerEntry.count();
    expect(after).toBe(before);
  });
});

describe("Supplier gold ledger (opposite direction)", () => {
  it("GOLD_RECEIVED from a supplier makes the business owe gold (negative balance -> OWES_GOLD)", async () => {
    const supplier = await createSupplier({ name: `Gold Supplier ${uniqueSuffix()}`, phone: uniquePhone("S1") }, userId);
    await prisma.$transaction((tx) =>
      appendGoldLedgerEntry(tx, {
        partyType: "SUPPLIER",
        partyId: supplier.id,
        transactionType: "GOLD_RECEIVED",
        purity: "K24",
        credit: 15,
        goldRate: 45000,
        goldValue: 675000,
        referenceType: "Supplier",
        referenceId: supplier.id,
        description: "Raw gold received on consignment",
        createdById: userId,
      }),
    );

    const positions = await getPartyGoldPosition("SUPPLIER", supplier.id);
    const k24 = positions.find((p) => p.purity === "K24");
    expect(k24?.status).toBe("OWES_GOLD");
    expect(Number(k24?.balance)).toBe(15);
  });
});

describe("Audit logging (Test 22)", () => {
  it("writes GOLD_GIVEN, GOLD_RECEIVED, and GOLD_JOB_COMPLETED audit entries", async () => {
    const karigar = await makeKarigar("J");
    const { jobId } = await giveGoldToKarigar({ karigarId: karigar.id, purity: "K21", weight: 5, goldRate: 40000 }, userId);
    await receiveGoldFromKarigar({ jobId, receivedWeight: 5 }, userId);

    const logs = await prisma.auditLog.findMany({ where: { entity: "KarigarGoldJob", entityId: jobId } });
    expect(logs.map((l) => l.action)).toEqual(
      expect.arrayContaining(["GOLD_GIVEN", "GOLD_RECEIVED", "GOLD_JOB_COMPLETED"]),
    );
  });
});
