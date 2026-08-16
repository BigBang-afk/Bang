import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext';

/**
 * Gates a route on having an authenticated session, and optionally on
 * holding a specific permission. This is a UX convenience only — every
 * protected backend endpoint independently re-checks the permission, so
 * hiding a route here is never the actual security boundary.
 */
export function ProtectedRoute({
  children,
  requirePermission,
}: {
  children: ReactNode;
  requirePermission?: string;
}) {
  const { user, loading, hasPermission } = useAuth();

  if (loading) {
    return <div className="centered-loading">Loading…</div>;
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  if (requirePermission && !hasPermission(requirePermission)) {
    return <Navigate to="/forbidden" replace />;
  }
  return <>{children}</>;
}
