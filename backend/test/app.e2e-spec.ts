import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import * as bcrypt from 'bcryptjs';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import {
  ALL_PERMISSION_CODES,
  PERMISSIONS,
} from '../src/modules/identity-access/permissions.constants';

describe('Identity & Access (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const ownerEmail = 'e2e-owner@bang.local';
  const ownerPassword = 'OwnerPass123!';
  const staffEmail = 'e2e-staff@bang.local';
  const staffPassword = 'StaffPass123!';

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.use(cookieParser());
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    await app.init();

    prisma = app.get(PrismaService);

    // Clean slate for this test file's fixtures.
    await prisma.auditLog.deleteMany({ where: { actor: { email: { contains: 'e2e-' } } } });
    await prisma.refreshToken.deleteMany({ where: { user: { email: { contains: 'e2e-' } } } });
    await prisma.passwordResetToken.deleteMany({
      where: { user: { email: { contains: 'e2e-' } } },
    });
    await prisma.userRole.deleteMany({ where: { user: { email: { contains: 'e2e-' } } } });
    await prisma.user.deleteMany({ where: { email: { contains: 'e2e-' } } });
    await prisma.role.deleteMany({ where: { name: { in: ['E2E_OWNER', 'E2E_STAFF'] } } });

    for (const code of ALL_PERMISSION_CODES) {
      await prisma.permission.upsert({
        where: { code },
        update: {},
        create: { code, module: 'identity-access' },
      });
    }
    const allPermissions = await prisma.permission.findMany();

    const ownerRole = await prisma.role.create({
      data: {
        name: 'E2E_OWNER',
        isSystem: false,
        permissions: { create: allPermissions.map((p) => ({ permissionId: p.id })) },
      },
    });

    const staffRole = await prisma.role.create({
      data: {
        name: 'E2E_STAFF',
        isSystem: false,
        permissions: {
          create: allPermissions
            .filter((p) => p.code === PERMISSIONS.USERS_READ)
            .map((p) => ({ permissionId: p.id })),
        },
      },
    });

    const ownerHash = await bcrypt.hash(ownerPassword, 4);
    await prisma.user.create({
      data: {
        email: ownerEmail,
        firstName: 'E2E',
        lastName: 'Owner',
        passwordHash: ownerHash,
        status: 'ACTIVE',
        roles: { create: [{ roleId: ownerRole.id }] },
      },
    });

    const staffHash = await bcrypt.hash(staffPassword, 4);
    await prisma.user.create({
      data: {
        email: staffEmail,
        firstName: 'E2E',
        lastName: 'Staff',
        passwordHash: staffHash,
        status: 'ACTIVE',
        roles: { create: [{ roleId: staffRole.id }] },
      },
    });
  });

  afterAll(async () => {
    await app.close();
  });

  it('rejects protected routes with no token', async () => {
    await request(app.getHttpServer()).get('/api/users').expect(401);
  });

  it('rejects login with wrong password', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: ownerEmail, password: 'wrong-password' });
    expect(res.status).toBe(401);
  });

  it('logs in the owner and returns an access token + refresh cookie', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: ownerEmail, password: ownerPassword });

    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeDefined();
    expect(res.body.user.email).toBe(ownerEmail);
    expect(res.body.user.permissions).toContain(PERMISSIONS.USERS_CREATE);
    expect(res.headers['set-cookie']).toBeDefined();
  });

  it('allows an authorized request with a valid access token', async () => {
    const login = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: ownerEmail, password: ownerPassword });
    const token = login.body.accessToken;

    const res = await request(app.getHttpServer())
      .get('/api/users')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('enforces permission checks: staff (read-only) cannot create users', async () => {
    const login = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: staffEmail, password: staffPassword });
    const token = login.body.accessToken;

    const readRes = await request(app.getHttpServer())
      .get('/api/users')
      .set('Authorization', `Bearer ${token}`);
    expect(readRes.status).toBe(200);

    const createRes = await request(app.getHttpServer())
      .post('/api/users')
      .set('Authorization', `Bearer ${token}`)
      .send({
        email: 'e2e-blocked@bang.local',
        firstName: 'Blocked',
        lastName: 'User',
        temporaryPassword: 'Whatever123!',
      });
    expect(createRes.status).toBe(403);
  });

  it('lets the owner create a user who can then log in', async () => {
    const login = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: ownerEmail, password: ownerPassword });
    const token = login.body.accessToken;

    const createRes = await request(app.getHttpServer())
      .post('/api/users')
      .set('Authorization', `Bearer ${token}`)
      .send({
        email: 'e2e-newhire@bang.local',
        firstName: 'New',
        lastName: 'Hire',
        temporaryPassword: 'Temporary123!',
      });
    expect(createRes.status).toBe(201);

    const newLogin = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'e2e-newhire@bang.local', password: 'Temporary123!' });
    expect(newLogin.status).toBe(200);
    // A brand-new user has no roles yet, so no permissions.
    expect(newLogin.body.user.permissions).toEqual([]);
  });

  it('rotates refresh tokens and rejects reuse of a rotated token', async () => {
    const agent = request.agent(app.getHttpServer());
    const login = await agent
      .post('/api/auth/login')
      .send({ email: ownerEmail, password: ownerPassword });
    expect(login.status).toBe(200);

    const firstRefreshCookie = login.headers['set-cookie'];

    const refreshRes = await agent.post('/api/auth/refresh');
    expect(refreshRes.status).toBe(200);
    expect(refreshRes.body.accessToken).toBeDefined();

    // Replaying the original (now-rotated) cookie must be rejected.
    const reuseRes = await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .set('Cookie', firstRefreshCookie);
    expect(reuseRes.status).toBe(401);
  });

  it('logs out and invalidates the session', async () => {
    const agent = request.agent(app.getHttpServer());
    await agent.post('/api/auth/login').send({ email: ownerEmail, password: ownerPassword });

    const logoutRes = await agent.post('/api/auth/logout');
    expect(logoutRes.status).toBe(200);

    const refreshRes = await agent.post('/api/auth/refresh');
    expect(refreshRes.status).toBe(401);
  });

  it('locks the account after repeated failed logins', async () => {
    const email = 'e2e-lockout@bang.local';
    const hash = await bcrypt.hash('CorrectPass123!', 4);
    await prisma.user.create({
      data: { email, firstName: 'Lock', lastName: 'Out', passwordHash: hash, status: 'ACTIVE' },
    });

    // MAX_FAILED_LOGIN_ATTEMPTS=3 in .env.test
    for (let i = 0; i < 3; i++) {
      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email, password: 'wrong' });
      expect(res.status).toBe(401);
    }

    const lockedRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email, password: 'CorrectPass123!' });
    expect(lockedRes.status).toBe(403);
  });

  it('completes a password reset end to end', async () => {
    const email = 'e2e-reset@bang.local';
    const hash = await bcrypt.hash('OldPass123!', 4);
    await prisma.user.create({
      data: { email, firstName: 'Reset', lastName: 'Me', passwordHash: hash, status: 'ACTIVE' },
    });

    const requestRes = await request(app.getHttpServer())
      .post('/api/auth/password-reset/request')
      .send({ email });
    expect(requestRes.status).toBe(200);
    expect(requestRes.body.devToken).toBeDefined();

    const confirmRes = await request(app.getHttpServer())
      .post('/api/auth/password-reset/confirm')
      .send({ token: requestRes.body.devToken, newPassword: 'NewPass123!' });
    expect(confirmRes.status).toBe(200);

    const oldLogin = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email, password: 'OldPass123!' });
    expect(oldLogin.status).toBe(401);

    const newLogin = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email, password: 'NewPass123!' });
    expect(newLogin.status).toBe(200);
  });

  it('records audit log entries and exposes them to permitted users', async () => {
    const login = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: ownerEmail, password: ownerPassword });
    const token = login.body.accessToken;

    const auditRes = await request(app.getHttpServer())
      .get('/api/audit-logs?take=50')
      .set('Authorization', `Bearer ${token}`);

    expect(auditRes.status).toBe(200);
    expect(auditRes.body.total).toBeGreaterThan(0);
    const actions = auditRes.body.items.map((i: { action: string }) => i.action);
    expect(actions).toContain('auth.login.success');
  });
});
