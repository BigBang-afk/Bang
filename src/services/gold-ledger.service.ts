import "server-only";
import type Decimal from "decimal.js";
import { prisma } from "@/lib/db/prisma";
import { writeAuditLog } from "@/services/audit.service";
import { formatKarigarCode } from "@/lib/karigar-code";
import { formatSupplierCode } from "@/lib/supplier-code";
import { Prisma } from "@/generated/prisma/client";
import type { GoldLedgerTransactionType, GoldPurity, PartyType } from "@/generated/prisma/client";

type PrismaTx = Prisma.TransactionClient;

/**
 * The gold ledger — append-only, the single source of truth for
 * PartyGoldBalance (per party, per purity). See GOLD-LEDGER.md.
 *
 * Convention (documented in full in GOLD-LEDGER.md): `debit` moves gold
 * TOWARD the party — GOLD_GIVEN (business hands raw gold to a karigar for
 * job work) and GOLD_RETURNED (business returns previously-received
 * consignment gold to a supplier) both increase the party's balance, i.e.
 * the party now holds more of the business's gold. `credit` moves gold
 * BACK toward the business — GOLD_RECEIVED (a karigar returns finished
 * pieces, or a supplier supplies raw gold to the business) decreases it.
 * balanceAfter > 0 means the party HOLDS gold that belongs to the
 * business (a gold receivable for the business); balanceAfter < 0 means
 * the business HOLDS gold that belongs to the party and owes it back (a
 * gold payable). 21K and 22K gold are never combined — balances are always
 * scoped to one (party, purity) pair.
 */

export type GoldLedgerEntryInput = {
  partyType: PartyType;
  partyId: string;
  transactionType: GoldLedgerTransactionType;
  purity: GoldPurity;
  /** Exactly one of debit/credit should be non-zero for GOLD_GIVEN, GOLD_RETURNED, or GOLD_RECEIVED — the direction is fixed by transactionType. For GOLD_ADJUSTMENT the caller chooses which side to set. */
  debit?: string | number | Decimal;
  credit?: string | number | Decimal;
  goldRate?: string | number | Decimal;
  goldValue?: string | number | Decimal;
  referenceType: string;
  referenceId: string;
  description?: string;
  createdById: string;
};

const DIRECTIONAL_TYPES = new Set<GoldLedgerTransactionType>(["GOLD_GIVEN", "GOLD_RETURNED", "GOLD_RECEIVED"]);

export class InvalidGoldLedgerDirectionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidGoldLedgerDirectionError";
  }
}

/**
 * Atomically updates the (partyType, partyId, purity) running gold balance
 * via one INSERT ... ON CONFLICT ... RETURNING statement — Postgres's row
 * lock on the unique (partyType, partyId, purity) index serializes
 * concurrent writers to the same party+purity without any application-level
 * locking, exactly the pattern adjustCustomerOutstandingBalanceInTx()
 * established in Phase 4.
 */
async function adjustPartyGoldBalanceInTx(
  tx: PrismaTx,
  partyType: PartyType,
  partyId: string,
  purity: GoldPurity,
  delta: string | number | Decimal,
): Promise<Prisma.Decimal> {
  const rows = await tx.$queryRaw<{ balance: Prisma.Decimal }[]>`
    INSERT INTO party_gold_balances ("id", "partyType", "partyId", "purity", "balance", "updatedAt")
    VALUES (gen_random_uuid(), ${partyType}::"PartyType", ${partyId}::uuid, ${purity}::"GoldPurity", ${String(delta)}::numeric, now())
    ON CONFLICT ("partyType", "partyId", "purity")
    DO UPDATE SET "balance" = party_gold_balances."balance" + ${String(delta)}::numeric, "updatedAt" = now()
    RETURNING "balance"
  `;
  return rows[0].balance;
}

