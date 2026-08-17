"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Gem } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { NAV_ITEMS } from "@/config/nav";
import { cn } from "@/lib/utils";

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden"
        onClick={() => setOpen(true)}
        aria-label="Open navigation menu"
      >
        <Menu className="size-5" />
      </Button>
      <DialogContent className="left-0 top-0 h-full max-w-72 translate-x-0 translate-y-0 rounded-none border-r border-l-0 border-y-0 p-0 data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left">
        <DialogTitle className="sr-only">Navigation</DialogTitle>
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
        <nav className="space-y-0.5 px-3 py-4">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
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
                  <span className="size-1.5 shrink-0 rounded-full bg-muted-foreground/50" />
                )}
              </Link>
            );
          })}
        </nav>
      </DialogContent>
    </Dialog>
  );
}
