import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

export type AuditResult = 'SUCCESS' | 'FAILURE';

export interface AuditLogInput {
  actorUserId?: string | null;
  action: string;
  entityType?: string;
  entityId?: string;
  result?: AuditResult;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Single append-only audit trail shared by every module. Nobody writes to
 * AuditLog except through this service, so log shape/semantics stay
 * consistent as later modules adopt it too. Never pass passwords, tokens,
 * or other secrets into `metadata` — this table is read via the API by
 * anyone with audit.read.
 */
@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(input: AuditLogInput): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        actorUserId: input.actorUserId ?? null,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        result: input.result ?? 'SUCCESS',
        metadata: input.metadata as Prisma.InputJsonValue,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
      },
    });
  }

  async findAll(params: {
    skip?: number;
    take?: number;
    actorUserId?: string;
    action?: string;
    entityType?: string;
  }) {
    const { skip = 0, take = 50, actorUserId, action, entityType } = params;
    const where = {
      ...(actorUserId ? { actorUserId } : {}),
      ...(action ? { action } : {}),
      ...(entityType ? { entityType } : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
        include: {
          actor: { select: { id: true, email: true, firstName: true, lastName: true } },
        },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return { items, total, skip, take };
  }
}
