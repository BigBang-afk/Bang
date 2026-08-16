import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionsGuard } from './permissions.guard';

function makeContext(user: unknown): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as ExecutionContext;
}

describe('PermissionsGuard', () => {
  it('allows the request when no permissions are required', () => {
    const reflector = { getAllAndOverride: () => undefined } as unknown as Reflector;
    const guard = new PermissionsGuard(reflector);
    expect(guard.canActivate(makeContext({ permissions: [] }))).toBe(true);
  });

  it('allows the request when the user has every required permission', () => {
    const reflector = {
      getAllAndOverride: () => ['users.read', 'users.create'],
    } as unknown as Reflector;
    const guard = new PermissionsGuard(reflector);
    const ctx = makeContext({ permissions: ['users.read', 'users.create', 'roles.read'] });
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('rejects the request when a required permission is missing', () => {
    const reflector = {
      getAllAndOverride: () => ['users.create'],
    } as unknown as Reflector;
    const guard = new PermissionsGuard(reflector);
    const ctx = makeContext({ permissions: ['users.read'] });
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('rejects the request when there is no authenticated user', () => {
    const reflector = {
      getAllAndOverride: () => ['users.read'],
    } as unknown as Reflector;
    const guard = new PermissionsGuard(reflector);
    expect(() => guard.canActivate(makeContext(undefined))).toThrow(ForbiddenException);
  });
});
