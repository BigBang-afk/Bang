import { Injectable } from '@nestjs/common';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from '../../../prisma/prisma.service';
import { AppConfigService } from '../../../common/config/app-config.service';

export interface IssuedRefreshToken {
  raw: string;
  expiresAt: Date;
}

/**
 * Refresh tokens are opaque random strings; only their SHA-256 hash is
 * stored, so a database leak alone cannot be used to impersonate a session.
 */
@Injectable()
export class TokenService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfigService,
  ) {}

  private hash(raw: string): string {
    return createHash('sha256').update(raw).digest('hex');
  }

  async issueRefreshToken(
    userId: string,
    ip?: string,
    userAgent?: string,
  ): Promise<IssuedRefreshToken> {
    const raw = randomBytes(48).toString('hex');
    const expiresAt = new Date(Date.now() + this.config.jwtRefreshTtlDays * 24 * 60 * 60 * 1000);

    await this.prisma.session.create({
      data: {
        userId,
        tokenHash: this.hash(raw),
        expiresAt,
        createdByIp: ip,
        userAgent,
      },
    });

    return { raw, expiresAt };
  }

  async findValidByRaw(raw: string) {
    const tokenHash = this.hash(raw);
    return this.prisma.session.findUnique({ where: { tokenHash } });
  }

  async rotate(raw: string, ip?: string, userAgent?: string) {
    const existing = await this.findValidByRaw(raw);
    if (!existing) {
      return { status: 'not_found' as const };
    }
    if (existing.revokedAt) {
      // A revoked/rotated token was presented again: possible token theft.
      // Invalidate the whole session family for this user.
      await this.prisma.session.updateMany({
        where: { userId: existing.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      return { status: 'reuse_detected' as const, userId: existing.userId };
    }
    if (existing.expiresAt < new Date()) {
      return { status: 'expired' as const, userId: existing.userId };
    }

    const next = await this.issueRefreshToken(existing.userId, ip, userAgent);
    await this.prisma.session.update({
      where: { id: existing.id },
      data: { revokedAt: new Date() },
    });
    // Best-effort link for forensics; not required for correctness.
    const created = await this.prisma.session.findUnique({
      where: { tokenHash: this.hash(next.raw) },
    });
    if (created) {
      await this.prisma.session.update({
        where: { id: existing.id },
        data: { replacedById: created.id },
      });
    }

    return { status: 'rotated' as const, userId: existing.userId, token: next };
  }

  async revoke(raw: string): Promise<void> {
    const tokenHash = this.hash(raw);
    await this.prisma.session.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async revokeAllForUser(userId: string): Promise<void> {
    await this.prisma.session.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}
