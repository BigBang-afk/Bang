"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

interface SearchResult {
  slug: string; name: string; code: string; image: string; purity: string; weight: string; priceLabel: string; availability: string;
}

export function SearchBox({ initialQuery = "" }: { initialQuery?: string }) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      setResults(data.results ?? []);
      setOpen(true);
    }, 250);
    return () => clearTimeout(debounceRef.current);
  }, [query]);

  return (
    <div className="relative">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setOpen(false);
          router.push(`/search?q=${encodeURIComponent(query)}`);
        }}
        className="flex items-center gap-2 rounded-sm border border-charcoal/20 bg-white px-4 py-3"
      >
        <Search size={18} className="text-charcoal/40" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder="Search by product name, code, category…"
          className="w-full text-sm outline-none"
          autoFocus
        />
      </form>

      {open && results.length > 0 && (
        <div className="absolute z-20 mt-2 w-full rounded-sm border border-charcoal/10 bg-white shadow-xl">
          {results.map((r) => (
            <Link key={r.slug} href={`/products/${r.slug}`} className="flex items-center gap-3 border-b border-charcoal/5 p-3 last:border-0 hover:bg-ivory-dark/50">
              <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-sm bg-ivory-dark">
                <Image src={r.image} alt={r.name} fill className="object-cover" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-charcoal">{r.name}</p>
                <p className="text-xs text-charcoal/50">{r.code} · {r.purity} · {r.weight}g</p>
              </div>
              <p className="shrink-0 text-xs font-medium text-charcoal">{r.priceLabel}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
