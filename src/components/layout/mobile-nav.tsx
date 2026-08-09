"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, LogOut } from "lucide-react";
import { navItems } from "@/components/layout/sidebar";
import { logoutAction } from "@/lib/actions/auth";
import { cn } from "@/lib/utils";

export function MobileNav({ traderName }: { traderName: string }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex h-9 w-9 items-center justify-center rounded-lg text-foreground hover:bg-surface-hover md:hidden"
      >
        <Menu size={20} />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 flex w-72 flex-col bg-surface animate-fade-in">
            <div className="flex h-16 items-center justify-between border-b border-border px-4">
              <div>
                <p className="text-sm font-semibold">Bang</p>
                <p className="text-[11px] text-muted">{traderName}</p>
              </div>
              <button onClick={() => setOpen(false)} className="rounded-md p-1.5 hover:bg-surface-hover">
                <X size={18} />
              </button>
            </div>
            <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 py-3">
              {navItems.map((item) => {
                const active = pathname === item.href || pathname.startsWith(item.href + "/");
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium",
                      active ? "bg-accent-bg text-accent" : "text-muted hover:bg-surface-hover hover:text-foreground"
                    )}
                  >
                    <Icon size={18} />
                    {item.label}
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
                  Logout
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
