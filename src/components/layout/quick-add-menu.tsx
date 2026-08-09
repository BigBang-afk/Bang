"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Plus, TrendingUp, DollarSign, Wallet, Receipt, Coins, Landmark } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { href: "/trades/new", label: "Add Trade", icon: TrendingUp },
  { href: "/profit/new", label: "Add Profit / Loss", icon: DollarSign },
  { href: "/withdrawals/new", label: "Add Withdrawal", icon: Wallet },
  { href: "/expenses/new", label: "Add Expense", icon: Receipt },
  { href: "/gold/new", label: "Buy Gold", icon: Coins },
  { href: "/wealth/deposits/new", label: "Deposit Funds", icon: Landmark },
];

export function QuickAddMenu({ floating = false }: { floating?: boolean }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div
      ref={ref}
      className={cn("relative", floating && "no-print fixed bottom-6 right-6 z-40 md:bottom-8 md:right-8")}
    >
      <button
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex items-center gap-2 rounded-full bg-accent font-medium text-white shadow-lg shadow-accent/30 transition-transform hover:scale-105",
          floating ? "h-14 w-14 justify-center md:h-auto md:w-auto md:px-5 md:py-3.5" : "h-9 px-3 text-sm"
        )}
      >
        <Plus size={floating ? 22 : 16} />
        {floating ? <span className="hidden md:inline">Add</span> : "Add"}
      </button>

      {open && (
        <div
          className={cn(
            "absolute z-50 w-56 overflow-hidden rounded-xl border border-border bg-surface shadow-2xl animate-fade-in",
            floating ? "bottom-16 right-0" : "right-0 top-11"
          )}
        >
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-surface-hover"
              >
                <Icon size={16} className="text-muted" />
                {item.label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
