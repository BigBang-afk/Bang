"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/dashboard", label: "Home" },
  { href: "/dashboard/live", label: "Signals" },
  { href: "/dashboard/history", label: "History" },
  { href: "/dashboard/profile", label: "Profile" },
];

export function MobileBottomNav(): React.ReactElement {
  const pathname = usePathname();
  return (
    <nav className="glass-panel fixed inset-x-0 bottom-0 z-20 flex items-center justify-around border-t border-terminal-border py-2 md:hidden">
      {LINKS.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className={cn(
            "flex flex-col items-center px-3 py-1 text-[11px] text-gray-400",
            pathname === link.href && "text-terminal-accent"
          )}
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
