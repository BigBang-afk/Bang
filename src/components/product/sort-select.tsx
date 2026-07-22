"use client";

import type { ProductSort } from "@/lib/data/products";

const SORT_OPTIONS: { value: ProductSort; label: string }[] = [
  { value: "newest", label: "Newest First" },
  { value: "oldest", label: "Oldest First" },
  { value: "price_low_high", label: "Price: Low to High" },
  { value: "price_high_low", label: "Price: High to Low" },
  { value: "weight_low_high", label: "Weight: Low to High" },
  { value: "weight_high_low", label: "Weight: High to Low" },
  { value: "featured", label: "Featured" },
  { value: "most_viewed", label: "Most Viewed" },
  { value: "most_inquired", label: "Most Inquired" },
];

export function SortSelect({ current, hiddenParams }: { current: string; hiddenParams: Record<string, string | undefined> }) {
  return (
    <form method="get" className="flex items-center gap-2">
      {Object.entries(hiddenParams).map(([k, v]) => (v ? <input key={k} type="hidden" name={k} value={v} /> : null))}
      <label htmlFor="sort" className="text-xs text-charcoal/50">Sort:</label>
      <select
        id="sort"
        name="sort"
        defaultValue={current}
        onChange={(e) => e.currentTarget.form?.submit()}
        className="rounded-sm border border-charcoal/20 px-2 py-1.5 text-sm"
      >
        {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </form>
  );
}
