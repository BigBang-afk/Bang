"use client";

import { useMemo, useRef, useState } from "react";
import { Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { MarketAssetRow } from "@/types/database";
import { isMarketSupportedClient } from "@/lib/market-data/supported-markets";

export function SymbolSearch({
  assets,
  value,
  onSelect,
}: {
  assets: MarketAssetRow[];
  value: string;
  onSelect: (symbol: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = !q
      ? assets
      : assets.filter(
          (a) =>
            a.symbol.toLowerCase().includes(q) || a.display_name.toLowerCase().includes(q)
        );
    return list.slice(0, 20);
  }, [assets, query]);

  const current = assets.find((a) => a.symbol === value);

  return (
    <div className="relative" ref={containerRef}>
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="w-56 pl-8"
          placeholder={current ? current.symbol : "Search symbol…"}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
        />
      </div>

      {open && (
        <div className="absolute z-20 mt-1 max-h-72 w-72 overflow-y-auto rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-md ring-1 ring-foreground/10">
          {results.length === 0 ? (
            <p className="px-2 py-3 text-sm text-muted-foreground">No matches.</p>
          ) : (
            results.map((asset) => {
              const supported = isMarketSupportedClient(asset.market_type);
              return (
                <button
                  key={asset.id}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    onSelect(asset.symbol);
                    setQuery("");
                    setOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent hover:text-accent-foreground",
                    asset.symbol === value && "bg-accent/60"
                  )}
                >
                  <span>
                    <span className="font-medium">{asset.symbol}</span>{" "}
                    <span className="text-muted-foreground">{asset.display_name}</span>
                  </span>
                  {!supported && (
                    <span className="text-[10px] text-muted-foreground">no feed</span>
                  )}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
