import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "../../store/authStore";
import { useUiStore } from "../../store/uiStore";
import { NotificationsApi } from "../../api/endpoints";

export function AppHeader() {
  const { displayName, email, logout } = useAuthStore();
  const { theme, toggleTheme } = useUiStore();
  const navigate = useNavigate();

  const { data: notifications } = useQuery({
    queryKey: ["notifications", "unread"],
    queryFn: () => NotificationsApi.list(true),
    refetchInterval: 30000,
  });
  const unreadCount = notifications?.length ?? 0;

  return (
    <header className="h-16 border-b border-white/10 bg-navy-950/80 backdrop-blur-md sticky top-0 z-30 flex items-center justify-between px-4 lg:px-6">
      <div className="flex items-center gap-2">
        <span className="badge-neutral hidden sm:inline-flex">DEMO DATA</span>
      </div>
      <div className="flex items-center gap-3">
        <button aria-label="Toggle theme" onClick={toggleTheme} className="btn-secondary !px-3 !py-2 text-sm">
          {theme === "dark" ? "☀️" : "🌙"}
        </button>
        <Link to="/app/notifications" aria-label="Notifications" className="relative btn-secondary !px-3 !py-2 text-sm">
          🔔
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-signal-down text-white text-[10px] rounded-full h-4 w-4 flex items-center justify-center">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Link>
        <div className="hidden sm:block text-right">
          <p className="text-sm text-slate-200 leading-tight">{displayName}</p>
          <p className="text-xs text-slate-500 leading-tight">{email}</p>
        </div>
        <button
          className="btn-secondary text-sm"
          onClick={() => {
            logout();
            navigate("/login");
          }}
        >
          Log out
        </button>
      </div>
    </header>
  );
}
