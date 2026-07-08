"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Dashboard" },
  { href: "/history", label: "Signal History" },
  { href: "/backtest", label: "Backtesting" },
  { href: "/admin", label: "Admin" },
];

export function NavBar() {
  const pathname = usePathname();
  return (
    <header className="border-b border-bg-border bg-bg-panel/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
        <div>
          <div className="text-base font-bold text-white">Quotex OTC Perfect Signal Scanner</div>
          <div className="text-[11px] text-muted">Probability-based CALL/PUT analysis</div>
        </div>
        <nav className="flex gap-1 rounded-lg border border-bg-border bg-bg-card p-1 text-sm">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`rounded-md px-3 py-1.5 font-medium transition ${
                pathname === l.href
                  ? "bg-accent/20 text-white"
                  : "text-muted hover:text-white"
              }`}
            >
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
