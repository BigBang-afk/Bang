import "server-only";
import { prisma } from "@/lib/db/prisma";
import { writeAuditLog } from "@/services/audit.service";

/**
 * Structured, multi-entry note history — see CUSTOMER-CRM.md "Customer
 * notes". An edit creates a new version of the row (updatedAt changes) but
 * never removes what was written; there is deliberately no delete here.
 */

export class CustomerNoteNotFoundError extends Error {
  constructor() {
    super("Note could not be found.");
    this.name = "CustomerNoteNotFoundError";
  }
}

export type CustomerNoteRow = {
  id: string;
  note: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: { id: string; name: string };
};

export async function listCustomerNotes(customerId: string): Promise<CustomerNoteRow[]> {
  return prisma.customerNote.findMany({
    where: { customerId },
    select: {
      id: true,
      note: true,
      createdAt: true,
      updatedAt: true,
      createdBy: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function addCustomerNote(
  customerId: string,
  note: string,
  userId: string,
): Promise<{ id: string }> {
  const created = await prisma.customerNote.create({
    data: { customerId, note, createdById: userId },
  });

  await writeAuditLog({
    userId,
    action: "CUSTOMER_NOTE_CREATED",
    entity: "CustomerNote",
    entityId: created.id,
    metadata: { customerId },
  });

  return { id: created.id };
}

export async function updateCustomerNote(id: string, note: string, userId: string): Promise<void> {
  const existing = await prisma.customerNote.findUnique({ where: { id } });
  if (!existing) throw new CustomerNoteNotFoundError();

  await prisma.customerNote.update({ where: { id }, data: { note } });

  await writeAuditLog({
    userId,
    action: "CUSTOMER_NOTE_UPDATED",
    entity: "CustomerNote",
    entityId: id,
    metadata: { customerId: existing.customerId },
  });
}
