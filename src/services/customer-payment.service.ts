import "server-only";
import { prisma } from "@/lib/db/prisma";
import { writeAuditLog } from "@/services/audit.service";
import { appendCustomerLedgerEntry } from "@/services/customer-ledger.service";
import { SETTINGS_KEYS } from "@/lib/settings-keys";
import { Prisma } from "@/generated/prisma/client";
import type { PaymentMethod } from "@/generated/prisma/client";

/**
 * "Receive Customer Payment" — a standalone payment against a customer's
 * accumulated outstanding balance, distinct from a Payment line taken at
 * checkout (see SALES.md). See CUSTOMER-LEDGER.md "Payment transaction".
 */

export class InvalidPaymentAmountError extends Error {
  constructor(message = "Payment amount must be greater than zero.") {
    super(message);
    this.name = "InvalidPaymentAmountError";
  }
}

export class CreditNotAValidPaymentMethodError extends Error {
  constructor() {
    super("CREDIT is not a valid method for receiving a customer payment.");
    this.name = "CreditNotAValidPaymentMethodError";
  }
}

export class OverpaymentNotAllowedError extends Error {
  constructor(outstandingBalance: string) {
    super(
      `Payment exceeds the customer's outstanding balance of ${outstandingBalance}. Enable the overpayment setting to allow this.`,
    );
    this.name = "OverpaymentNotAllowedError";
  }
}

export class CustomerNotFoundForPaymentError extends Error {
  constructor() {
    super("Selected customer could not be found.");
    this.name = "CustomerNotFoundForPaymentError";
  }
}

export type RecordCustomerPaymentInput = {
  customerId: string;
  amount: number;
  method: PaymentMethod;
  reference?: string;
  notes?: string;
};

export type RecordedCustomerPayment = { id: string; balanceAfter: string };

export async function recordCustomerPayment(
  input: RecordCustomerPaymentInput,
  userId: string,
): Promise<RecordedCustomerPayment> {
  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    throw new InvalidPaymentAmountError();
  }
  if (input.method === "CREDIT") {
    throw new CreditNotAValidPaymentMethodError();
  }

  const customer = await prisma.customer.findUnique({
    where: { id: input.customerId },
    select: { outstandingBalance: true },
  });
  if (!customer) throw new CustomerNotFoundForPaymentError();

  const overpaymentSetting = await prisma.systemSetting.findUnique({
    where: { key: SETTINGS_KEYS.CUSTOMER_OVERPAYMENT_ALLOWED },
  });
  const overpaymentAllowed = overpaymentSetting?.value === "true";

  if (!overpaymentAllowed && new Prisma.Decimal(input.amount).gt(customer.outstandingBalance)) {
    throw new OverpaymentNotAllowedError(customer.outstandingBalance.toString());
  }

  const result = await prisma.$transaction(async (tx) => {
    const payment = await tx.customerPayment.create({
      data: {
        customerId: input.customerId,
        amount: input.amount,
        method: input.method,
        reference: input.reference || null,
        notes: input.notes || null,
        createdById: userId,
      },
    });

    const { balanceAfter } = await appendCustomerLedgerEntry(tx, {
      customerId: input.customerId,
      transactionType: "PAYMENT",
      referenceType: "CustomerPayment",
      referenceId: payment.id,
      credit: input.amount,
      description: `Payment received (${input.method})`,
      createdById: userId,
    });

    return { id: payment.id, balanceAfter };
  });

  await writeAuditLog({
    userId,
    action: "CUSTOMER_PAYMENT_RECEIVED",
    entity: "CustomerPayment",
    entityId: result.id,
    metadata: {
      customerId: input.customerId,
      amount: input.amount,
      method: input.method,
      balanceAfter: result.balanceAfter.toString(),
    },
  });

  return { id: result.id, balanceAfter: result.balanceAfter.toString() };
}

export type CustomerPaymentRow = {
  id: string;
  amount: Prisma.Decimal;
  method: PaymentMethod;
  reference: string | null;
  notes: string | null;
  createdAt: Date;
  createdBy: { id: string; name: string };
};

export async function listCustomerPayments(
  customerId: string,
  filter: { page?: number; pageSize?: number } = {},
): Promise<{ rows: CustomerPaymentRow[]; total: number }> {
  const page = Math.max(1, filter.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, filter.pageSize ?? 20));

  const [rows, total] = await Promise.all([
    prisma.customerPayment.findMany({
      where: { customerId },
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
    prisma.customerPayment.count({ where: { customerId } }),
  ]);

  return { rows, total };
}
