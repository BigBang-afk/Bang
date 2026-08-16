import { AppShell } from '../components/AppShell';
import { useAuth } from '../auth/AuthContext';

export function DashboardPage() {
  const { user } = useAuth();
  if (!user) return null;

  return (
    <AppShell>
      <div className="section-title">
        <h2>Welcome, {user.firstName}</h2>
      </div>

      <div className="panel">
        <p className="text-muted" style={{ margin: 0 }}>
          Phase 1 delivers <strong style={{ color: 'var(--color-gold-bright)' }}>Identity &amp;
          Access</strong> only — accounts, roles, permissions, branch-access foundation,
          authentication, and audit logging. Product Master, Inventory, POS, Sales, CRM, Gold
          Rates, Finance, Marketing, and the Owner dashboard shown below as a preview are later
          phases.
        </p>
      </div>

      <div className="section-title">
        <h2 style={{ fontSize: '1.1rem' }}>Coming in later phases</h2>
      </div>
      <div className="stat-grid">
        <div className="stat-card">
          <div className="label">Today's Sales</div>
          <div className="value">—</div>
        </div>
        <div className="stat-card">
          <div className="label">Inventory Value</div>
          <div className="value">—</div>
        </div>
        <div className="stat-card">
          <div className="label">Open Work Orders</div>
          <div className="value">—</div>
        </div>
        <div className="stat-card">
          <div className="label">Marketing ROI</div>
          <div className="value">—</div>
        </div>
      </div>

      <div className="panel">
        <h3 style={{ marginBottom: '0.75rem' }}>Your account</h3>
        <table>
          <tbody>
            <tr>
              <td className="text-muted">Employee code</td>
              <td>{user.employeeCode ?? '—'}</td>
            </tr>
            <tr>
              <td className="text-muted">Username / Email / Phone</td>
              <td>{[user.username, user.email, user.phone].filter(Boolean).join(' · ') || '—'}</td>
            </tr>
            <tr>
              <td className="text-muted">Roles</td>
              <td>{(user.roleNames ?? []).join(', ') || '—'}</td>
            </tr>
            <tr>
              <td className="text-muted">Branch access</td>
              <td>{user.branchAccessType}</td>
            </tr>
            <tr>
              <td className="text-muted">Two-factor authentication</td>
              <td>{user.mfaEnabled ? 'Enabled' : 'Not enabled'}</td>
            </tr>
            <tr>
              <td className="text-muted">Last login</td>
              <td>{user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : '—'}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
