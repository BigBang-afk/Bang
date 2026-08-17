import "server-only";
import type Decimal from "decimal.js";
import { prisma } from "@/lib/db/prisma";
import { writeAuditLog } from "@/services/audit.service";
import { formatKarigarCode } from "@/lib/karigar-code";
import { formatSupplierCode } from "@/lib/supplier-code";
import { Prisma } from "@/generated/prisma/client";
import type { PartyCashTransactionType, PartyType } from "@/generated/prisma/client";

type PrismaTx = Prisma.TransactionClient;

/**
 * The karigar/supplier cash ledger — append-only, the single source of
 * truth for PartyCashBalance. See CASH-MANAGEMENT.md.
 *
 * This is the inverse relationship of CustomerLedgerEntry: it tracks what
 * the BUSINESS owes the party (payable), not what the party owes the
 * business. Convention: `debit` increases what the business owes
 * (PURCHASE — a supplier bill; CASH_RECEIVED — cash received from the
 * party, paying down a receivable the business was owed and moving the
 * balance back toward payable). `credit` decreases what the business owes
 * (CASH_PAID / PAYMENT — the business pays the party down).
 * balanceAfter > 0 means the business owes the party (payable);
 * balanceAfter < 0 means the party owes the business (receivable). The UI
 * never shows this raw signed number — only the derived Payable/Receivable
 * pair (getPartyCashPosition below).
 */

export type PartyCashLedgerEntryInput = {
  partyType: PartyType;
  partyId: string;
  transactionType: PartyCashTransactionType;
  /** Required for PURCHASE/CASH_RECEIVED (debit-direction) or CASH_PAID/PAYMENT (credit-direction) — the direction is fixed by transactionType. For CASH_ADJUSTMENT the caller sets debit or credit explicitly. */
  debit?: string | number | Decimal;
  credit?: string | number | Decimal;
  referenceType: string;
  referenceId: string;
  description?: string;
  createdById: string;
};

const DEBIT_DIRECTION_TYPES = new Set<PartyCashTransactionType>(["PURCHASE", "CASH_RECEIVED"]);
const CREDIT_DIRECTION_TYPES = new Set<PartyCashTransactionType>(["CASH_PAID", "PAYMENT"]);

export class InvalidPartyCashDirectionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidPartyCashDirectionError";
  }
}

async function adjustPartyCashBalanceInTx(
  tx: PrismaTx,
  partyType: PartyType,
  partyId: string,
  delta: string | number | Decimal,
): Promise<Prisma.Decimal> {
  const rows = await tx.$queryRaw<{ balance: Prisma.Decimal }[]>`
    INSERT INTO party_cash_balances ("id", "partyType", "partyId", "balance", "updatedAt")
    VALUES (gen_random_uuid(), ${partyType}::"PartyType", ${partyId}::uuid, ${String(delta)}::numeric, now())
    ON CONFLICT ("partyType", "partyId")
    DO UPDATE SET "balance" = party_cash_balances."balance" + ${String(delta)}::numeric, "updatedAt" = now()
    RETURNING "balance"
  `;
  return rows[0].balance;
}

/** The single write path for PartyCashLedgerEntry + PartyCashBalance. Never write to either table any other way. */
export async function appendPartyCashLedgerEntry(
  tx: PrismaTx,
  input: PartyCashLedgerEntryInput,
): Promise<{ id: string; balanceAfter: Prisma.Decimal }> {
  let debit = input.debit;
  let credit = input.credit;

  if (DEBIT_DIRECTION_TYPES.has(input.transactionType) || CREDIT_DIRECTION_TYPES.has(input.transactionType)) {
    const magnitude = debit ?? credit;
    if (magnitude === undefined) {
      throw new InvalidPartyCashDirectionError(`${input.transactionType} requires an amount.`);
    }
    if (DEBIT_DIRECTION_TYPES.has(input.transactionType)) {
      debit = magnitude;
      credit = 0;
    } else {
      credit = magnitude;
      debit = 0;
    }
  } else if (debit === undefined && credit === undefined) {
    throw new InvalidPartyCashDirectionError(`${input.transactionType} requires an explicit debit or credit amount.`);
  }

  const debitAmount = debit ?? 0;
  const creditAmount = credit ?? 0;
  const delta = new Prisma.Decimal(debitAmount).sub(new Prisma.Decimal(creditAmount));

  const balanceAfter = await adjustPartyCashBalanceInTx(tx, input.partyType, input.partyId, delta);

  const entry = await tx.partyCashLedgerEntry.create({
    data: {
      partyType: input.partyType,
      partyId: input.partyId,
      transactionType: input.transactionType,
      debit: String(debitAmount),
      credit: String(creditAmount),
      balanceAfter,
      referenceType: input.referenceType,
      referenceId: input.referenceId,
      description: input.description,
      createdById: input.createdById,
    },
  });

  return { id: entry.id, balanceAfter };
}

