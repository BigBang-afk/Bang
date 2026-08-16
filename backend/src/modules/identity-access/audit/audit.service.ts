import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

export interface AuditLogInput {
  actorUserId?: string | null;
  action: string;
  targetType?: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Single append-only audit trail shared by every module. Nobody in the
 * identity-access module writes to AuditLog except through this service,
 * so log shape/semantics stay consistent as later modules adopt it too.
 */
@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(input: AuditLogInput): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        actorUserId: input.actorUserId ?? null,
        action: input.action,
        targetType: input.targetType,
        targetId: input.targetId,
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
    targetType?: string;
  }) {
    const { skip = 0, take = 50, actorUserId, action, targetType } = params;
    const where = {
      ...(actorUserId ? { actorUserId } : {}),
      ...(action ? { action } : {}),
      ...(targetType ? { targetType } : {}),
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
