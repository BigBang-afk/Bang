import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { authenticator } from 'otplib';
import { AuthService } from './auth.service';

function buildUser(overrides: Record<string, unknown> = {}) {
  return {
    id: 'user-1',
    email: 'jane@bang.local',
    passwordHash: 'hashed',
    firstName: 'Jane',
    lastName: 'Doe',
    status: 'ACTIVE',
    mfaEnabled: false,
    mfaMethod: 'NONE',
    mfaSecret: null,
    mfaPendingSecret: null,
    failedLoginAttempts: 0,
    lockedUntil: null,
    lastLoginAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    roles: [
      {
        role: {
          name: 'STAFF',
          permissions: [{ permission: { code: 'identity-access.users.read' } }],
        },
      },
    ],
    ...overrides,
  };
}

describe('AuthService.login', () => {
  let prisma: any;
  let config: any;
  let jwtService: any;
  let tokenService: any;
  let audit: any;
  let passwordService: any;
  let usersService: any;
  let service: AuthService;

  beforeEach(() => {
    prisma = {
      user: {
        update: jest.fn().mockResolvedValue({}),
        findUniqueOrThrow: jest.fn(),
      },
    };
    config = {
      jwtAccessSecret: 'secret',
      jwtAccessTtl: '15m',
      maxFailedLoginAttempts: 5,
      lockoutMinutes: 15,
    };
    jwtService = { sign: jest.fn().mockReturnValue('signed.jwt.token') };
    tokenService = {
      issueRefreshToken: jest.fn().mockResolvedValue({ raw: 'raw-refresh', expiresAt: new Date() }),
    };
    audit = { log: jest.fn().mockResolvedValue(undefined) };
    passwordService = { compare: jest.fn() };
    usersService = { findByEmailInternal: jest.fn() };

    service = new AuthService(
      prisma,
      config,
      jwtService,
      tokenService,
      audit,
      passwordService,
      usersService,
    );
  });

  it('rejects login when no user exists for the email', async () => {
    usersService.findByEmailInternal.mockResolvedValue(null);

    await expect(service.login('nobody@bang.local', 'x', undefined, {})).rejects.toThrow(
      UnauthorizedException,
    );
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'auth.login.failure' }),
    );
  });

  it('rejects login for a locked account', async () => {
    usersService.findByEmailInternal.mockResolvedValue(
      buildUser({ lockedUntil: new Date(Date.now() + 60_000) }),
    );

    await expect(service.login('jane@bang.local', 'x', undefined, {})).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('rejects login with the wrong password and records the failed attempt', async () => {
    const user = buildUser();
    usersService.findByEmailInternal.mockResolvedValue(user);
    passwordService.compare.mockResolvedValue(false);
    prisma.user.findUniqueOrThrow.mockResolvedValue(user);

    await expect(service.login('jane@bang.local', 'wrong', undefined, {})).rejects.toThrow(
      UnauthorizedException,
    );
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'user-1' },
        data: expect.objectContaining({ failedLoginAttempts: 1 }),
      }),
    );
  });

  it('locks the account once the failure threshold is reached', async () => {
    const user = buildUser({ failedLoginAttempts: 4 });
    usersService.findByEmailInternal.mockResolvedValue(user);
    passwordService.compare.mockResolvedValue(false);
    prisma.user.findUniqueOrThrow.mockResolvedValue(user);

    await expect(service.login('jane@bang.local', 'wrong', undefined, {})).rejects.toThrow(
      UnauthorizedException,
    );
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ failedLoginAttempts: 5, lockedUntil: expect.any(Date) }),
      }),
    );
  });

  it('logs in successfully with correct credentials and no MFA', async () => {
    const user = buildUser();
    usersService.findByEmailInternal.mockResolvedValue(user);
    passwordService.compare.mockResolvedValue(true);

    const result = await service.login('jane@bang.local', 'correct', undefined, {});

    expect(result.mfaRequired).toBe(false);
    if (!result.mfaRequired) {
      expect(result.accessToken).toBe('signed.jwt.token');
      expect(result.refreshToken).toBe('raw-refresh');
      expect(result.user.permissions).toContain('identity-access.users.read');
    }
    expect(tokenService.issueRefreshToken).toHaveBeenCalledWith('user-1', undefined, undefined);
  });

  it('requires an MFA code when MFA is enabled and none was provided', async () => {
    const secret = authenticator.generateSecret();
    const user = buildUser({ mfaEnabled: true, mfaSecret: secret });
    usersService.findByEmailInternal.mockResolvedValue(user);
    passwordService.compare.mockResolvedValue(true);

    const result = await service.login('jane@bang.local', 'correct', undefined, {});
    expect(result).toEqual({ mfaRequired: true });
  });

  it('rejects an invalid MFA code', async () => {
    const secret = authenticator.generateSecret();
    const user = buildUser({ mfaEnabled: true, mfaSecret: secret });
    usersService.findByEmailInternal.mockResolvedValue(user);
    passwordService.compare.mockResolvedValue(true);
    prisma.user.findUniqueOrThrow.mockResolvedValue(user);

    await expect(service.login('jane@bang.local', 'correct', '000000', {})).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('logs in successfully with a valid MFA code', async () => {
    const secret = authenticator.generateSecret();
    const validCode = authenticator.generate(secret);
    const user = buildUser({ mfaEnabled: true, mfaSecret: secret });
    usersService.findByEmailInternal.mockResolvedValue(user);
    passwordService.compare.mockResolvedValue(true);

    const result = await service.login('jane@bang.local', 'correct', validCode, {});
    expect(result.mfaRequired).toBe(false);
  });
});
