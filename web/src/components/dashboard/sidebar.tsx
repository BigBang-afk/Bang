"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/ui/logo";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  LineChart,
  Star,
  Wallet,
  ShieldCheck,
  Settings,
  Sparkles,
} from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/signals", label: "AI Signals", icon: Sparkles },
  { href: "/dashboard/markets", label: "Markets", icon: LineChart },
  { href: "/dashboard/watchlist", label: "Watchlist", icon: Star },
  { href: "/dashboard/portfolio", label: "Portfolio", icon: Wallet },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

export function Sidebar({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-border-subtle bg-background-elevated lg:flex">
      <div className="flex h-16 items-center border-b border-border-subtle px-6">
        <Link href="/">
          <Logo />
        </Link>
      </div>

      <nav className="flex flex-1 flex-col gap-1 p-4">
        {navItems.map((item) => {
          const active =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-brand-green/10 text-brand-green"
                  : "text-foreground-muted hover:bg-surface hover:text-foreground",
              )}
            >
              <item.icon className="h-4.5 w-4.5" />
              {item.label}
            </Link>
          );
        })}

        {isAdmin && (
          <>
            <div className="my-3 h-px bg-border-subtle" />
            <Link
              href="/admin"
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                pathname.startsWith("/admin")
                  ? "bg-brand-violet/10 text-brand-violet"
                  : "text-foreground-muted hover:bg-surface hover:text-foreground",
              )}
            >
              <ShieldCheck className="h-4.5 w-4.5" />
              Admin Panel
            </Link>
          </>
        )}
      </nav>

      <div className="glass-card m-4 rounded-xl p-4">
        <p className="text-xs font-semibold text-brand-green">Upgrade to Pro</p>
        <p className="mt-1 text-xs text-foreground-muted">
          Unlock live AI signal scoring and unlimited alerts.
        </p>
      </div>
    </aside>
  );
}
