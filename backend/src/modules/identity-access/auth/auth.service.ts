import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { authenticator } from 'otplib';
import * as QRCode from 'qrcode';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from '../../../prisma/prisma.service';
import { AppConfigService } from '../../../common/config/app-config.service';
import { AuditService } from '../audit/audit.service';
import { PasswordService } from '../password.service';
import { UsersService, toSafeUser } from '../users/users.service';
import { TokenService } from './token.service';

interface RequestContext {
  ip?: string;
  userAgent?: string;
}

const APP_NAME = 'Zarghoon Jewellers ERP';

type UserWithRoles = NonNullable<Awaited<ReturnType<UsersService['findByIdentifierInternal']>>>;

function buildAuthClaims(user: UserWithRoles) {
  const roles = user.roles.map((ur) => ur.role.name);
  const permissions = Array.from(
    new Set(user.roles.flatMap((ur) => ur.role.permissions.map((rp) => rp.permission.code))),
  );
  return { roles, permissions };
}

/** Safe user fields plus the flattened role/permission names the UI needs. */
function toClientUser(user: UserWithRoles) {
  const { roles, permissions } = buildAuthClaims(user);
  return { ...toSafeUser(user), roleNames: roles, permissions };
}

/** Best-effort human label for a user who may have no email on file. */
function displayIdentifier(user: { email: string | null; username: string | null; id: string }) {
  return user.email ?? user.username ?? user.id;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfigService,
    private readonly jwtService: JwtService,
    private readonly tokenService: TokenService,
    private readonly audit: AuditService,
    private readonly passwordService: PasswordService,
    private readonly usersService: UsersService,
  ) {}

  private signAccessToken(user: UserWithRoles): string {
    const { roles, permissions } = buildAuthClaims(user);
    return this.jwtService.sign(
      { sub: user.id, roles, permissions },
      { secret: this.config.jwtAccessSecret, expiresIn: this.config.jwtAccessTtl },
    );
  }

  async login(
    identifier: string,
    password: string,
    totpCode: string | undefined,
    ctx: RequestContext,
  ) {
    const user = await this.usersService.findByIdentifierInternal(identifier);

    if (!user) {
      await this.audit.log({
        action: 'auth.login.failure',
        result: 'FAILURE',
        metadata: { identifier, reason: 'no_such_user' },
        ipAddress: ctx.ip,
        userAgent: ctx.userAgent,
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.status === 'LOCKED' || (user.lockedUntil && user.lockedUntil > new Date())) {
      await this.audit.log({
        actorUserId: user.id,
        action: 'auth.login.blocked_locked',
        entityType: 'User',
        entityId: user.id,
        result: 'FAILURE',
        ipAddress: ctx.ip,
        userAgent: ctx.userAgent,
      });
      throw new ForbiddenException('Account is locked');
    }

    if (user.status !== 'ACTIVE') {
      await this.audit.log({
        actorUserId: user.id,
        action: 'auth.login.blocked_status',
        entityType: 'User',
        entityId: user.id,
        result: 'FAILURE',
        metadata: { status: user.status },
        ipAddress: ctx.ip,
        userAgent: ctx.userAgent,
      });
      throw new ForbiddenException('Account is not active');
    }

    const passwordValid = await this.passwordService.compare(password, user.passwordHash);
    if (!passwordValid) {
      await this.registerFailedLogin(user.id);
      await this.audit.log({
        actorUserId: user.id,
        action: 'auth.login.failure',
        entityType: 'User',
        entityId: user.id,
        result: 'FAILURE',
        metadata: { reason: 'bad_password' },
        ipAddress: ctx.ip,
        userAgent: ctx.userAgent,
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.mfaEnabled) {
      if (!totpCode) {
        await this.audit.log({
          actorUserId: user.id,
          action: 'auth.login.mfa_required',
          entityType: 'User',
          entityId: user.id,
          ipAddress: ctx.ip,
          userAgent: ctx.userAgent,
        });
        return { mfaRequired: true as const };
      }
      const mfaValid = authenticator.verify({ token: totpCode, secret: user.mfaSecret! });
      if (!mfaValid) {
        await this.registerFailedLogin(user.id);
        await this.audit.log({
          actorUserId: user.id,
          action: 'auth.login.mfa_failed',
          entityType: 'User',
          entityId: user.id,
          result: 'FAILURE',
          ipAddress: ctx.ip,
          userAgent: ctx.userAgent,
        });
        throw new UnauthorizedException('Invalid authentication code');
      }
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { failedLoginAttempts: 0, lockedUntil: null, lastLoginAt: new Date() },
    });

    const accessToken = this.signAccessToken(user);
    const refreshToken = await this.tokenService.issueRefreshToken(user.id, ctx.ip, ctx.userAgent);

    await this.audit.log({
      actorUserId: user.id,
      action: 'auth.login.success',
      entityType: 'User',
      entityId: user.id,
      ipAddress: ctx.ip,
      userAgent: ctx.userAgent,
    });

    return {
      mfaRequired: false as const,
      accessToken,
      refreshToken: refreshToken.raw,
      refreshTokenExpiresAt: refreshToken.expiresAt,
      user: toClientUser(user),
    };
  }

  private async registerFailedLogin(userId: string): Promise<void> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const attempts = user.failedLoginAttempts + 1;
    const shouldLock = attempts >= this.config.maxFailedLoginAttempts;

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        failedLoginAttempts: attempts,
        lockedUntil: shouldLock
          ? new Date(Date.now() + this.config.lockoutMinutes * 60 * 1000)
          : user.lockedUntil,
      },
    });

    if (shouldLock) {
      await this.audit.log({
        actorUserId: userId,
        action: 'auth.account.locked',
        entityType: 'User',
        entityId: userId,
        metadata: { attempts },
      });
    }
  }

  async refresh(rawRefreshToken: string, ctx: RequestContext) {
    const result = await this.tokenService.rotate(rawRefreshToken, ctx.ip, ctx.userAgent);

    if (result.status === 'not_found') {
      throw new UnauthorizedException('Invalid session');
    }
    if (result.status === 'reuse_detected') {
      await this.audit.log({
        actorUserId: result.userId,
        action: 'session.revoked',
        entityType: 'User',
        entityId: result.userId,
        result: 'FAILURE',
        metadata: { reason: 'refresh_token_reuse_detected' },
        ipAddress: ctx.ip,
        userAgent: ctx.userAgent,
      });
      throw new UnauthorizedException('Session invalid — please log in again');
    }
    if (result.status === 'expired') {
      throw new UnauthorizedException('Session expired — please log in again');
    }

    const user = await this.usersService.findByIdInternal(result.userId);
    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Account is not active');
    }

    const accessToken = this.signAccessToken(user);

    await this.audit.log({
      actorUserId: user.id,
      action: 'auth.refresh.success',
      entityType: 'User',
      entityId: user.id,
      ipAddress: ctx.ip,
      userAgent: ctx.userAgent,
    });

    return {
      accessToken,
      refreshToken: result.token!.raw,
      refreshTokenExpiresAt: result.token!.expiresAt,
      user: toClientUser(user),
    };
  }

  async logout(rawRefreshToken: string | undefined, ctx: RequestContext & { userId?: string }) {
    if (rawRefreshToken) {
      await this.tokenService.revoke(rawRefreshToken);
    }
    await this.audit.log({
      actorUserId: ctx.userId,
      action: 'auth.logout',
      entityType: ctx.userId ? 'User' : undefined,
      entityId: ctx.userId,
      ipAddress: ctx.ip,
      userAgent: ctx.userAgent,
    });
  }

  async requestPasswordReset(identifier: string, ctx: RequestContext) {
    const user = await this.usersService.findByIdentifierInternal(identifier);
    // Always behave the same way whether or not the account exists, so the
    // endpoint can't be used to enumerate registered usernames/emails/phones.
    if (!user) {
      return { requested: true };
    }

    const raw = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(raw).digest('hex');
    const expiresAt = new Date(Date.now() + this.config.passwordResetTtlMinutes * 60 * 1000);

    await this.prisma.passwordResetToken.create({
      data: { userId: user.id, tokenHash, expiresAt },
    });

    await this.audit.log({
      actorUserId: user.id,
      action: 'auth.password_reset.requested',
      entityType: 'User',
      entityId: user.id,
      ipAddress: ctx.ip,
      userAgent: ctx.userAgent,
    });

    // Phase 1 has no transactional email/SMS provider wired up yet: log the
    // reset link server-side so it can be delivered manually / picked up by
    // an email integration in a later phase. Never expose the raw token in
    // the API response or audit log — that would let anyone reset anyone's
    // password.
    // eslint-disable-next-line no-console
    console.log(
      `[password-reset] token for ${displayIdentifier(user)}: ${raw} (expires ${expiresAt.toISOString()})`,
    );

    return { requested: true, devToken: this.config.isProduction ? undefined : raw };
  }

  async confirmPasswordReset(rawToken: string, newPassword: string, ctx: RequestContext) {
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');
    const resetToken = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash },
    });

    if (!resetToken || resetToken.usedAt || resetToken.expiresAt < new Date()) {
      throw new BadRequestException('Reset token is invalid or expired');
    }

    const passwordHash = await this.passwordService.hash(newPassword);

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: resetToken.userId },
        data: {
          passwordHash,
          failedLoginAttempts: 0,
          lockedUntil: null,
          updatedBy: resetToken.userId,
        },
      });
      await tx.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { usedAt: new Date() },
      });
      // Password reset invalidates every existing session (spec §12).
      await tx.session.updateMany({
        where: { userId: resetToken.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    });

    await this.audit.log({
      actorUserId: resetToken.userId,
      action: 'auth.password_reset.completed',
      entityType: 'User',
      entityId: resetToken.userId,
      ipAddress: ctx.ip,
      userAgent: ctx.userAgent,
    });
    await this.audit.log({
      actorUserId: resetToken.userId,
      action: 'session.revoked',
      entityType: 'User',
      entityId: resetToken.userId,
      metadata: { reason: 'password_reset' },
      ipAddress: ctx.ip,
      userAgent: ctx.userAgent,
    });

    return { success: true };
  }

  async mfaEnrollStart(userId: string) {
    const user = await this.usersService.findByIdInternal(userId);
    if (!user) {
      throw new BadRequestException('User not found');
    }

    const secret = authenticator.generateSecret();
    await this.prisma.user.update({
      where: { id: userId },
      data: { mfaPendingSecret: secret },
    });

    const otpauthUrl = authenticator.keyuri(displayIdentifier(user), APP_NAME, secret);
    const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);

    return { secret, otpauthUrl, qrCodeDataUrl };
  }

  async mfaEnrollConfirm(userId: string, code: string, ctx: RequestContext) {
    const user = await this.usersService.findByIdInternal(userId);
    if (!user || !user.mfaPendingSecret) {
      throw new BadRequestException('No pending MFA enrollment for this user');
    }

    const valid = authenticator.verify({ token: code, secret: user.mfaPendingSecret });
    if (!valid) {
      throw new BadRequestException('Invalid authentication code');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        mfaEnabled: true,
        mfaMethod: 'TOTP',
        mfaSecret: user.mfaPendingSecret,
        mfaPendingSecret: null,
      },
    });

    await this.audit.log({
      actorUserId: userId,
      action: 'auth.mfa.enabled',
      entityType: 'User',
      entityId: userId,
      ipAddress: ctx.ip,
      userAgent: ctx.userAgent,
    });

    return { mfaEnabled: true };
  }

  async mfaDisable(userId: string, code: string, ctx: RequestContext) {
    const user = await this.usersService.findByIdInternal(userId);
    if (!user || !user.mfaEnabled || !user.mfaSecret) {
      throw new BadRequestException('MFA is not enabled for this user');
    }

    const valid = authenticator.verify({ token: code, secret: user.mfaSecret });
    if (!valid) {
      throw new BadRequestException('Invalid authentication code');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { mfaEnabled: false, mfaMethod: 'NONE', mfaSecret: null, mfaPendingSecret: null },
    });

    await this.audit.log({
      actorUserId: userId,
      action: 'auth.mfa.disabled',
      entityType: 'User',
      entityId: userId,
      ipAddress: ctx.ip,
      userAgent: ctx.userAgent,
    });

    return { mfaEnabled: false };
  }
}
