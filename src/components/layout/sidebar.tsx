"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Target,
  PlusCircle,
  ListOrdered,
  BookOpen,
  CalendarDays,
  Layers,
  LineChart,
  ShieldAlert,
  Calculator,
  Wallet,
  PieChart,
  Coins,
  Landmark,
  Receipt,
  Trophy,
  FileText,
  Settings,
  LogOut,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { logoutAction } from "@/lib/actions/auth";

export const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/daily-plan", label: "Today's Plan", icon: Target },
  { href: "/trades/new", label: "Add Trade", icon: PlusCircle },
  { href: "/trades", label: "Trades", icon: ListOrdered },
  { href: "/journal", label: "Trading Journal", icon: BookOpen },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/strategies", label: "Strategies", icon: Layers },
  { href: "/analytics", label: "Analytics", icon: LineChart },
  { href: "/risk", label: "Risk Management", icon: ShieldAlert },
  { href: "/risk-calculator", label: "Risk Calculator", icon: Calculator },
  { href: "/withdrawals", label: "Withdrawals", icon: Wallet },
  { href: "/allocation", label: "Profit Allocation", icon: PieChart },
  { href: "/gold", label: "Gold Portfolio", icon: Coins },
  { href: "/wealth", label: "Wealth", icon: Landmark },
  { href: "/expenses", label: "Expenses", icon: Receipt },
  { href: "/goals", label: "Goals", icon: Trophy },
  { href: "/reports", label: "Reports", icon: FileText },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar({ traderName }: { traderName: string }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        "no-print sticky top-0 hidden h-screen shrink-0 flex-col border-r border-border bg-surface transition-all duration-200 md:flex",
        collapsed ? "w-[76px]" : "w-64"
      )}
    >
      <div className="flex h-16 items-center gap-2 border-b border-border px-4">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-gold to-accent text-sm font-bold text-black">
          B
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">Bang</p>
            <p className="truncate text-[11px] text-muted">{traderName}</p>
          </div>
        )}
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 py-3">
        {navItems.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-accent-bg text-accent"
                  : "text-muted hover:bg-surface-hover hover:text-foreground"
              )}
            >
              <Icon size={18} className="shrink-0" />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border p-2">
        <form action={logoutAction}>
          <button
            type="submit"
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted hover:bg-negative-bg hover:text-negative"
          >
            <LogOut size={18} />
            {!collapsed && <span>Logout</span>}
          </button>
        </form>
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="mt-1 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted hover:bg-surface-hover hover:text-foreground"
        >
          {collapsed ? <ChevronsRight size={18} /> : <ChevronsLeft size={18} />}
          {!collapsed && <span>Collapse</span>}
        </button>
      </div>
    </aside>
  );
}