export type PartyCashLedgerEntryRow = {
  id: string;
  transactionType: PartyCashTransactionType;
  debit: Prisma.Decimal;
  credit: Prisma.Decimal;
  balanceAfter: Prisma.Decimal;
  referenceType: string;
  referenceId: string;
  description: string | null;
  createdAt: Date;
  createdBy: { id: string; name: string };
};

const PARTY_CASH_ROW_SELECT = {
  id: true,
  transactionType: true,
  debit: true,
  credit: true,
  balanceAfter: true,
  referenceType: true,
  referenceId: true,
  description: true,
  createdAt: true,
  createdBy: { select: { id: true, name: true } },
} satisfies Prisma.PartyCashLedgerEntrySelect;

export async function listPartyCashLedgerEntries(
  partyType: PartyType,
  partyId: string,
  filter: { page?: number; pageSize?: number } = {},
): Promise<{ rows: PartyCashLedgerEntryRow[]; total: number }> {
  const page = Math.max(1, filter.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, filter.pageSize ?? 20));
  const where: Prisma.PartyCashLedgerEntryWhereInput = { partyType, partyId };

  const [rows, total] = await Promise.all([
    prisma.partyCashLedgerEntry.findMany({
      where,
      select: PARTY_CASH_ROW_SELECT,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.partyCashLedgerEntry.count({ where }),
  ]);

  return { rows, total };
}

export type CompanyPartyCashLedgerRow = PartyCashLedgerEntryRow & {
  partyType: PartyType;
  partyId: string;
  partyName: string;
};

/** The company-wide party cash ledger — every entry, across every karigar and supplier. */
export async function listAllPartyCashLedgerEntries(
  filters: { partyType?: PartyType; transactionType?: PartyCashTransactionType; page?: number; pageSize?: number },
): Promise<{ rows: CompanyPartyCashLedgerRow[]; total: number }> {
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, filters.pageSize ?? 20));

  const where: Prisma.PartyCashLedgerEntryWhereInput = {
    ...(filters.partyType ? { partyType: filters.partyType } : {}),
    ...(filters.transactionType ? { transactionType: filters.transactionType } : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.partyCashLedgerEntry.findMany({
      where,
      select: { ...PARTY_CASH_ROW_SELECT, partyType: true, partyId: true },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.partyCashLedgerEntry.count({ where }),
  ]);

  const karigarIds = [...new Set(rows.filter((r) => r.partyType === "KARIGAR").map((r) => r.partyId))];
  const supplierIds = [...new Set(rows.filter((r) => r.partyType === "SUPPLIER").map((r) => r.partyId))];
  const [karigars, suppliers] = await Promise.all([
    karigarIds.length > 0
      ? prisma.karigar.findMany({ where: { id: { in: karigarIds } }, select: { id: true, name: true } })
      : [],
    supplierIds.length > 0
      ? prisma.supplier.findMany({ where: { id: { in: supplierIds } }, select: { id: true, name: true } })
      : [],
  ]);
  const nameMap = new Map<string, string>();
  for (const k of karigars) nameMap.set(`KARIGAR:${k.id}`, k.name);
  for (const s of suppliers) nameMap.set(`SUPPLIER:${s.id}`, s.name);

  return {
    rows: rows.map((row) => ({ ...row, partyName: nameMap.get(`${row.partyType}:${row.partyId}`) ?? "Unknown" })),
    total,
  };
}

export type PartyCashPosition = {
  /** Amount the business owes this party. */
  payable: string;
  /** Amount this party owes the business. */
  receivable: string;
};

/** Never a single ambiguous signed balance — always the derived Payable/Receivable pair. See CASH-MANAGEMENT.md. */
export async function getPartyCashPosition(partyType: PartyType, partyId: string): Promise<PartyCashPosition> {
  const row = await prisma.partyCashBalance.findUnique({ where: { partyType_partyId: { partyType, partyId } } });
  const balance = row?.balance ?? new Prisma.Decimal(0);
  return {
    payable: balance.gt(0) ? balance.toString() : "0",
    receivable: balance.lt(0) ? balance.abs().toString() : "0",
  };
}

export type PartyCashSummaryRow = {
  partyType: PartyType;
  partyId: string;
  partyCode: string;
  name: string;
  phone: string;
  payable: string;
  receivable: string;
};

async function listCashPositionsForPartyType(partyType: PartyType): Promise<PartyCashSummaryRow[]> {
  const balances = await prisma.partyCashBalance.findMany({
    where: { partyType, balance: { not: 0 } },
    select: { partyId: true, balance: true },
  });
  if (balances.length === 0) return [];

  const partyIds = balances.map((b) => b.partyId);
  const byParty = new Map(balances.map((b) => [b.partyId, b.balance]));

  if (partyType === "KARIGAR") {
    const karigars = await prisma.karigar.findMany({
      where: { id: { in: partyIds } },
      select: { id: true, karigarCode: true, name: true, phone: true },
    });
    return karigars.map((k) => {
      const balance = byParty.get(k.id) ?? new Prisma.Decimal(0);
      return {
        partyType: "KARIGAR" as const,
        partyId: k.id,
        partyCode: formatKarigarCode(k.karigarCode),
        name: k.name,
        phone: k.phone,
        payable: balance.gt(0) ? balance.toString() : "0",
        receivable: balance.lt(0) ? balance.abs().toString() : "0",
      };
    });
  }

  const suppliers = await prisma.supplier.findMany({
    where: { id: { in: partyIds } },
    select: { id: true, supplierCode: true, name: true, phone: true },
  });
  return suppliers.map((s) => {
    const balance = byParty.get(s.id) ?? new Prisma.Decimal(0);
    return {
      partyType: "SUPPLIER" as const,
      partyId: s.id,
      partyCode: formatSupplierCode(s.supplierCode),
      name: s.name,
      phone: s.phone,
      payable: balance.gt(0) ? balance.toString() : "0",
      receivable: balance.lt(0) ? balance.abs().toString() : "0",
    };
  });
}

/** Every karigar with a non-zero cash position — "Cash With Karigar" / Cash Payable / Cash Receivable pages. */
export async function listKarigarCashPositions(): Promise<PartyCashSummaryRow[]> {
  return listCashPositionsForPartyType("KARIGAR");
}

/** Every supplier with a non-zero cash position — Supplier Payables report. */
export async function listSupplierCashPositions(): Promise<PartyCashSummaryRow[]> {
  return listCashPositionsForPartyType("SUPPLIER");
}

/** Every party (karigar + supplier) with a non-zero payable — Cash Management → Cash Payable. */
export async function listAllCashPayables(): Promise<PartyCashSummaryRow[]> {
  const [karigars, suppliers] = await Promise.all([listKarigarCashPositions(), listSupplierCashPositions()]);
  return [...karigars, ...suppliers].filter((row) => Number(row.payable) > 0);
}

/** Every party (karigar + supplier) with a non-zero receivable — Cash Management → Cash Receivable. */
export async function listAllCashReceivables(): Promise<PartyCashSummaryRow[]> {
  const [karigars, suppliers] = await Promise.all([listKarigarCashPositions(), listSupplierCashPositions()]);
  return [...karigars, ...suppliers].filter((row) => Number(row.receivable) > 0);
}

export type RecordPartyCashAdjustmentInput = {
  partyType: PartyType;
  partyId: string;
  /** "debit" increases what the business owes the party. "credit" decreases it. */
  direction: "debit" | "credit";
  amount: string | number | Decimal;
  referenceType: string;
  referenceId: string;
  description: string;
};

/** A manual, explicit cash correction — never automatic. Always keeps a reason in `description`. See CASH-MANAGEMENT.md "Adjustments". */
export async function recordPartyCashAdjustment(
  input: RecordPartyCashAdjustmentInput,
  userId: string,
): Promise<{ id: string; balanceAfter: string }> {
  const result = await prisma.$transaction(async (tx) => {
    return appendPartyCashLedgerEntry(tx, {
      partyType: input.partyType,
      partyId: input.partyId,
      transactionType: "CASH_ADJUSTMENT",
      debit: input.direction === "debit" ? input.amount : undefined,
      credit: input.direction === "credit" ? input.amount : undefined,
      referenceType: input.referenceType,
      referenceId: input.referenceId,
      description: input.description,
      createdById: userId,
    });
  });

  await writeAuditLog({
    userId,
    action: "CASH_ADJUSTED",
    entity: "PartyCashLedgerEntry",
    entityId: result.id,
    metadata: {
      partyType: input.partyType,
      partyId: input.partyId,
      direction: input.direction,
      amount: String(input.amount),
      description: input.description,
    },
  });

  return { id: result.id, balanceAfter: result.balanceAfter.toString() };
}
