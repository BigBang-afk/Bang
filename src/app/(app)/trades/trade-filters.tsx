"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Input, Select } from "@/components/ui/input";
import { Search, Download } from "lucide-react";
import { useTransition } from "react";

export function TradeFilters({
  symbols,
  strategies,
}: {
  symbols: string[];
  strategies: { id: string; name: string }[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  function update(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    startTransition(() => router.push(`${pathname}?${params.toString()}`));
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative">
        <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-2" />
        <Input
          defaultValue={searchParams.get("q") ?? ""}
          onChange={(e) => update("q", e.target.value)}
          placeholder="Search symbol, notes…"
          className="w-48 pl-8"
        />
      </div>
      <Select
        defaultValue={searchParams.get("range") ?? ""}
        onChange={(e) => update("range", e.target.value)}
        className="w-36"
      >
        <option value="">All Dates</option>
        <option value="today">Today</option>
        <option value="yesterday">Yesterday</option>
        <option value="week">This Week</option>
        <option value="month">This Month</option>
        <option value="custom">Custom</option>
      </Select>
      {searchParams.get("range") === "custom" && (
        <>
          <Input type="date" defaultValue={searchParams.get("from") ?? ""} onChange={(e) => update("from", e.target.value)} className="w-36" />
          <Input type="date" defaultValue={searchParams.get("to") ?? ""} onChange={(e) => update("to", e.target.value)} className="w-36" />
        </>
      )}
      <Select defaultValue={searchParams.get("symbol") ?? ""} onChange={(e) => update("symbol", e.target.value)} className="w-32">
        <option value="">All Symbols</option>
        {symbols.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </Select>
      <Select defaultValue={searchParams.get("market") ?? ""} onChange={(e) => update("market", e.target.value)} className="w-32">
        <option value="">All Markets</option>
        <option value="FOREX">Forex</option>
        <option value="CRYPTO">Crypto</option>
        <option value="BINARY">Binary</option>
        <option value="STOCKS">Stocks</option>
        <option value="OTHER">Other</option>
      </Select>
      <Select defaultValue={searchParams.get("strategyId") ?? ""} onChange={(e) => update("strategyId", e.target.value)} className="w-36">
        <option value="">All Strategies</option>
        {strategies.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </Select>
      <Select defaultValue={searchParams.get("result") ?? ""} onChange={(e) => update("result", e.target.value)} className="w-32">
        <option value="">All Results</option>
        <option value="WIN">Win</option>
        <option value="LOSS">Loss</option>
        <option value="BREAKEVEN">Breakeven</option>
      </Select>
      <Select defaultValue={searchParams.get("session") ?? ""} onChange={(e) => update("session", e.target.value)} className="w-32">
        <option value="">All Sessions</option>
        <option value="ASIA">Asia</option>
        <option value="LONDON">London</option>
        <option value="NEW_YORK">New York</option>
        <option value="CUSTOM">Custom</option>
      </Select>
      <a
        href={`/api/trades/export?${searchParams.toString()}`}
        className="flex h-10 items-center gap-1.5 rounded-lg border border-border-strong bg-surface-2 px-3 text-sm text-foreground hover:bg-surface-hover"
      >
        <Download size={14} /> Export CSV
      </a>
    </div>
  );
}
