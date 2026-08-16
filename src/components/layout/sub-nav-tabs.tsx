"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { SubNavItem } from "@/config/nav";

export function SubNavTabs({ items }: { items: SubNavItem[] }) {
  const pathname = usePathname();

  return (
    <div className="border-b border-border px-4 sm:px-6 print:hidden">
      <nav className="-mb-px flex gap-1 overflow-x-auto">
        {items.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/inventory" && pathname?.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "whitespace-nowrap border-b-2 px-3 py-3 text-sm font-medium transition-colors",
                isActive
                  ? "border-gold text-gold"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
