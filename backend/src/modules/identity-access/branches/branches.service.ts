import { ConflictException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateBranchDto } from './dto/create-branch.dto';

/**
 * Deliberately minimal: just enough of a Branch entity for the identity
 * model to attach access to (spec §8). The full Branch/Warehouse module
 * (address, contacts, operating hours, settings, ...) is a later phase.
 */
@Injectable()
export class BranchesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  findAll() {
    return this.prisma.branch.findMany({ orderBy: { name: 'asc' } });
  }

  async create(dto: CreateBranchDto, actorUserId: string, ip?: string, userAgent?: string) {
    const existing = await this.prisma.branch.findUnique({ where: { code: dto.code } });
    if (existing) {
      throw new ConflictException('A branch with this code already exists');
    }

    const branch = await this.prisma.branch.create({
      data: { code: dto.code, name: dto.name },
    });

    await this.audit.log({
      actorUserId,
      action: 'branch.created',
      entityType: 'Branch',
      entityId: branch.id,
      metadata: { code: branch.code, name: branch.name },
      ipAddress: ip,
      userAgent,
    });

    return branch;
  }
}