/** The single write path for GoldLedgerEntry + PartyGoldBalance. Never write to either table any other way. */
export async function appendGoldLedgerEntry(
  tx: PrismaTx,
  input: GoldLedgerEntryInput,
): Promise<{ id: string; balanceAfter: Prisma.Decimal }> {
  let debit = input.debit;
  let credit = input.credit;

  if (DIRECTIONAL_TYPES.has(input.transactionType)) {
    const magnitude = debit ?? credit;
    if (magnitude === undefined) {
      throw new InvalidGoldLedgerDirectionError(`${input.transactionType} requires a weight.`);
    }
    if (input.transactionType === "GOLD_RECEIVED") {
      credit = magnitude;
      debit = 0;
    } else {
      debit = magnitude;
      credit = 0;
    }
  } else if (debit === undefined && credit === undefined) {
    throw new InvalidGoldLedgerDirectionError(
      `${input.transactionType} requires an explicit debit or credit weight.`,
    );
  }

  const debitAmount = debit ?? 0;
  const creditAmount = credit ?? 0;
  const delta = new Prisma.Decimal(debitAmount).sub(new Prisma.Decimal(creditAmount));

  const balanceAfter = await adjustPartyGoldBalanceInTx(tx, input.partyType, input.partyId, input.purity, delta);

  const entry = await tx.goldLedgerEntry.create({
    data: {
      partyType: input.partyType,
      partyId: input.partyId,
      transactionType: input.transactionType,
      purity: input.purity,
      debit: String(debitAmount),
      credit: String(creditAmount),
      balanceAfter,
      goldRate: input.goldRate !== undefined ? String(input.goldRate) : null,
      goldValue: input.goldValue !== undefined ? String(input.goldValue) : null,
      referenceType: input.referenceType,
      referenceId: input.referenceId,
      description: input.description,
      createdById: input.createdById,
    },
  });

  return { id: entry.id, balanceAfter };
}

/** Moves gold from one party to another as two linked entries in one transaction. */
export async function transferGoldBetweenParties(
  tx: PrismaTx,
  input: {
    fromPartyType: PartyType;
    fromPartyId: string;
    toPartyType: PartyType;
    toPartyId: string;
    purity: GoldPurity;
    weight: string | number | Decimal;
    referenceType: string;
    referenceId: string;
    description?: string;
    createdById: string;
  },
): Promise<{ fromEntryId: string; toEntryId: string }> {
  const from = await appendGoldLedgerEntry(tx, {
    partyType: input.fromPartyType,
    partyId: input.fromPartyId,
    transactionType: "GOLD_TRANSFER",
    purity: input.purity,
    credit: input.weight,
    referenceType: input.referenceType,
    referenceId: input.referenceId,
    description: input.description ?? "Gold transfer (out)",
    createdById: input.createdById,
  });
  const to = await appendGoldLedgerEntry(tx, {
    partyType: input.toPartyType,
    partyId: input.toPartyId,
    transactionType: "GOLD_TRANSFER",
    purity: input.purity,
    debit: input.weight,
    referenceType: input.referenceType,
    referenceId: input.referenceId,
    description: input.description ?? "Gold transfer (in)",
    createdById: input.createdById,
  });
  return { fromEntryId: from.id, toEntryId: to.id };
}

export type RecordGoldAdjustmentInput = {
  partyType: PartyType;
  partyId: string;
  purity: GoldPurity;
  /** "debit" increases the party's balance (business gives up its claim / accepts the party holds more — e.g. writing off approved wastage the karigar isn't required to return). "credit" decreases it (e.g. correcting an overstatement). */
  direction: "debit" | "credit";
  weight: string | number | Decimal;
  referenceType: string;
  referenceId: string;
  description: string;
};

/**
 * A manual, explicit gold correction — never automatic. Used to record
 * approved wastage write-offs, reconciliation corrections, or any other
 * deliberate adjustment a human has decided on. Always keeps a reason in
 * `description`. See GOLD-LEDGER.md "Adjustments" and RECONCILIATION.md.
 */
export async function recordGoldAdjustment(input: RecordGoldAdjustmentInput, userId: string): Promise<{ id: string; balanceAfter: string }> {
  const result = await prisma.$transaction(async (tx) => {
    return appendGoldLedgerEntry(tx, {
      partyType: input.partyType,
      partyId: input.partyId,
      transactionType: "GOLD_ADJUSTMENT",
      purity: input.purity,
      debit: input.direction === "debit" ? input.weight : undefined,
      credit: input.direction === "credit" ? input.weight : undefined,
      referenceType: input.referenceType,
      referenceId: input.referenceId,
      description: input.description,
      createdById: userId,
    });
  });

  await writeAuditLog({
    userId,
    action: "GOLD_ADJUSTED",
    entity: "GoldLedgerEntry",
    entityId: result.id,
    metadata: {
      partyType: input.partyType,
      partyId: input.partyId,
      purity: input.purity,
      direction: input.direction,
      weight: String(input.weight),
      description: input.description,
    },
  });

  return { id: result.id, balanceAfter: result.balanceAfter.toString() };
}

