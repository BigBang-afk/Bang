import "server-only";
import { prisma } from "@/lib/db/prisma";
import { writeAuditLog } from "@/services/audit.service";
import { appendPartyCashLedgerEntry } from "@/services/party-cash-ledger.service";
import { recordCashTransactionInTx } from "@/services/cash-transaction.service";
import type { PaymentMethod } from "@/generated/prisma/client";

/**
 * "Cash Paid to Karigar" / "Cash Received from Karigar" — a standalone cash
 * movement against a karigar's running cash position (e.g. paying a making
 * charge, or a karigar refunding an advance), distinct from a purchase.
 * Posts to both the party cash ledger (what the business owes this
 * karigar) and the company cash book, in one transaction. See
 * CASH-MANAGEMENT.md and KARIGAR-SYSTEM.md.
 */

export type RecordKarigarCashTransactionInput = {
  karigarId: string;
  /** CASH_PAID: business pays the karigar (reduces payable). CASH_RECEIVED: business receives cash from the karigar (pays down a receivable). */
  transactionType: "CASH_PAID" | "CASH_RECEIVED";
  amount: number;
  paymentMethod: PaymentMethod;
  description?: string;
};

export async function recordKarigarCashTransaction(
  input: RecordKarigarCashTransactionInput,
  userId: string,
): Promise<{ balanceAfter: string }> {
  const karigar = await prisma.karigar.findUniqueOrThrow({ where: { id: input.karigarId }, select: { id: true } });

  const isCashPaid = input.transactionType === "CASH_PAID";

  const result = await prisma.$transaction(async (tx) => {
    const ledger = await appendPartyCashLedgerEntry(tx, {
      partyType: "KARIGAR",
      partyId: karigar.id,
      transactionType: input.transactionType,
      credit: isCashPaid ? input.amount : undefined,
      debit: isCashPaid ? undefined : input.amount,
      referenceType: "Karigar",
      referenceId: karigar.id,
      description: input.description ?? (isCashPaid ? "Cash paid to karigar" : "Cash received from karigar"),
      createdById: userId,
    });

    await recordCashTransactionInTx(tx, {
      transactionType: isCashPaid ? "KARIGAR_PAYMENT" : "KARIGAR_RECEIPT",
      direction: isCashPaid ? "OUT" : "IN",
      amount: input.amount,
      paymentMethod: input.paymentMethod,
      referenceType: "Karigar",
      referenceId: karigar.id,
      description: input.description,
      createdById: userId,
    });

    return ledger;
  });

  await writeAuditLog({
    userId,
    action: isCashPaid ? "KARIGAR_CASH_PAID" : "KARIGAR_CASH_RECEIVED",
    entity: "Karigar",
    entityId: karigar.id,
    metadata: { amount: input.amount, paymentMethod: input.paymentMethod, balanceAfter: result.balanceAfter.toString() },
  });

  return { balanceAfter: result.balanceAfter.toString() };
}
