import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Flame,
  Receipt,
  PiggyBank,
  Banknote,
  Settings,
  LogOut,
  Coins,
} from "lucide-react";
import Logo from "./Logo";
import { useAuthStore } from "../store/authStore";
import { useGoldRateStore } from "../store/goldRateStore";
import { useSettingsStore } from "../store/settingsStore";
import { formatMoney } from "../lib/format";
import { useState } from "react";
import GoldRateModal from "./GoldRateModal";

const navItems = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/pos", label: "New Sale", icon: ShoppingCart },
  { to: "/inventory", label: "Inventory", icon: Package },
  { to: "/old-gold", label: "Old Gold", icon: Flame },
  { to: "/sales", label: "Sales History", icon: Receipt },
  { to: "/profit", label: "Profit", icon: PiggyBank },
  { to: "/daily-cash", label: "Daily Cash", icon: Banknote },
  { to: "/settings", label: "Settings", icon: Settings },
];

export default function Layout() {
  const navigate = useNavigate();
  const logout = useAuthStore((s) => s.logout);
  const username = useAuthStore((s) => s.username);
  const k21 = useGoldRateStore((s) => s.k21);
  const currency = useSettingsStore((s) => s.currency);
  const shopName = useSettingsStore((s) => s.shopName);
  const [showRateModal, setShowRateModal] = useState(false);

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <div className="flex min-h-svh bg-ink-950 text-[#ece6d9]">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-gold-900/30 bg-ink-900/40 md:flex print:hidden">
        <div className="px-5 py-6">
          <Logo />
        </div>
        <nav className="flex-1 space-y-1 px-3">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                  isActive
                    ? "bg-gold-500/10 text-gold-300 border border-gold-700/40"
                    : "text-[#a89a7d] border border-transparent hover:bg-ink-800/60 hover:text-gold-200"
                }`
              }
            >
              <item.icon size={18} strokeWidth={1.75} />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-gold-900/30 px-4 py-4">
          <button
            onClick={() => setShowRateModal(true)}
            className="mb-3 w-full rounded-lg border border-gold-800/50 bg-ink-800/60 px-3 py-2.5 text-left transition hover:border-gold-600/60"
          >
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-gold-500/70">
              <Coins size={12} /> 21K Rate / gram
            </div>
            <div className="font-serif text-lg font-semibold text-gold-200">
              {formatMoney(k21, currency)}
            </div>
          </button>
          <div className="flex items-center justify-between px-1">
            <div className="text-xs text-ink-500">
              Signed in as <span className="text-[#c9bd9e]">{username}</span>
            </div>
            <button
              onClick={handleLogout}
              title="Log out"
              className="rounded-md p-1.5 text-ink-500 transition hover:bg-ink-800 hover:text-rose-400"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-gold-900/30 bg-ink-900/30 px-4 py-3 md:hidden print:hidden">
          <Logo size={32} />
          <button onClick={handleLogout} className="text-ink-500 hover:text-rose-400">
            <LogOut size={18} />
          </button>
        </header>
        <main className="flex-1 overflow-y-auto print:overflow-visible">
          <Outlet />
        </main>
        <nav className="flex justify-around border-t border-gold-900/30 bg-ink-900/60 py-2 md:hidden print:hidden">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 px-2 py-1 text-[10px] ${
                  isActive ? "text-gold-300" : "text-ink-500"
                }`
              }
            >
              <item.icon size={18} strokeWidth={1.75} />
              {item.label}
            </NavLink>
          ))}
        </nav>
      </div>

      {showRateModal && (
        <GoldRateModal forceOpen onDone={() => setShowRateModal(false)} />
      )}

      <div className="pointer-events-none fixed bottom-3 left-1/2 hidden -translate-x-1/2 text-[10px] tracking-wide text-ink-600 md:block print:hidden">
        {shopName} — Private POS
      </div>
    </div>
  );
}