export type GoldLedgerEntryRow = {
  id: string;
  transactionType: GoldLedgerTransactionType;
  purity: GoldPurity;
  debit: Prisma.Decimal;
  credit: Prisma.Decimal;
  balanceAfter: Prisma.Decimal;
  goldRate: Prisma.Decimal | null;
  goldValue: Prisma.Decimal | null;
  referenceType: string;
  referenceId: string;
  description: string | null;
  createdAt: Date;
  createdBy: { id: string; name: string };
};

const GOLD_LEDGER_ROW_SELECT = {
  id: true,
  transactionType: true,
  purity: true,
  debit: true,
  credit: true,
  balanceAfter: true,
  goldRate: true,
  goldValue: true,
  referenceType: true,
  referenceId: true,
  description: true,
  createdAt: true,
  createdBy: { select: { id: true, name: true } },
} satisfies Prisma.GoldLedgerEntrySelect;

export async function listGoldLedgerEntriesForParty(
  partyType: PartyType,
  partyId: string,
  filter: { purity?: GoldPurity; page?: number; pageSize?: number } = {},
): Promise<{ rows: GoldLedgerEntryRow[]; total: number }> {
  const page = Math.max(1, filter.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, filter.pageSize ?? 20));
  const where: Prisma.GoldLedgerEntryWhereInput = {
    partyType,
    partyId,
    ...(filter.purity ? { purity: filter.purity } : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.goldLedgerEntry.findMany({
      where,
      select: GOLD_LEDGER_ROW_SELECT,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.goldLedgerEntry.count({ where }),
  ]);

  return { rows, total };
}

export type CompanyGoldLedgerFilters = {
  partyType?: PartyType;
  purity?: GoldPurity;
  transactionType?: GoldLedgerTransactionType;
  dateFrom?: Date;
  dateTo?: Date;
  page?: number;
  pageSize?: number;
};

export type CompanyGoldLedgerRow = GoldLedgerEntryRow & {
  partyType: PartyType;
  partyId: string;
  partyName: string;
};

/** The company-wide Gold Transactions page — every entry, across every karigar and supplier. */
export async function listAllGoldLedgerEntries(
  filters: CompanyGoldLedgerFilters,
): Promise<{ rows: CompanyGoldLedgerRow[]; total: number }> {
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, filters.pageSize ?? 20));

  const where: Prisma.GoldLedgerEntryWhereInput = {
    ...(filters.partyType ? { partyType: filters.partyType } : {}),
    ...(filters.purity ? { purity: filters.purity } : {}),
    ...(filters.transactionType ? { transactionType: filters.transactionType } : {}),
    ...(filters.dateFrom || filters.dateTo
      ? { createdAt: { gte: filters.dateFrom, lte: filters.dateTo } }
      : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.goldLedgerEntry.findMany({
      where,
      select: { ...GOLD_LEDGER_ROW_SELECT, partyType: true, partyId: true },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.goldLedgerEntry.count({ where }),
  ]);

  const partyNames = await resolvePartyNames(rows.map((r) => ({ partyType: r.partyType, partyId: r.partyId })));

  return {
    rows: rows.map((row) => ({
      ...row,
      partyName: partyNames.get(`${row.partyType}:${row.partyId}`) ?? "Unknown",
    })),
    total,
  };
}

async function resolvePartyNames(
  parties: { partyType: PartyType; partyId: string }[],
): Promise<Map<string, string>> {
  const karigarIds = [...new Set(parties.filter((p) => p.partyType === "KARIGAR").map((p) => p.partyId))];
  const supplierIds = [...new Set(parties.filter((p) => p.partyType === "SUPPLIER").map((p) => p.partyId))];

  const [karigars, suppliers] = await Promise.all([
    karigarIds.length > 0
      ? prisma.karigar.findMany({ where: { id: { in: karigarIds } }, select: { id: true, name: true } })
      : [],
    supplierIds.length > 0
      ? prisma.supplier.findMany({ where: { id: { in: supplierIds } }, select: { id: true, name: true } })
      : [],
  ]);

  const map = new Map<string, string>();
  for (const k of karigars) map.set(`KARIGAR:${k.id}`, k.name);
  for (const s of suppliers) map.set(`SUPPLIER:${s.id}`, s.name);
  return map;
}

export type PartyGoldPosition = {
  purity: GoldPurity;
  balance: string;
  /** "HOLDS_GOLD" = the party currently holds this much of the business's gold (a gold receivable for the business). "OWES_GOLD" = the business holds this much of the party's gold (a gold payable). "SETTLED" = zero. */
  status: "HOLDS_GOLD" | "OWES_GOLD" | "SETTLED";
};

/** The full per-purity gold position for one party — never a single combined number across purities. */
export async function getPartyGoldPosition(partyType: PartyType, partyId: string): Promise<PartyGoldPosition[]> {
  const rows = await prisma.partyGoldBalance.findMany({
    where: { partyType, partyId },
    select: { purity: true, balance: true },
    orderBy: { purity: "asc" },
  });

  return rows
    .filter((row) => !row.balance.isZero())
    .map((row) => ({
      purity: row.purity,
      balance: row.balance.abs().toString(),
      status: row.balance.gt(0) ? "HOLDS_GOLD" : "OWES_GOLD",
    }));
}

export type GoldPartySummaryRow = {
  partyType: PartyType;
  partyId: string;
  partyCode: string;
  name: string;
  phone: string;
  positions: PartyGoldPosition[];
};

/** Every karigar currently holding (or owed) any non-zero gold balance — "Gold With Karigars". */
export async function listGoldWithKarigars(): Promise<GoldPartySummaryRow[]> {
  return listGoldWithPartyType("KARIGAR");
}

/** Every supplier currently holding (or owed) any non-zero gold balance — "Gold With Suppliers". */
export async function listGoldWithSuppliers(): Promise<GoldPartySummaryRow[]> {
  return listGoldWithPartyType("SUPPLIER");
}

async function listGoldWithPartyType(partyType: PartyType): Promise<GoldPartySummaryRow[]> {
  const balances = await prisma.partyGoldBalance.findMany({
    where: { partyType, balance: { not: 0 } },
    select: { partyId: true, purity: true, balance: true },
  });
  if (balances.length === 0) return [];

  const partyIds = [...new Set(balances.map((b) => b.partyId))];
  const byParty = new Map<string, PartyGoldPosition[]>();
  for (const b of balances) {
    const list = byParty.get(b.partyId) ?? [];
    list.push({
      purity: b.purity,
      balance: b.balance.abs().toString(),
      status: b.balance.gt(0) ? "HOLDS_GOLD" : "OWES_GOLD",
    });
    byParty.set(b.partyId, list);
  }

  if (partyType === "KARIGAR") {
    const karigars = await prisma.karigar.findMany({
      where: { id: { in: partyIds } },
      select: { id: true, karigarCode: true, name: true, phone: true },
    });
    return karigars.map((k) => ({
      partyType: "KARIGAR" as const,
      partyId: k.id,
      partyCode: formatKarigarCode(k.karigarCode),
      name: k.name,
      phone: k.phone,
      positions: byParty.get(k.id) ?? [],
    }));
  }

  const suppliers = await prisma.supplier.findMany({
    where: { id: { in: partyIds } },
    select: { id: true, supplierCode: true, name: true, phone: true },
  });
  return suppliers.map((s) => ({
    partyType: "SUPPLIER" as const,
    partyId: s.id,
    partyCode: formatSupplierCode(s.supplierCode),
    name: s.name,
    phone: s.phone,
    positions: byParty.get(s.id) ?? [],
  }));
}

/**
 * Total grams currently in a "non-final custody" state for one purity —
 * the sum of the absolute value of every party's balance, across both
 * karigars and suppliers. This is the "System Gold" figure Gold
 * Reconciliation compares against a physical count. See RECONCILIATION.md
 * for why this is scoped to party-tracked gold only (Phase 5 does not
 * model a separate raw/loose shop-gold ledger).
 */
export async function getSystemGoldWeightForPurity(purity: GoldPurity): Promise<Prisma.Decimal> {
  const result = await prisma.$queryRaw<{ total: Prisma.Decimal | null }[]>(Prisma.sql`
    SELECT SUM(ABS("balance")) AS total FROM party_gold_balances WHERE purity = ${purity}::"GoldPurity"
  `);
  return result[0]?.total ?? new Prisma.Decimal(0);
}
