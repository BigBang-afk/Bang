import { NavLink } from "react-router-dom";
import { useAuthStore, isStaffRole } from "../../store/authStore";
import { Logo } from "./Logo";

const userLinks = [
  { to: "/app/dashboard", label: "Dashboard", icon: "📊" },
  { to: "/app/signals/live", label: "Live Signals", icon: "⚡" },
  { to: "/app/signals/upcoming", label: "Upcoming Signals", icon: "⏱" },
  { to: "/app/signals/history", label: "Signal History", icon: "🕘" },
  { to: "/app/analytics/performance", label: "Performance Analytics", icon: "📈" },
  { to: "/app/analytics/strategy", label: "Strategy Performance", icon: "🧠" },
  { to: "/app/analytics/pairs", label: "Pair Performance", icon: "🔀" },
  { to: "/app/notifications", label: "Notifications", icon: "🔔" },
  { to: "/app/subscription", label: "Subscription", icon: "💳" },
  { to: "/app/support", label: "Support Tickets", icon: "🎫" },
  { to: "/app/profile", label: "Profile", icon: "👤" },
  { to: "/app/security", label: "Security Settings", icon: "🔒" },
];

const adminLinks = [
  { to: "/admin", label: "Admin Dashboard", icon: "🛠" },
  { to: "/admin/users", label: "User Management", icon: "👥" },
  { to: "/admin/subscriptions", label: "Subscriptions", icon: "💳" },
  { to: "/admin/payments", label: "Payments", icon: "🧾" },
  { to: "/admin/pairs", label: "Market Pairs", icon: "🔀" },
  { to: "/admin/sessions", label: "Trading Sessions", icon: "🕒" },
  { to: "/admin/strategies", label: "Strategies", icon: "🧠" },
  { to: "/admin/signals", label: "Signal Monitoring", icon: "⚡" },
  { to: "/admin/backtesting", label: "Backtesting", icon: "🧪" },
  { to: "/admin/data-provider", label: "Data Provider", icon: "🛰" },
  { to: "/admin/data-health", label: "Data Health", icon: "💓" },
  { to: "/admin/reports", label: "Performance Reports", icon: "📑" },
  { to: "/admin/audit-logs", label: "Audit Logs", icon: "📜" },
  { to: "/admin/support", label: "Support Tickets", icon: "🎫" },
  { to: "/admin/announcements", label: "Announcements", icon: "📢" },
  { to: "/admin/settings", label: "Site Settings", icon: "⚙️" },
];

export function AppSidebar({ mode }: { mode: "app" | "admin" }) {
  const roles = useAuthStore((s) => s.roles);
  const links = mode === "admin" ? adminLinks : userLinks;

  return (
    <aside className="hidden lg:flex lg:flex-col w-64 shrink-0 border-r border-white/10 bg-navy-900/60 min-h-screen sticky top-0">
      <div className="h-16 flex items-center px-5 border-b border-white/10">
        <Logo />
      </div>
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {links.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            end={l.to === "/admin" || l.to === "/app/dashboard"}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
                isActive ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/30" : "text-slate-300 hover:bg-white/5"
              }`
            }
          >
            <span aria-hidden>{l.icon}</span>
            {l.label}
          </NavLink>
        ))}
      </nav>
      {mode === "app" && isStaffRole(roles) && (
        <div className="p-3 border-t border-white/10">
          <NavLink to="/admin" className="btn-secondary w-full">Admin Panel</NavLink>
        </div>
      )}
    </aside>
  );
}

export function MobileNav({ mode }: { mode: "app" | "admin" }) {
  const links = mode === "admin" ? adminLinks : userLinks;
  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-navy-900/95 border-t border-white/10 backdrop-blur-md overflow-x-auto">
      <div className="flex px-2 py-2 gap-1 min-w-max">
        {links.slice(0, 6).map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            end={l.to === "/admin" || l.to === "/app/dashboard"}
            className={({ isActive }) => `flex flex-col items-center px-3 py-1.5 rounded-lg text-[11px] ${isActive ? "text-cyan-400" : "text-slate-400"}`}
          >
            <span className="text-lg">{l.icon}</span>
            {l.label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
