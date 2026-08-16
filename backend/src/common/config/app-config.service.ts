import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Thin typed wrapper around ConfigService so the rest of the app never
 * touches process.env directly and every default lives in one place.
 */
@Injectable()
export class AppConfigService {
  constructor(private readonly config: ConfigService) {}

  get port(): number {
    return Number(this.config.get<string>('PORT') ?? 3000);
  }

  get nodeEnv(): string {
    return this.config.get<string>('NODE_ENV') ?? 'development';
  }

  get isProduction(): boolean {
    return this.nodeEnv === 'production';
  }

  get jwtAccessSecret(): string {
    const secret = this.config.get<string>('JWT_ACCESS_SECRET');
    if (!secret) {
      throw new Error('JWT_ACCESS_SECRET is not configured');
    }
    if (this.isProduction && secret === 'change-me-access-secret') {
      throw new Error('JWT_ACCESS_SECRET must be overridden in production');
    }
    return secret;
  }

  get jwtAccessTtl(): string {
    return this.config.get<string>('JWT_ACCESS_TTL') ?? '15m';
  }

  get jwtRefreshTtlDays(): number {
    return Number(this.config.get<string>('JWT_REFRESH_TTL_DAYS') ?? 7);
  }

  get passwordResetTtlMinutes(): number {
    return Number(this.config.get<string>('PASSWORD_RESET_TTL_MINUTES') ?? 30);
  }

  get maxFailedLoginAttempts(): number {
    return Number(this.config.get<string>('MAX_FAILED_LOGIN_ATTEMPTS') ?? 5);
  }

  get lockoutMinutes(): number {
    return Number(this.config.get<string>('LOCKOUT_MINUTES') ?? 15);
  }

  get redisUrl(): string {
    return this.config.get<string>('REDIS_URL') ?? 'redis://localhost:6379';
  }

  get apiUrl(): string {
    return this.config.get<string>('API_URL') ?? `http://localhost:${this.port}`;
  }

  get appUrl(): string {
    return this.config.get<string>('APP_URL') ?? 'http://localhost:5173';
  }
}
