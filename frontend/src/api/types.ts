export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'LOCKED';
export type BranchAccessType = 'SINGLE' | 'MULTIPLE' | 'ALL';
export type MfaMethod = 'NONE' | 'TOTP';

export interface Permission {
  id: string;
  code: string;
  module: string;
  description: string | null;
}

export interface Role {
  id: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  permissions: { permission: Permission }[];
}

export interface Branch {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
}

export interface AppUser {
  id: string;
  employeeCode: string | null;
  username: string | null;
  email: string | null;
  phone: string | null;
  firstName: string;
  lastName: string;
  status: UserStatus;
  mfaEnabled: boolean;
  mfaMethod: MfaMethod;
  failedLoginAttempts: number;
  lockedUntil: string | null;
  lastLoginAt: string | null;
  branchAccessType: BranchAccessType;
  createdAt: string;
  updatedAt: string;
  roles: { role: Role }[];
  branches: { branch: Branch }[];
  // Present only on the authenticated session's own user object (login/refresh/me).
  roleNames?: string[];
  permissions?: string[];
}

export interface AuditLogEntry {
  id: string;
  actorUserId: string | null;
  action: string;
  entityType: string | null;
  entityId: string | null;
  result: 'SUCCESS' | 'FAILURE';
  metadata: unknown;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  actor: { id: string; email: string | null; firstName: string; lastName: string } | null;
}
