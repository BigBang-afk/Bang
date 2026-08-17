import "server-only";
import { prisma } from "@/lib/db/prisma";
import { writeAuditLog } from "@/services/audit.service";
import { appendPartyCashLedgerEntry } from "@/services/party-cash-ledger.service";
import { recordCashTransactionInTx } from "@/services/cash-transaction.service";
import { Prisma } from "@/generated/prisma/client";
import type { PaymentMethod } from "@/generated/prisma/client";

/**
 * A standalone payment against a supplier's running payable balance — the
 * supplier equivalent of customer-payment.service.ts's "Receive Customer
 * Payment", just flowing the other direction (the business pays the
 * supplier down, rather than receiving payment from a customer). Distinct
 * from a payment entered at purchase time (purchase.service.ts), which is
 * part of the purchase transaction itself. See SUPPLIER-SYSTEM.md.
 */

export class InvalidSupplierPaymentAmountError extends Error {
  constructor(message = "Payment amount must be greater than zero.") {
    super(message);
    this.name = "InvalidSupplierPaymentAmountError";
  }
}

export type RecordSupplierPaymentInput = {
  supplierId: string;
  amount: number;
  method: PaymentMethod;
  reference?: string;
  notes?: string;
};

export async function recordSupplierPayment(
  input: RecordSupplierPaymentInput,
  userId: string,
): Promise<{ balanceAfter: string }> {
  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    throw new InvalidSupplierPaymentAmountError();
  }

  const supplier = await prisma.supplier.findUniqueOrThrow({ where: { id: input.supplierId }, select: { id: true } });

  const result = await prisma.$transaction(async (tx) => {
    const ledger = await appendPartyCashLedgerEntry(tx, {
      partyType: "SUPPLIER",
      partyId: supplier.id,
      transactionType: "PAYMENT",
      credit: input.amount,
      referenceType: "Supplier",
      referenceId: supplier.id,
      description: input.notes || `Payment to supplier (${input.method})`,
      createdById: userId,
    });

    await recordCashTransactionInTx(tx, {
      transactionType: "SUPPLIER_PAYMENT",
      direction: "OUT",
      amount: input.amount,
      paymentMethod: input.method,
      referenceType: "Supplier",
      referenceId: supplier.id,
      description: input.notes,
      createdById: userId,
    });

    return ledger;
  });

  await writeAuditLog({
    userId,
    action: "SUPPLIER_PAYMENT_RECORDED",
    entity: "Supplier",
    entityId: supplier.id,
    metadata: {
      amount: input.amount,
      method: input.method,
      balanceAfter: result.balanceAfter.toString(),
    },
  });

  return { balanceAfter: result.balanceAfter.toString() };
}

export type SupplierPaymentRow = {
  id: string;
  amount: Prisma.Decimal;
  method: PaymentMethod;
  reference: string | null;
  notes: string | null;
  createdAt: Date;
  createdBy: { id: string; name: string };
};

/** Purchase-time payments (PurchasePayment) plus standalone payments both settle a supplier's balance — the Payments tab shows purchase-time payments; standalone ones are visible on the party cash ledger tab as PAYMENT entries. */
export async function listPurchasePaymentsForSupplier(
  supplierId: string,
  filter: { page?: number; pageSize?: number } = {},
): Promise<{ rows: SupplierPaymentRow[]; total: number }> {
  const page = Math.max(1, filter.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, filter.pageSize ?? 20));
  const where = { purchase: { supplierId } };

  const [rows, total] = await Promise.all([
    prisma.purchasePayment.findMany({
      where,
      select: {
        id: true,
        amount: true,
        method: true,
        reference: true,
        notes: true,
        createdAt: true,
        createdBy: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.purchasePayment.count({ where }),
  ]);

  return { rows, total };
}
