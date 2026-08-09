"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";

interface SearchResult {
  type: string;
  id: string;
  title: string;
  subtitle: string;
  href: string;
}

export function GlobalSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  useEffect(() => {
    if (query.trim().length < 2) {
      return;
    }
    const handle = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        const json = await res.json();
        setResults(json.results ?? []);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => clearTimeout(handle);
  }, [query]);

  return (
    <div ref={ref} className="relative w-full max-w-xs">
      <div className="relative">
        <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-2" />
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="Search trades, strategies, notes…"
          className="h-9 w-full rounded-lg border border-border-strong bg-surface-2 pl-8 pr-8 text-sm text-foreground placeholder:text-muted-2 outline-none focus:border-accent focus:ring-1 focus:ring-accent"
        />
        {query && (
          <button
            onClick={() => {
              setQuery("");
              setResults([]);
            }}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-2 hover:text-foreground"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {open && query.trim().length >= 2 && (
        <div className="absolute left-0 top-11 z-50 max-h-96 w-96 overflow-y-auto rounded-xl border border-border bg-surface shadow-2xl animate-fade-in">
          {loading && <p className="px-4 py-3 text-xs text-muted">Searching…</p>}
          {!loading && results.length === 0 && <p className="px-4 py-3 text-xs text-muted">No results for &quot;{query}&quot;</p>}
          {!loading &&
            results.map((r) => (
              <button
                key={`${r.type}-${r.id}`}
                onClick={() => {
                  router.push(r.href);
                  setOpen(false);
                  setQuery("");
                }}
                className="flex w-full items-start justify-between gap-2 px-4 py-2.5 text-left text-sm hover:bg-surface-hover"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{r.title}</p>
                  {r.subtitle && <p className="truncate text-xs text-muted">{r.subtitle}</p>}
                </div>
                <span className="shrink-0 rounded-full bg-surface-2 px-2 py-0.5 text-[10px] text-muted">{r.type}</span>
              </button>
            ))}
        </div>
      )}
    </div>
  );
}
