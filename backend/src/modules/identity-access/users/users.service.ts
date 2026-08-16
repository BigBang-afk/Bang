import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { User } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { PasswordService } from '../password.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

const USER_INCLUDE = {
  roles: { include: { role: { include: { permissions: { include: { permission: true } } } } } },
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

  /** Internal — includes secrets, used only by AuthService. */
  async findByEmailInternal(email: string) {
    return this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: USER_INCLUDE,
    });
  }

  async findByIdInternal(id: string) {
    return this.prisma.user.findUnique({ where: { id }, include: USER_INCLUDE });
  }

  async create(dto: CreateUserDto, actorUserId: string, ip?: string, userAgent?: string) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    if (existing) {
      throw new ConflictException('A user with this email already exists');
    }

    if (dto.roleIds && dto.roleIds.length > 0) {
      const count = await this.prisma.role.count({ where: { id: { in: dto.roleIds } } });
      if (count !== new Set(dto.roleIds).size) {
        throw new BadRequestException('One or more roleIds do not exist');
      }
    }

    const passwordHash = await this.passwordService.hash(dto.temporaryPassword);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        firstName: dto.firstName,
        lastName: dto.lastName,
        passwordHash,
        roles: dto.roleIds
          ? { create: dto.roleIds.map((roleId) => ({ roleId, assignedBy: actorUserId })) }
          : undefined,
      },
      include: USER_INCLUDE,
    });

    await this.audit.log({
      actorUserId,
      action: 'user.created',
      targetType: 'User',
      targetId: user.id,
      metadata: { email: user.email, roleIds: dto.roleIds ?? [] },
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

    const user = await this.prisma.user.update({
      where: { id },
      data: {
        firstName: dto.firstName ?? undefined,
        lastName: dto.lastName ?? undefined,
        status: dto.status ?? undefined,
      },
      include: USER_INCLUDE,
    });

    await this.audit.log({
      actorUserId,
      action: 'user.updated',
      targetType: 'User',
      targetId: id,
      metadata: { ...dto },
      ipAddress: ip,
      userAgent,
    });

    return toSafeUser(user);
  }

  async deactivate(id: string, actorUserId: string, ip?: string, userAgent?: string) {
    await this.findOne(id);

    const user = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({
        where: { id },
        data: { status: 'INACTIVE' },
        include: USER_INCLUDE,
      });
      await tx.refreshToken.updateMany({
        where: { userId: id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      return updated;
    });

    await this.audit.log({
      actorUserId,
      action: 'user.deactivated',
      targetType: 'User',
      targetId: id,
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
      return tx.user.findUniqueOrThrow({ where: { id }, include: USER_INCLUDE });
    });

    await this.audit.log({
      actorUserId,
      action: 'user.roles_assigned',
      targetType: 'User',
      targetId: id,
      metadata: { roleIds },
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
      throw new BadRequestException('Current password is incorrect');
    }

    const passwordHash = await this.passwordService.hash(dto.newPassword);

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id }, data: { passwordHash } });
      await tx.refreshToken.updateMany({
        where: { userId: id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    });

    await this.audit.log({
      actorUserId: id,
      action: 'user.password_changed',
      targetType: 'User',
      targetId: id,
      ipAddress: ip,
      userAgent,
    });
  }
}

export { toSafeUser };
