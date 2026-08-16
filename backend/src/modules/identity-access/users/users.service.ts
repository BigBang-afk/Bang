import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BranchAccessType, User } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { PasswordService } from '../password.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

const USER_INCLUDE = {
  roles: { include: { role: { include: { permissions: { include: { permission: true } } } } } },
  branches: { include: { branch: true } },
} as const;

function toSafeUser<T extends User>(
  user: T,
): Omit<T, 'passwordHash' | 'mfaSecret' | 'mfaPendingSecret'> {
  const {
    passwordHash: _passwordHash,
    mfaSecret: _mfaSecret,
    mfaPendingSecret: _mfaPendingSecret,
    ...safe
  } = user;
  return safe;
}

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly passwordService: PasswordService,
  ) {}

  async findAll() {
    const users = await this.prisma.user.findMany({
      include: USER_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
    return users.map(toSafeUser);
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id }, include: USER_INCLUDE });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return toSafeUser(user);
  }

  /** Internal — includes secrets, used only by AuthService. Matches username, email, or phone. */
  async findByIdentifierInternal(identifier: string) {
    const normalized = identifier.trim().toLowerCase();
    return this.prisma.user.findFirst({
      where: {
        OR: [{ email: normalized }, { username: normalized }, { phone: identifier.trim() }],
      },
      include: USER_INCLUDE,
    });
  }

  async findByIdInternal(id: string) {
    return this.prisma.user.findUnique({ where: { id }, include: USER_INCLUDE });
  }

  private async assertIdentityFieldsAvailable(
    fields: { username?: string; email?: string; phone?: string; employeeCode?: string },
    excludeUserId?: string,
  ) {
    const orClauses = [];
    if (fields.username) orClauses.push({ username: fields.username.toLowerCase() });
    if (fields.email) orClauses.push({ email: fields.email.toLowerCase() });
    if (fields.phone) orClauses.push({ phone: fields.phone });
    if (fields.employeeCode) orClauses.push({ employeeCode: fields.employeeCode });
    if (orClauses.length === 0) return;

    const existing = await this.prisma.user.findFirst({
      where: {
        OR: orClauses,
        ...(excludeUserId ? { id: { not: excludeUserId } } : {}),
      },
    });
    if (existing) {
      throw new ConflictException(
        'A user with this username, email, phone, or employee code already exists',
      );
    }
  }

  private validateBranchAssignment(
    branchAccessType: BranchAccessType | undefined,
    branchIds: string[] | undefined,
  ) {
    const type = branchAccessType ?? 'SINGLE';
    if (type === 'ALL') return;

    const ids = branchIds ?? [];
    if (type === 'SINGLE' && ids.length !== 1) {
      throw new BadRequestException('branchAccessType SINGLE requires exactly one branchId');
    }
    if (type === 'MULTIPLE' && ids.length < 1) {
      throw new BadRequestException('branchAccessType MULTIPLE requires at least one branchId');
    }
  }

  private async assertBranchesExist(branchIds: string[]) {
    if (branchIds.length === 0) return;
    const count = await this.prisma.branch.count({ where: { id: { in: branchIds } } });
    if (count !== new Set(branchIds).size) {
      throw new BadRequestException('One or more branchIds do not exist');
    }
  }

  async create(dto: CreateUserDto, actorUserId: string, ip?: string, userAgent?: string) {
    if (!dto.username && !dto.email && !dto.phone) {
      throw new BadRequestException('At least one of username, email, or phone is required');
    }
    await this.assertIdentityFieldsAvailable(dto);

    if (dto.roleIds && dto.roleIds.length > 0) {
      const count = await this.prisma.role.count({ where: { id: { in: dto.roleIds } } });
      if (count !== new Set(dto.roleIds).size) {
        throw new BadRequestException('One or more roleIds do not exist');
      }
    }

    const branchAccessType = dto.branchAccessType ?? 'SINGLE';
    this.validateBranchAssignment(branchAccessType, dto.branchIds);
    if (branchAccessType !== 'ALL') {
      await this.assertBranchesExist(dto.branchIds ?? []);
    }

    const passwordHash = await this.passwordService.hash(dto.temporaryPassword);

    const user = await this.prisma.user.create({
      data: {
        employeeCode: dto.employeeCode,
        username: dto.username?.toLowerCase(),
        email: dto.email?.toLowerCase(),
        phone: dto.phone,
        firstName: dto.firstName,
        lastName: dto.lastName,
        passwordHash,
        branchAccessType,
        createdBy: actorUserId,
        updatedBy: actorUserId,
        roles: dto.roleIds
          ? { create: dto.roleIds.map((roleId) => ({ roleId, assignedBy: actorUserId })) }
          : undefined,
        branches:
          branchAccessType !== 'ALL' && dto.branchIds
            ? { create: dto.branchIds.map((branchId) => ({ branchId, grantedBy: actorUserId })) }
            : undefined,
      },
      include: USER_INCLUDE,
    });

    await this.audit.log({
      actorUserId,
      action: 'user.created',
      entityType: 'User',
      entityId: user.id,
      metadata: {
        username: user.username,
        email: user.email,
        roleIds: dto.roleIds ?? [],
        branchAccessType,
      },
      ipAddress: ip,
      userAgent,
    });

    return toSafeUser(user);
  }

  async update(
    id: string,
    dto: UpdateUserDto,
    actorUserId: string,
    ip?: string,
    userAgent?: string,
  ) {
    await this.findOne(id);
    await this.assertIdentityFieldsAvailable(dto, id);

    const user = await this.prisma.user.update({
      where: { id },
      data: {
        firstName: dto.firstName ?? undefined,
        lastName: dto.lastName ?? undefined,
        employeeCode: dto.employeeCode ?? undefined,
        username: dto.username?.toLowerCase() ?? undefined,
        email: dto.email?.toLowerCase() ?? undefined,
        phone: dto.phone ?? undefined,
        status: dto.status ?? undefined,
        branchAccessType: dto.branchAccessType ?? undefined,
        updatedBy: actorUserId,
      },
      include: USER_INCLUDE,
    });

    await this.audit.log({
      actorUserId,
      action: 'user.updated',
      entityType: 'User',
      entityId: id,
      metadata: { ...dto },
      ipAddress: ip,
      userAgent,
    });

    return toSafeUser(user);
  }

  async disable(id: string, actorUserId: string, ip?: string, userAgent?: string) {
    await this.findOne(id);

    const user = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({
        where: { id },
        data: { status: 'INACTIVE', updatedBy: actorUserId },
        include: USER_INCLUDE,
      });
      await tx.session.updateMany({
        where: { userId: id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      return updated;
    });

    await this.audit.log({
      actorUserId,
      action: 'user.disabled',
      entityType: 'User',
      entityId: id,
      ipAddress: ip,
      userAgent,
    });

    return toSafeUser(user);
  }

  async assignRoles(
    id: string,
    roleIds: string[],
    actorUserId: string,
    ip?: string,
    userAgent?: string,
  ) {
    if (id === actorUserId) {
      throw new ForbiddenException('You cannot change your own role assignment');
    }
    await this.findOne(id);

    if (roleIds.length > 0) {
      const count = await this.prisma.role.count({ where: { id: { in: roleIds } } });
      if (count !== new Set(roleIds).size) {
        throw new BadRequestException('One or more roleIds do not exist');
      }
    }

    const user = await this.prisma.$transaction(async (tx) => {
      await tx.userRole.deleteMany({ where: { userId: id } });
      if (roleIds.length > 0) {
        await tx.userRole.createMany({
          data: roleIds.map((roleId) => ({ userId: id, roleId, assignedBy: actorUserId })),
        });
      }
      await tx.user.update({ where: { id }, data: { updatedBy: actorUserId } });
      return tx.user.findUniqueOrThrow({ where: { id }, include: USER_INCLUDE });
    });

    await this.audit.log({
      actorUserId,
      action: 'role.changed',
      entityType: 'User',
      entityId: id,
      metadata: { roleIds },
      ipAddress: ip,
      userAgent,
    });

    return toSafeUser(user);
  }

  async assignBranches(
    id: string,
    branchAccessType: BranchAccessType | undefined,
    branchIds: string[],
    actorUserId: string,
    ip?: string,
    userAgent?: string,
  ) {
    await this.findOne(id);

    const type = branchAccessType ?? 'SINGLE';
    this.validateBranchAssignment(type, branchIds);
    if (type !== 'ALL') {
      await this.assertBranchesExist(branchIds);
    }

    const user = await this.prisma.$transaction(async (tx) => {
      await tx.userBranch.deleteMany({ where: { userId: id } });
      if (type !== 'ALL' && branchIds.length > 0) {
        await tx.userBranch.createMany({
          data: branchIds.map((branchId) => ({ userId: id, branchId, grantedBy: actorUserId })),
        });
      }
      return tx.user.update({
        where: { id },
        data: { branchAccessType: type, updatedBy: actorUserId },
        include: USER_INCLUDE,
      });
    });

    await this.audit.log({
      actorUserId,
      action: 'user.branches_assigned',
      entityType: 'User',
      entityId: id,
      metadata: { branchAccessType: type, branchIds },
      ipAddress: ip,
      userAgent,
    });

    return toSafeUser(user);
  }

  async changePassword(id: string, dto: ChangePasswordDto, ip?: string, userAgent?: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const valid = await this.passwordService.compare(dto.currentPassword, user.passwordHash);
    if (!valid) {
      await this.audit.log({
        actorUserId: id,
        action: 'auth.password_change.failure',
        entityType: 'User',
        entityId: id,
        result: 'FAILURE',
        ipAddress: ip,
        userAgent,
      });
      throw new BadRequestException('Current password is incorrect');
    }

    const passwordHash = await this.passwordService.hash(dto.newPassword);

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id }, data: { passwordHash, updatedBy: id } });
      // Password change invalidates every other active session (spec §12).
      await tx.session.updateMany({
        where: { userId: id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    });

    await this.audit.log({
      actorUserId: id,
      action: 'auth.password_change.success',
      entityType: 'User',
      entityId: id,
      ipAddress: ip,
      userAgent,
    });
  }
}

export { toSafeUser };
