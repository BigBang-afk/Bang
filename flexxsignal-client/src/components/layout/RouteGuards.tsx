import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuthStore, isStaffRole } from "../../store/authStore";

export function RequireAuth() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const location = useLocation();
  if (!isAuthenticated) return <Navigate to="/login" state={{ from: location }} replace />;
  return <Outlet />;
}

export function RequireStaff() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const roles = useAuthStore((s) => s.roles);
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!isStaffRole(roles)) return <Navigate to="/app/dashboard" replace />;
  return <Outlet />;
}

export function RequireSuperAdmin() {
  const roles = useAuthStore((s) => s.roles);
  if (!roles.includes("SuperAdmin")) return <Navigate to="/admin" replace />;
  return <Outlet />;
}
