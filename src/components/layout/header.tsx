import Link from "next/link";
import { formatUsd, formatPkr } from "@/lib/money";
import { MobileNav } from "@/components/layout/mobile-nav";
import { QuickAddMenu } from "@/components/layout/quick-add-menu";
import { GlobalSearch } from "@/components/layout/global-search";
import { UserCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function Header({
  traderName,
  balance,
  todayPnlUsd,
  usdToPkrRate,
  goldPricePerGramPkr,
}: {
  traderName: string;
  balance: number;
  todayPnlUsd: number;
  usdToPkrRate: number;
  goldPricePerGramPkr: number;
}) {
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <header className="no-print sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-border bg-surface/80 px-4 backdrop-blur md:px-6">
      <MobileNav traderName={traderName} />

      <div className="hidden items-center gap-5 text-xs md:flex">
        <div>
          <span className="text-muted">Balance </span>
          <span className="font-semibold tabular-nums">{formatUsd(balance)}</span>
        </div>
        <div className="h-4 w-px bg-border" />
        <div>
          <span className="text-muted">Today&apos;s P&L </span>
          <span
            className={cn(
              "font-semibold tabular-nums",
              todayPnlUsd > 0 ? "text-positive" : todayPnlUsd < 0 ? "text-negative" : "text-foreground"
            )}
          >
            {formatUsd(todayPnlUsd, { showSign: true })}
          </span>
        </div>
        <div className="h-4 w-px bg-border" />
        <div>
          <span className="text-muted">USD/PKR </span>
          <span className="font-semibold tabular-nums">{usdToPkrRate.toLocaleString()}</span>
        </div>
        <div className="h-4 w-px bg-border" />
        <div>
          <span className="text-muted">24K Gold </span>
          <span className="font-semibold tabular-nums">{formatPkr(goldPricePerGramPkr)}/g</span>
        </div>
      </div>

      <div className="ml-auto flex items-center gap-3">
        <div className="hidden lg:block">
          <GlobalSearch />
        </div>
        <span className="hidden text-xs text-muted xl:inline">{today}</span>
        <QuickAddMenu />
        <Link
          href="/settings"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-2 text-muted hover:text-foreground"
        >
          <UserCircle2 size={20} />
        </Link>
      </div>
    </header>
  );
}
