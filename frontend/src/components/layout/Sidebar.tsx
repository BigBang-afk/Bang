"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/dashboard/live", label: "Live Signals" },
  { href: "/dashboard/strategies", label: "Strategies" },
  { href: "/dashboard/history", label: "History" },
  { href: "/dashboard/statistics", label: "Analytics" },
  { href: "/dashboard/backtests", label: "Backtesting" },
  { href: "/dashboard/profile", label: "Profile" },
];

export function Sidebar(): React.ReactElement {
  const pathname = usePathname();
  return (
    <nav className="hidden w-56 shrink-0 flex-col gap-1 border-r border-terminal-border p-4 md:flex">
      {LINKS.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className={cn(
            "rounded-md px-3 py-2 text-sm font-medium text-gray-400 hover:bg-white/5 hover:text-gray-100",
            pathname === link.href && "bg-terminal-accent/10 text-terminal-accent"
          )}
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
