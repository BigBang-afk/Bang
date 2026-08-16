import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { AppConfigService } from '../src/common/config/app-config.service';

/**
 * Rate limiting is skipped for the rest of the e2e suite (NODE_ENV=test)
 * because the suite legitimately calls /auth/login dozens of times in a
 * few seconds from one IP. This file boots its own isolated app instance
 * with AppConfigService overridden so nodeEnv !== 'test', which turns the
 * skip off — proving the throttle is actually wired, not just configured.
 */
describe('Login rate limiting (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const fakeConfig: AppConfigService = {
      port: 3099,
      nodeEnv: 'development',
      isProduction: false,
      jwtAccessSecret: 'test-only-access-secret',
      jwtAccessTtl: '15m',
      jwtRefreshTtlDays: 7,
      passwordResetTtlMinutes: 30,
      maxFailedLoginAttempts: 3,
      lockoutMinutes: 15,
      redisUrl: process.env.REDIS_URL ?? 'redis://localhost:6379',
      apiUrl: 'http://localhost:3099/api/v1',
      appUrl: 'http://localhost:5173',
    } as AppConfigService;

    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(AppConfigService)
      .useValue(fakeConfig)
      .compile();

    app = moduleRef.createNestApplication();
    app.use(cookieParser());
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns 429 after exceeding the login throttle limit', async () => {
    const attempts = Array.from({ length: 6 }, () =>
      request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ identifier: 'nobody', password: 'wrong' }),
    );
    const results = await Promise.all(attempts);
    const statuses = results.map((r) => r.status);

    // The login route is throttled to 5/min; the 6th concurrent request
    // (whatever order it lands in) should be rejected with 429.
    expect(statuses.filter((s) => s === 429).length).toBeGreaterThan(0);
    expect(statuses.filter((s) => s === 401).length).toBeLessThanOrEqual(5);
  });
});
