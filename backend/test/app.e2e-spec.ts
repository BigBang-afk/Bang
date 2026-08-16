import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import * as bcrypt from 'bcryptjs';
import { authenticator } from 'otplib';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import {
  ALL_PERMISSION_CODES,
  PERMISSIONS,
} from '../src/modules/identity-access/permissions.constants';

const REFRESH_COOKIE_NAME = 'zarghoon_refresh_token';
const CSRF_COOKIE_NAME = 'zarghoon_csrf_token';

/** Extracts a named cookie's value out of a supertest response's raw Set-Cookie header. */
function cookieValue(
  setCookieHeader: string | string[] | undefined,
  name: string,
): string | undefined {
  const lines = Array.isArray(setCookieHeader)
    ? setCookieHeader
    : setCookieHeader
      ? [setCookieHeader]
      : [];
  const line = lines.find((c) => c.startsWith(`${name}=`));
  return line?.split(';')[0].split('=')[1];
}

describe('Identity & Access (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const ownerUsername = 'e2e-owner';
  const ownerPassword = 'OwnerPass123!';
  const staffUsername = 'e2e-staff';
  const staffPassword = 'StaffPass123!';

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.use(cookieParser());
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    await app.init();

    prisma = app.get(PrismaService);

    // Clean slate for this test file's fixtures.
    await prisma.auditLog.deleteMany({ where: { actor: { username: { contains: 'e2e-' } } } });
    await prisma.session.deleteMany({ where: { user: { username: { contains: 'e2e-' } } } });
    await prisma.passwordResetToken.deleteMany({
      where: { user: { username: { contains: 'e2e-' } } },
    });
    await prisma.userBranch.deleteMany({ where: { user: { username: { contains: 'e2e-' } } } });
    await prisma.userRole.deleteMany({ where: { user: { username: { contains: 'e2e-' } } } });
    await prisma.user.deleteMany({ where: { username: { contains: 'e2e-' } } });
    await prisma.role.deleteMany({ where: { name: { in: ['E2E_OWNER', 'E2E_STAFF'] } } });
    await prisma.branch.deleteMany({ where: { code: 'E2E-MAIN' } });

    for (const code of ALL_PERMISSION_CODES) {
      await prisma.permission.upsert({
        where: { code },
        update: {},
        create: { code, module: code.split('.')[0] },
      });
    }
    const allPermissions = await prisma.permission.findMany();

    const ownerRole = await prisma.role.create({
      data: {
        name: 'E2E_OWNER',
        isSystem: true,
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

    const branch = await prisma.branch.create({ data: { code: 'E2E-MAIN', name: 'E2E Main' } });

    const ownerHash = await bcrypt.hash(ownerPassword, 4);
    await prisma.user.create({
      data: {
        username: ownerUsername,
        firstName: 'E2E',
        lastName: 'Owner',
        passwordHash: ownerHash,
        status: 'ACTIVE',
        branchAccessType: 'ALL',
        roles: { create: [{ roleId: ownerRole.id }] },
      },
    });

    const staffHash = await bcrypt.hash(staffPassword, 4);
    await prisma.user.create({
      data: {
        username: staffUsername,
        firstName: 'E2E',
        lastName: 'Staff',
        passwordHash: staffHash,
        status: 'ACTIVE',
        branchAccessType: 'SINGLE',
        roles: { create: [{ roleId: staffRole.id }] },
        branches: { create: [{ branchId: branch.id }] },
      },
    });
  });

  afterAll(async () => {
    await app.close();
  });

  it('rejects protected routes with no token', async () => {
    await request(app.getHttpServer()).get('/api/v1/users').expect(401);
  });

  it('rejects login with wrong password', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ identifier: ownerUsername, password: 'wrong-password' });
    expect(res.status).toBe(401);
  });

  it('logs in the owner via username and returns an access token + refresh cookie', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ identifier: ownerUsername, password: ownerPassword });

    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeDefined();
    expect(res.body.csrfToken).toBeDefined();
    expect(res.body.user.username).toBe(ownerUsername);
    expect(res.body.user.permissions).toContain(PERMISSIONS.USERS_CREATE);
    expect(res.body.user).not.toHaveProperty('passwordHash');
    expect(cookieValue(res.headers['set-cookie'], REFRESH_COOKIE_NAME)).toBeDefined();
    expect(cookieValue(res.headers['set-cookie'], CSRF_COOKIE_NAME)).toBeDefined();
  });

  it('allows an authorized request with a valid access token', async () => {
    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ identifier: ownerUsername, password: ownerPassword });
    const token = login.body.accessToken;

    const res = await request(app.getHttpServer())
      .get('/api/v1/users')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('enforces permission checks: staff (read-only) cannot create users', async () => {
    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ identifier: staffUsername, password: staffPassword });
    const token = login.body.accessToken;

    const readRes = await request(app.getHttpServer())
      .get('/api/v1/users')
      .set('Authorization', `Bearer ${token}`);
    expect(readRes.status).toBe(200);

    const createRes = await request(app.getHttpServer())
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${token}`)
      .send({
        username: 'e2e-blocked',
        firstName: 'Blocked',
        lastName: 'User',
        temporaryPassword: 'Whatever123!',
      });
    expect(createRes.status).toBe(403);
  });

  it('lets the owner create a user (with branch assignment) who can then log in', async () => {
    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ identifier: ownerUsername, password: ownerPassword });
    const token = login.body.accessToken;

    const branch = await prisma.branch.findUniqueOrThrow({ where: { code: 'E2E-MAIN' } });

    const createRes = await request(app.getHttpServer())
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${token}`)
      .send({
        username: 'e2e-newhire',
        firstName: 'New',
        lastName: 'Hire',
        temporaryPassword: 'Temporary123!',
        branchAccessType: 'SINGLE',
        branchIds: [branch.id],
      });
    expect(createRes.status).toBe(201);
    expect(createRes.body.branchAccessType).toBe('SINGLE');

    const newLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ identifier: 'e2e-newhire', password: 'Temporary123!' });
    expect(newLogin.status).toBe(200);
    // A brand-new user has no roles yet, so no permissions.
    expect(newLogin.body.user.permissions).toEqual([]);
  });

  it('rejects creating a SINGLE-branch user without exactly one branchId', async () => {
    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ identifier: ownerUsername, password: ownerPassword });
    const token = login.body.accessToken;

    const res = await request(app.getHttpServer())
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${token}`)
      .send({
        username: 'e2e-badbranch',
        firstName: 'Bad',
        lastName: 'Branch',
        temporaryPassword: 'Temporary123!',
        branchAccessType: 'SINGLE',
        branchIds: [],
      });
    expect(res.status).toBe(400);
  });

  it('prevents a user from assigning roles to themselves (privilege escalation guard)', async () => {
    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ identifier: ownerUsername, password: ownerPassword });
    const token = login.body.accessToken;
    const ownerId = login.body.user.id;

    const rolesRes = await request(app.getHttpServer())
      .get('/api/v1/roles')
      .set('Authorization', `Bearer ${token}`);
    const roleIds = rolesRes.body.map((r: { id: string }) => r.id);

    const res = await request(app.getHttpServer())
      .put(`/api/v1/users/${ownerId}/roles`)
      .set('Authorization', `Bearer ${token}`)
      .send({ roleIds });
    expect(res.status).toBe(403);
  });

  it('blocks role assignment for a user who only has users.update, not roles.manage', async () => {
    // Give the staff role users.update in addition to users.read, but not roles.manage.
    const staffRole = await prisma.role.findUniqueOrThrow({ where: { name: 'E2E_STAFF' } });
    const usersUpdatePerm = await prisma.permission.findUniqueOrThrow({
      where: { code: PERMISSIONS.USERS_UPDATE },
    });
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: staffRole.id, permissionId: usersUpdatePerm.id } },
      update: {},
      create: { roleId: staffRole.id, permissionId: usersUpdatePerm.id },
    });

    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ identifier: staffUsername, password: staffPassword });
    const token = login.body.accessToken;

    const target = await prisma.user.findUniqueOrThrow({ where: { username: 'e2e-newhire' } });

    const res = await request(app.getHttpServer())
      .put(`/api/v1/users/${target.id}/roles`)
      .set('Authorization', `Bearer ${token}`)
      .send({ roleIds: [] });
    expect(res.status).toBe(403);

    // Clean up so later tests see the original staff permission set.
    await prisma.rolePermission.delete({
      where: { roleId_permissionId: { roleId: staffRole.id, permissionId: usersUpdatePerm.id } },
    });
  });

  it("refuses to change a system role's permission set", async () => {
    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ identifier: ownerUsername, password: ownerPassword });
    const token = login.body.accessToken;

    const res = await request(app.getHttpServer())
      .patch(
        `/api/v1/roles/${(await prisma.role.findUniqueOrThrow({ where: { name: 'E2E_STAFF' } })).id}`,
      )
      .set('Authorization', `Bearer ${token}`)
      .send({ permissionIds: [] });
    // E2E_STAFF was created isSystem: false, so this should actually succeed —
    // verifying the negative case against E2E_OWNER (isSystem: true) instead.
    expect(res.status).toBe(200);

    const ownerRole = await prisma.role.findUniqueOrThrow({ where: { name: 'E2E_OWNER' } });
    const lockedRes = await request(app.getHttpServer())
      .patch(`/api/v1/roles/${ownerRole.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ permissionIds: [] });
    expect(lockedRes.status).toBe(400);
  });

  it('lists branches for any authenticated user', async () => {
    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ identifier: staffUsername, password: staffPassword });
    const token = login.body.accessToken;

    const res = await request(app.getHttpServer())
      .get('/api/v1/branches')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.some((b: { code: string }) => b.code === 'E2E-MAIN')).toBe(true);
  });

  it('rotates refresh tokens (CSRF-protected) and rejects reuse of a rotated token', async () => {
    const agent = request.agent(app.getHttpServer());
    const login = await agent
      .post('/api/v1/auth/login')
      .send({ identifier: ownerUsername, password: ownerPassword });
    expect(login.status).toBe(200);

    const firstRefreshCookie = login.headers['set-cookie'];
    const csrfToken = login.body.csrfToken;

    const refreshRes = await agent.post('/api/v1/auth/refresh').set('X-CSRF-Token', csrfToken);
    expect(refreshRes.status).toBe(200);
    expect(refreshRes.body.accessToken).toBeDefined();

    // Replaying the original (now-rotated) cookie must be rejected.
    const reuseRes = await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .set('Cookie', firstRefreshCookie)
      .set('X-CSRF-Token', csrfToken);
    expect(reuseRes.status).toBe(401);
  });

  it('rejects refresh/logout without a matching CSRF header', async () => {
    const agent = request.agent(app.getHttpServer());
    await agent
      .post('/api/v1/auth/login')
      .send({ identifier: ownerUsername, password: ownerPassword });

    const res = await agent.post('/api/v1/auth/refresh'); // no X-CSRF-Token header
    expect(res.status).toBe(403);
  });

  it('logs out and invalidates the session', async () => {
    const agent = request.agent(app.getHttpServer());
    const login = await agent
      .post('/api/v1/auth/login')
      .send({ identifier: ownerUsername, password: ownerPassword });

    const logoutRes = await agent
      .post('/api/v1/auth/logout')
      .set('X-CSRF-Token', login.body.csrfToken);
    expect(logoutRes.status).toBe(200);

    const refreshRes = await agent
      .post('/api/v1/auth/refresh')
      .set('X-CSRF-Token', login.body.csrfToken);
    expect(refreshRes.status).toBe(401);
  });

  it('locks the account after repeated failed logins', async () => {
    const username = 'e2e-lockout';
    const hash = await bcrypt.hash('CorrectPass123!', 4);
    await prisma.user.create({
      data: { username, firstName: 'Lock', lastName: 'Out', passwordHash: hash, status: 'ACTIVE' },
    });

    // MAX_FAILED_LOGIN_ATTEMPTS=3 in .env.test
    for (let i = 0; i < 3; i++) {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ identifier: username, password: 'wrong' });
      expect(res.status).toBe(401);
    }

    const lockedRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ identifier: username, password: 'CorrectPass123!' });
    expect(lockedRes.status).toBe(403);
  });

  it('an admin-LOCKED status also blocks login regardless of the temporary lock timer', async () => {
    const username = 'e2e-admin-locked';
    const hash = await bcrypt.hash('CorrectPass123!', 4);
    await prisma.user.create({
      data: {
        username,
        firstName: 'Admin',
        lastName: 'Locked',
        passwordHash: hash,
        status: 'LOCKED',
      },
    });

    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ identifier: username, password: 'CorrectPass123!' });
    expect(res.status).toBe(403);
  });

  it('completes a password reset end to end without revealing account existence', async () => {
    const username = 'e2e-reset';
    const hash = await bcrypt.hash('OldPass123!', 4);
    await prisma.user.create({
      data: { username, firstName: 'Reset', lastName: 'Me', passwordHash: hash, status: 'ACTIVE' },
    });

    const unknownRes = await request(app.getHttpServer())
      .post('/api/v1/auth/password-reset/request')
      .send({ identifier: 'no-such-user' });
    expect(unknownRes.status).toBe(200);
    expect(unknownRes.body.requested).toBe(true);

    const requestRes = await request(app.getHttpServer())
      .post('/api/v1/auth/password-reset/request')
      .send({ identifier: username });
    expect(requestRes.status).toBe(200);
    expect(requestRes.body.devToken).toBeDefined();

    const confirmRes = await request(app.getHttpServer())
      .post('/api/v1/auth/password-reset/confirm')
      .send({ token: requestRes.body.devToken, newPassword: 'NewPass123!' });
    expect(confirmRes.status).toBe(200);

    const oldLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ identifier: username, password: 'OldPass123!' });
    expect(oldLogin.status).toBe(401);

    const newLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ identifier: username, password: 'NewPass123!' });
    expect(newLogin.status).toBe(200);
  });

  it('rejects a weak new password on reset', async () => {
    const username = 'e2e-weakpw';
    const hash = await bcrypt.hash('OldPass123!', 4);
    await prisma.user.create({
      data: { username, firstName: 'Weak', lastName: 'Pw', passwordHash: hash, status: 'ACTIVE' },
    });
    const requestRes = await request(app.getHttpServer())
      .post('/api/v1/auth/password-reset/request')
      .send({ identifier: username });

    const confirmRes = await request(app.getHttpServer())
      .post('/api/v1/auth/password-reset/confirm')
      .send({ token: requestRes.body.devToken, newPassword: 'weak' });
    expect(confirmRes.status).toBe(400);
  });

  it('records audit log entries (with result) and exposes them to permitted users', async () => {
    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ identifier: ownerUsername, password: ownerPassword });
    const token = login.body.accessToken;

    const auditRes = await request(app.getHttpServer())
      .get('/api/v1/audit-logs?take=50')
      .set('Authorization', `Bearer ${token}`);

    expect(auditRes.status).toBe(200);
    expect(auditRes.body.total).toBeGreaterThan(0);
    const successEntry = auditRes.body.items.find(
      (i: { action: string; result: string }) => i.action === 'auth.login.success',
    );
    expect(successEntry.result).toBe('SUCCESS');
    const failureEntry = auditRes.body.items.find(
      (i: { action: string; result: string }) => i.action === 'auth.login.failure',
    );
    expect(failureEntry.result).toBe('FAILURE');
  });

  it('completes an MFA enroll → login-requires-code → disable cycle', async () => {
    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ identifier: ownerUsername, password: ownerPassword });
    const token = login.body.accessToken;

    const enroll = await request(app.getHttpServer())
      .post('/api/v1/auth/mfa/enroll')
      .set('Authorization', `Bearer ${token}`);
    expect(enroll.status).toBe(200);
    expect(enroll.body.qrCodeDataUrl).toMatch(/^data:image/);

    const code = authenticator.generate(enroll.body.secret);
    const confirm = await request(app.getHttpServer())
      .post('/api/v1/auth/mfa/enroll/confirm')
      .set('Authorization', `Bearer ${token}`)
      .send({ code });
    expect(confirm.status).toBe(200);

    const loginNoCode = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ identifier: ownerUsername, password: ownerPassword });
    expect(loginNoCode.body).toEqual({ mfaRequired: true });

    const loginWithCode = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        identifier: ownerUsername,
        password: ownerPassword,
        totpCode: authenticator.generate(enroll.body.secret),
      });
    expect(loginWithCode.status).toBe(200);
    const newToken = loginWithCode.body.accessToken;

    const disable = await request(app.getHttpServer())
      .post('/api/v1/auth/mfa/disable')
      .set('Authorization', `Bearer ${newToken}`)
      .send({ code: authenticator.generate(enroll.body.secret) });
    expect(disable.status).toBe(200);
  });
});
