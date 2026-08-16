import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';

@Injectable()
export class RolesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  findAll() {
    return this.prisma.role.findMany({
      include: { permissions: { include: { permission: true } } },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const role = await this.prisma.role.findUnique({
      where: { id },
      include: { permissions: { include: { permission: true } } },
    });
    if (!role) {
      throw new NotFoundException('Role not found');
    }
    return role;
  }

  private async assertPermissionsExist(permissionIds: string[]) {
    if (permissionIds.length === 0) return;
    const count = await this.prisma.permission.count({ where: { id: { in: permissionIds } } });
    if (count !== new Set(permissionIds).size) {
      throw new BadRequestException('One or more permissionIds do not exist');
    }
  }

  async create(dto: CreateRoleDto, actorUserId: string, ip?: string, userAgent?: string) {
    await this.assertPermissionsExist(dto.permissionIds);

    const role = await this.prisma.role.create({
      data: {
        name: dto.name,
        description: dto.description,
        permissions: {
          create: dto.permissionIds.map((permissionId) => ({ permissionId })),
        },
      },
      include: { permissions: { include: { permission: true } } },
    });

    await this.audit.log({
      actorUserId,
      action: 'role.created',
      targetType: 'Role',
      targetId: role.id,
      metadata: { name: role.name, permissionIds: dto.permissionIds },
      ipAddress: ip,
      userAgent,
    });

    return role;
  }

  async update(
    id: string,
    dto: UpdateRoleDto,
    actorUserId: string,
    ip?: string,
    userAgent?: string,
  ) {
    const existing = await this.findOne(id);

    if (dto.permissionIds) {
      await this.assertPermissionsExist(dto.permissionIds);
    }

    const role = await this.prisma.$transaction(async (tx) => {
      if (dto.permissionIds) {
        await tx.rolePermission.deleteMany({ where: { roleId: id } });
        await tx.rolePermission.createMany({
          data: dto.permissionIds.map((permissionId) => ({ roleId: id, permissionId })),
        });
      }
      return tx.role.update({
        where: { id },
        data: {
          name: dto.name ?? undefined,
          description: dto.description ?? undefined,
        },
        include: { permissions: { include: { permission: true } } },
      });
    });

    await this.audit.log({
      actorUserId,
      action: 'role.updated',
      targetType: 'Role',
      targetId: id,
      metadata: { before: { name: existing.name }, after: dto },
      ipAddress: ip,
      userAgent,
    });

    return role;
  }

  async remove(id: string, actorUserId: string, ip?: string, userAgent?: string) {
    const role = await this.findOne(id);
    if (role.isSystem) {
      throw new BadRequestException('System roles cannot be deleted');
    }
    await this.prisma.role.delete({ where: { id } });

    await this.audit.log({
      actorUserId,
      action: 'role.deleted',
      targetType: 'Role',
      targetId: id,
      metadata: { name: role.name },
      ipAddress: ip,
      userAgent,
    });
  }
}
