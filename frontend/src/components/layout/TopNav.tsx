"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard" },
  { href: "/markets", label: "Markets" },
  { href: "/scanner", label: "Scanner" },
  { href: "/signals", label: "Signals" },
  { href: "/portfolio", label: "Portfolio" },
  { href: "/assistant", label: "AI Assistant" },
  { href: "/backtesting", label: "Backtesting" },
  { href: "/journal", label: "Journal" },
  { href: "/performance", label: "Performance" },
  { href: "/settings", label: "Settings" },
];

export function TopNav() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-base-700 bg-base-950/90 backdrop-blur">
      <div className="flex items-center gap-6 px-4 h-14">
        <span className="font-bold tracking-tight text-slate-100 text-lg shrink-0">
          BANG<span className="text-accent-brand">.</span>
        </span>
        <nav className="flex items-center gap-1 overflow-x-auto scrollbar-none">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  "px-3 py-1.5 rounded-md text-sm whitespace-nowrap transition-colors",
                  active ? "bg-base-800 text-slate-50" : "text-slate-400 hover:text-slate-100 hover:bg-base-800/60"
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="ml-auto flex items-center gap-2 shrink-0">
          <span className="h-2 w-2 rounded-full bg-accent-buy animate-pulse" />
          <span className="text-xs text-slate-400">Live</span>
        </div>
      </div>
    </header>
  );
}
