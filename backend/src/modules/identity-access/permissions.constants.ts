/**
 * Permission codes owned by the identity-access module, namespaced so
 * later modules (product-master, sales-pos, ...) can register their own
 * codes into the same Permission table without collisions.
 */
export const PERMISSIONS = {
  USERS_READ: 'identity-access.users.read',
  USERS_CREATE: 'identity-access.users.create',
  USERS_UPDATE: 'identity-access.users.update',
  USERS_DEACTIVATE: 'identity-access.users.deactivate',
  ROLES_READ: 'identity-access.roles.read',
  ROLES_MANAGE: 'identity-access.roles.manage',
  PERMISSIONS_READ: 'identity-access.permissions.read',
  AUDIT_READ: 'identity-access.audit.read',
} as const;

export type PermissionCode = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const ALL_PERMISSION_CODES: PermissionCode[] = Object.values(PERMISSIONS);
