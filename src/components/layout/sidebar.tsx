"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Gem } from "lucide-react";
import { NAV_ITEMS } from "@/config/nav";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-surface md:flex print:hidden">
      <div className="flex h-16 items-center gap-2.5 border-b border-border px-5">
        <div className="flex size-9 items-center justify-center rounded-md border border-gold-muted/40 bg-gold-soft">
          <Gem className="size-4.5 text-gold" />
        </div>
        <div className="leading-tight">
          <p className="font-display text-sm font-semibold tracking-wide text-foreground">
            ZARGHOON
          </p>
          <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-gold">
            Jewellers
          </p>
        </div>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
        {NAV_ITEMS.map((item) => {
          const isActive =
            pathname === item.href || (item.href !== "/" && pathname?.startsWith(item.href + "/"));
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-gold-soft text-gold"
                  : "text-muted-foreground hover:bg-surface-hover hover:text-foreground",
              )}
            >
              <Icon className="size-4 shrink-0" />
              <span className="flex-1 truncate">{item.label}</span>
              {item.status === "soon" && (
                <span
                  className="size-1.5 shrink-0 rounded-full bg-muted-foreground/50"
                  title="Coming in next phase"
                />
              )}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border px-5 py-4">
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          Zarghoon Jewellers AI Business OS
          <br />
          Phase 1 — Foundation
        </p>
      </div>
    </aside>
  );
}
