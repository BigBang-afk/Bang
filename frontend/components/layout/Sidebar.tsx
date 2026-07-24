"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: "◈" },
  { href: "/scanner", label: "Market Scanner", icon: "◎" },
  { href: "/signals", label: "AI Signals", icon: "◆" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 shrink-0 h-screen sticky top-0 bg-obsidian border-r border-graphite flex flex-col">
      <div className="px-6 py-6 border-b border-graphite">
        <span className="text-xl font-bold tracking-tight text-gold">AURUM</span>
        <span className="block text-xs text-gray-400 tracking-widest">SIGNAL PLATFORM</span>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV_ITEMS.map((item) => {
          const active = pathname?.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                active
                  ? "bg-gold/10 text-gold border border-gold/30"
                  : "text-gray-300 hover:bg-charcoal hover:text-white"
              )}
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="px-4 py-4 border-t border-graphite text-xs text-gray-500">
        Not financial advice. Trade at your own risk.
      </div>
    </aside>
  );
}
