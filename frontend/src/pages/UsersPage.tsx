import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { AppShell } from '../components/AppShell';
import { useAuth } from '../auth/AuthContext';
import { ApiError, apiJson } from '../api/client';
import type { AppUser, AuditLogEntry, Branch, BranchAccessType, Permission, Role } from '../api/types';

type Tab = 'users' | 'roles' | 'audit';
const AUDIT_PAGE_SIZE = 25;

export function UsersPage() {
  const { hasPermission } = useAuth();
  const [tab, setTab] = useState<Tab>('users');

  const [users, setUsers] = useState<AppUser[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [auditItems, setAuditItems] = useState<AuditLogEntry[]>([]);
  const [auditTotal, setAuditTotal] = useState(0);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [userModalOpen, setUserModalOpen] = useState(false);
  const [roleModalRole, setRoleModalRole] = useState<Role | 'new' | null>(null);

  const canReadUsers = hasPermission('users.read');
  const canReadAudit = hasPermission('audit.read');

  const loadUsers = () => apiJson<AppUser[]>('/users').then(setUsers);
  const loadRoles = () => apiJson<Role[]>('/roles').then(setRoles);
  const loadBranches = () => apiJson<Branch[]>('/branches').then(setBranches);
  const loadPermissions = () =>
    hasPermission('permissions.read')
      ? apiJson<Permission[]>('/permissions').then(setPermissions)
      : Promise.resolve();
  const loadAudit = (skip: number) =>
    apiJson<{ items: AuditLogEntry[]; total: number }>(`/audit-logs?skip=${skip}&take=${AUDIT_PAGE_SIZE}`).then(
      (data) => {
        setAuditItems((prev) => (skip === 0 ? data.items : [...prev, ...data.items]));
        setAuditTotal(data.total);
      },
    );

  useEffect(() => {
    loadRoles().catch(() => {});
    loadBranches().catch(() => {});
    loadPermissions().catch(() => {});
    if (canReadUsers) loadUsers().catch(() => {});
    if (canReadAudit) loadAudit(0).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const flash = (ok: boolean, message: string) => {
    setError(ok ? '' : message);
    setSuccess(ok ? message : '');
  };

  const handleDisable = async (id: string) => {
    if (!confirm('Disable this user? They will be signed out everywhere.')) return;
    try {
      await apiJson(`/users/${id}/disable`, { method: 'POST' });
      flash(true, 'User disabled.');
      await loadUsers();
    } catch (err) {
      flash(false, err instanceof ApiError ? err.message : 'Something went wrong.');
    }
  };

  const handleDeleteRole = async (id: string) => {
    if (!confirm('Delete this role?')) return;
    try {
      await apiJson(`/roles/${id}`, { method: 'DELETE' });
      flash(true, 'Role deleted.');
      await loadRoles();
    } catch (err) {
      flash(false, err instanceof ApiError ? err.message : 'Something went wrong.');
    }
  };

  if (!canReadUsers) {
    return (
      <AppShell>
        <div className="panel">You do not have permission to view this page.</div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="section-title">
        <h2>Users &amp; Roles</h2>
      </div>

      <div className="tabs">
        <button className={`tab ${tab === 'users' ? 'active' : ''}`} onClick={() => setTab('users')}>
          Users
        </button>
        <button className={`tab ${tab === 'roles' ? 'active' : ''}`} onClick={() => setTab('roles')}>
          Roles
        </button>
        {canReadAudit && (
          <button className={`tab ${tab === 'audit' ? 'active' : ''}`} onClick={() => setTab('audit')}>
            Audit Log
          </button>
        )}
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {tab === 'users' && (
        <>
          <div className="section-title">
            <h3 style={{ fontSize: '1.05rem' }} className="text-muted">
              All users
            </h3>
            {hasPermission('users.create') && (
              <button className="btn btn-primary" style={{ width: 'auto' }} onClick={() => setUserModalOpen(true)}>
                + Add user
              </button>
            )}
          </div>
          <div className="panel table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Identifier</th>
                  <th>Roles</th>
                  <th>Branch access</th>
                  <th>Status</th>
                  <th>Last login</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td>
                      {u.firstName} {u.lastName}
                      {u.employeeCode && <span className="text-muted"> ({u.employeeCode})</span>}
                    </td>
                    <td>{u.username ?? u.email ?? u.phone ?? '—'}</td>
                    <td>{u.roles.map((r) => r.role.name).join(', ') || '—'}</td>
                    <td>{u.branchAccessType}</td>
                    <td>
                      {u.status === 'ACTIVE' && <span className="badge badge-success">Active</span>}
                      {u.status === 'LOCKED' && <span className="badge badge-danger">Locked</span>}
                      {u.status === 'INACTIVE' && <span className="badge">Inactive</span>}
                    </td>
                    <td>{u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString() : '—'}</td>
                    <td>
                      {hasPermission('users.disable') && u.status === 'ACTIVE' && (
                        <button className="btn btn-danger btn-sm" onClick={() => handleDisable(u.id)}>
                          Disable
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === 'roles' && (
        <>
          <div className="section-title">
            <h3 style={{ fontSize: '1.05rem' }} className="text-muted">
              All roles
            </h3>
            {hasPermission('roles.manage') && (
              <button className="btn btn-primary" style={{ width: 'auto' }} onClick={() => setRoleModalRole('new')}>
                + Add role
              </button>
            )}
          </div>
          <div className="panel table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Description</th>
                  <th>Permissions</th>
                  <th>Type</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {roles.map((r) => (
                  <tr key={r.id}>
                    <td>{r.name}</td>
                    <td className="text-muted">{r.description ?? '—'}</td>
                    <td>{r.permissions.length}</td>
                    <td>
                      {r.isSystem ? (
                        <span className="badge badge-gold">System</span>
                      ) : (
                        <span className="badge">Custom</span>
                      )}
                    </td>
                    <td>
                      {hasPermission('roles.manage') && (
                        <>
                          <button
                            className="btn btn-secondary btn-sm"
                            style={{ marginRight: '0.5rem' }}
                            onClick={() => setRoleModalRole(r)}
                          >
                            Edit
                          </button>
                          {!r.isSystem && (
                            <button className="btn btn-danger btn-sm" onClick={() => handleDeleteRole(r.id)}>
                              Delete
                            </button>
                          )}
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === 'audit' && canReadAudit && (
        <div className="panel table-scroll">
          <table>
            <thead>
              <tr>
                <th>Time</th>
                <th>Actor</th>
                <th>Action</th>
                <th>Result</th>
                <th>Entity</th>
                <th>IP</th>
              </tr>
            </thead>
            <tbody>
              {auditItems.map((log) => (
                <tr key={log.id}>
                  <td>{new Date(log.createdAt).toLocaleString()}</td>
                  <td>{log.actor ? `${log.actor.firstName} ${log.actor.lastName}` : 'system'}</td>
                  <td>{log.action}</td>
                  <td>
                    {log.result === 'SUCCESS' ? (
                      <span className="badge badge-success">Success</span>
                    ) : (
                      <span className="badge badge-danger">Failure</span>
                    )}
                  </td>
                  <td>{log.entityType ? `${log.entityType} ${log.entityId?.slice(0, 8) ?? ''}` : '—'}</td>
                  <td className="text-muted">{log.ipAddress ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {auditItems.length < auditTotal && (
            <div style={{ textAlign: 'center', marginTop: '1rem' }}>
              <button className="btn btn-secondary btn-sm" onClick={() => loadAudit(auditItems.length)}>
                Load more
              </button>
            </div>
          )}
        </div>
      )}

      {userModalOpen && (
        <UserFormModal
          roles={roles}
          branches={branches}
          onClose={() => setUserModalOpen(false)}
          onSaved={async () => {
            setUserModalOpen(false);
            flash(true, 'User created.');
            await loadUsers();
          }}
          onError={(msg) => flash(false, msg)}
        />
      )}

      {roleModalRole && (
        <RoleFormModal
          role={roleModalRole === 'new' ? null : roleModalRole}
          permissions={permissions}
          onClose={() => setRoleModalRole(null)}
          onSaved={async () => {
            setRoleModalRole(null);
            flash(true, 'Role saved.');
            await loadRoles();
          }}
          onError={(msg) => flash(false, msg)}
        />
      )}
    </AppShell>
  );
}

function UserFormModal({
  roles,
  branches,
  onClose,
  onSaved,
  onError,
}: {
  roles: Role[];
  branches: Branch[];
  onClose: () => void;
  onSaved: () => void;
  onError: (message: string) => void;
}) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [employeeCode, setEmployeeCode] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [temporaryPassword, setTemporaryPassword] = useState('');
  const [roleIds, setRoleIds] = useState<string[]>([]);
  const [branchAccessType, setBranchAccessType] = useState<BranchAccessType>('SINGLE');
  const [branchIds, setBranchIds] = useState<string[]>([]);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const toggle = (list: string[], setList: (v: string[]) => void, id: string) => {
    setList(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);
    try {
      await apiJson('/users', {
        method: 'POST',
        body: {
          firstName,
          lastName,
          employeeCode: employeeCode || undefined,
          username: username || undefined,
          email: email || undefined,
          phone: phone || undefined,
          temporaryPassword,
          roleIds,
          branchAccessType,
          branchIds: branchAccessType === 'ALL' ? [] : branchIds,
        },
      });
      onSaved();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Something went wrong.';
      setFormError(message);
      onError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="card card-wide">
        <h3 style={{ marginBottom: '1.25rem' }}>Add user</h3>
        {formError && <div className="alert alert-error">{formError}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="field">
              <label htmlFor="firstName">First name</label>
              <input id="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
            </div>
            <div className="field">
              <label htmlFor="lastName">Last name</label>
              <input id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
            </div>
            <div className="field">
              <label htmlFor="employeeCode">Employee code</label>
              <input id="employeeCode" value={employeeCode} onChange={(e) => setEmployeeCode(e.target.value)} />
            </div>
          </div>
          <div className="form-row">
            <div className="field">
              <label htmlFor="username">Username</label>
              <input id="username" value={username} onChange={(e) => setUsername(e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="email">Email</label>
              <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="phone">Phone</label>
              <input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
          </div>
          <div className="field">
            <label htmlFor="temporaryPassword">Temporary password</label>
            <input
              id="temporaryPassword"
              value={temporaryPassword}
              onChange={(e) => setTemporaryPassword(e.target.value)}
              minLength={8}
              required
            />
          </div>
          <div className="field">
            <label>Roles</label>
            <div className="checkbox-list">
              {roles.map((r) => (
                <label key={r.id}>
                  <input
                    type="checkbox"
                    checked={roleIds.includes(r.id)}
                    onChange={() => toggle(roleIds, setRoleIds, r.id)}
                  />
                  {r.name}
                </label>
              ))}
            </div>
          </div>
          <div className="form-row">
            <div className="field">
              <label htmlFor="branchAccessType">Branch access</label>
              <select
                id="branchAccessType"
                value={branchAccessType}
                onChange={(e) => setBranchAccessType(e.target.value as BranchAccessType)}
              >
                <option value="SINGLE">Single branch</option>
                <option value="MULTIPLE">Multiple branches</option>
                <option value="ALL">All branches</option>
              </select>
            </div>
          </div>
          {branchAccessType !== 'ALL' && (
            <div className="field">
              <label>Branches</label>
              <div className="checkbox-list">
                {branches.map((b) => (
                  <label key={b.id}>
                    <input
                      type="checkbox"
                      checked={branchIds.includes(b.id)}
                      onChange={() => toggle(branchIds, setBranchIds, b.id)}
                    />
                    {b.name} ({b.code})
                  </label>
                ))}
              </div>
            </div>
          )}
          <div className="form-row" style={{ marginTop: '1.5rem' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose} style={{ flex: 1 }}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={submitting}>
              Save user
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function RoleFormModal({
  role,
  permissions,
  onClose,
  onSaved,
  onError,
}: {
  role: Role | null;
  permissions: Permission[];
  onClose: () => void;
  onSaved: () => void;
  onError: (message: string) => void;
}) {
  const [name, setName] = useState(role?.name ?? '');
  const [description, setDescription] = useState(role?.description ?? '');
  const [permissionIds, setPermissionIds] = useState<string[]>(
    role?.permissions.map((rp) => rp.permission.id) ?? [],
  );
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const toggle = (id: string) => {
    setPermissionIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);
    try {
      if (role) {
        await apiJson(`/roles/${role.id}`, {
          method: 'PATCH',
          body: { name, description, permissionIds },
        });
      } else {
        await apiJson('/roles', { method: 'POST', body: { name, description, permissionIds } });
      }
      onSaved();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Something went wrong.';
      setFormError(message);
      onError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="card card-wide">
        <h3 style={{ marginBottom: '1.25rem' }}>{role ? 'Edit role' : 'Add role'}</h3>
        {formError && <div className="alert alert-error">{formError}</div>}
        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="roleName">Name</label>
            <input id="roleName" value={name} onChange={(e) => setName(e.target.value)} required disabled={role?.isSystem} />
          </div>
          <div className="field">
            <label htmlFor="roleDescription">Description</label>
            <input id="roleDescription" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="field">
            <label>Permissions{role?.isSystem ? ' (locked for system roles)' : ''}</label>
            <div className="checkbox-list">
              {permissions.map((p) => (
                <label key={p.id}>
                  <input
                    type="checkbox"
                    checked={permissionIds.includes(p.id)}
                    onChange={() => toggle(p.id)}
                    disabled={role?.isSystem}
                  />
                  {p.code}
                </label>
              ))}
            </div>
          </div>
          <div className="form-row" style={{ marginTop: '1.5rem' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose} style={{ flex: 1 }}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={submitting}>
              Save role
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
