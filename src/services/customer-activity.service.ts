import "server-only";
import { prisma } from "@/lib/db/prisma";
import type { AuditAction } from "@/generated/prisma/client";

/**
 * The customer profile's Activity tab — reuses the existing AuditLog
 * architecture (see ARCHITECTURE.md) rather than a parallel event table.
 * AuditLog entries about this customer directly (entity = "Customer",
 * "CustomerNote", "CustomerPayment") are entityId-matched; entries about a
 * Sale/Invoice this customer made (SALE_COMPLETED, INVOICE_GENERATED, ...)
 * are matched via the customer's own sale IDs, since those rows are logged
 * against the Sale, not the Customer.
 */

export type CustomerActivityEntry = {
  id: string;
  action: AuditAction;
  entity: string;
  entityId: string | null;
  metadata: unknown;
  createdAt: Date;
  staff: { id: string; name: string } | null;
};

export async function getCustomerActivity(
  customerId: string,
  limit = 50,
): Promise<CustomerActivityEntry[]> {
  const sales = await prisma.sale.findMany({ where: { customerId }, select: { id: true } });
  const saleIds = sales.map((s) => s.id);

  const rows = await prisma.auditLog.findMany({
    where: {
      OR: [
        { entity: { in: ["Customer", "CustomerNote", "CustomerPayment"] }, entityId: customerId },
        ...(saleIds.length > 0
          ? [{ entity: { in: ["Sale", "Invoice"] }, entityId: { in: saleIds } }]
          : []),
      ],
    },
    select: {
      id: true,
      action: true,
      entity: true,
      entityId: true,
      metadata: true,
      createdAt: true,
      user: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return rows.map((row) => ({
    id: row.id,
    action: row.action,
    entity: row.entity,
    entityId: row.entityId,
    metadata: row.metadata,
    createdAt: row.createdAt,
    staff: row.user,
  }));
}
