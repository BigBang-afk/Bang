import "server-only";
import { prisma } from "@/lib/db/prisma";
import type { AuditAction, Prisma } from "@/generated/prisma/client";

type WriteAuditLogInput = {
  userId: string | null;
  action: AuditAction;
  entity: string;
  entityId?: string | null;
  metadata?: Prisma.InputJsonValue;
};

/**
 * Records a system audit event. Never pass passwords, tokens, or other
 * secrets in `metadata` — audit logs are append-only and read by staff.
 */
export async function writeAuditLog(input: WriteAuditLogInput): Promise<void> {
  await prisma.auditLog.create({
    data: {
      userId: input.userId,
      action: input.action,
      entity: input.entity,
      entityId: input.entityId ?? null,
      metadata: input.metadata,
    },
  });
}
