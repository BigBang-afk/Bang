import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { authenticator } from 'otplib';
import { AuthService } from './auth.service';

function buildUser(overrides: Record<string, unknown> = {}) {
  return {
    id: 'user-1',
    employeeCode: 'ZJ-0002',
    username: 'jane',
    email: 'jane@zarghoon.local',
    phone: null,
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
    branchAccessType: 'SINGLE',
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: null,
    updatedBy: null,
    roles: [
      {
        role: {
          name: 'CASHIER',
          permissions: [{ permission: { code: 'sales.read' } }],
        },
      },
    ],
    branches: [],
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
    usersService = { findByIdentifierInternal: jest.fn() };

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

  it('rejects login when no user exists for the identifier', async () => {
    usersService.findByIdentifierInternal.mockResolvedValue(null);

    await expect(service.login('nobody', 'x', undefined, {})).rejects.toThrow(
      UnauthorizedException,
    );
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'auth.login.failure', result: 'FAILURE' }),
    );
  });

  it('rejects login for an account with an active temporary lock', async () => {
    usersService.findByIdentifierInternal.mockResolvedValue(
      buildUser({ lockedUntil: new Date(Date.now() + 60_000) }),
    );

    await expect(service.login('jane', 'x', undefined, {})).rejects.toThrow(ForbiddenException);
  });

  it('rejects login for an account with status LOCKED', async () => {
    usersService.findByIdentifierInternal.mockResolvedValue(buildUser({ status: 'LOCKED' }));

    await expect(service.login('jane', 'x', undefined, {})).rejects.toThrow(ForbiddenException);
  });

  it('rejects login for an inactive account', async () => {
    usersService.findByIdentifierInternal.mockResolvedValue(buildUser({ status: 'INACTIVE' }));

    await expect(service.login('jane', 'x', undefined, {})).rejects.toThrow(ForbiddenException);
  });

  it('rejects login with the wrong password and records the failed attempt', async () => {
    const user = buildUser();
    usersService.findByIdentifierInternal.mockResolvedValue(user);
    passwordService.compare.mockResolvedValue(false);
    prisma.user.findUniqueOrThrow.mockResolvedValue(user);

    await expect(service.login('jane', 'wrong', undefined, {})).rejects.toThrow(
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
    usersService.findByIdentifierInternal.mockResolvedValue(user);
    passwordService.compare.mockResolvedValue(false);
    prisma.user.findUniqueOrThrow.mockResolvedValue(user);

    await expect(service.login('jane', 'wrong', undefined, {})).rejects.toThrow(
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
    usersService.findByIdentifierInternal.mockResolvedValue(user);
    passwordService.compare.mockResolvedValue(true);

    const result = await service.login('jane', 'correct', undefined, {});

    expect(result.mfaRequired).toBe(false);
    if (!result.mfaRequired) {
      expect(result.accessToken).toBe('signed.jwt.token');
      expect(result.refreshToken).toBe('raw-refresh');
      expect(result.user.permissions).toContain('sales.read');
      expect(result.user).not.toHaveProperty('passwordHash');
    }
    expect(tokenService.issueRefreshToken).toHaveBeenCalledWith('user-1', undefined, undefined);
  });

  it('requires an MFA code when MFA is enabled and none was provided', async () => {
    const secret = authenticator.generateSecret();
    const user = buildUser({ mfaEnabled: true, mfaSecret: secret });
    usersService.findByIdentifierInternal.mockResolvedValue(user);
    passwordService.compare.mockResolvedValue(true);

    const result = await service.login('jane', 'correct', undefined, {});
    expect(result).toEqual({ mfaRequired: true });
  });

  it('rejects an invalid MFA code', async () => {
    const secret = authenticator.generateSecret();
    const user = buildUser({ mfaEnabled: true, mfaSecret: secret });
    usersService.findByIdentifierInternal.mockResolvedValue(user);
    passwordService.compare.mockResolvedValue(true);
    prisma.user.findUniqueOrThrow.mockResolvedValue(user);

    await expect(service.login('jane', 'correct', '000000', {})).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('logs in successfully with a valid MFA code', async () => {
    const secret = authenticator.generateSecret();
    const validCode = authenticator.generate(secret);
    const user = buildUser({ mfaEnabled: true, mfaSecret: secret });
    usersService.findByIdentifierInternal.mockResolvedValue(user);
    passwordService.compare.mockResolvedValue(true);

    const result = await service.login('jane', 'correct', validCode, {});
    expect(result.mfaRequired).toBe(false);
  });
});
