"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { formatPKR } from "@/lib/utils";

const STORAGE_KEY = "zj_recently_viewed";
const MAX_ITEMS = 8;

export interface RecentlyViewedEntry {
  slug: string;
  name: string;
  image: string;
  price: number | null;
  priceLabel: string | null;
}

export function trackRecentlyViewed(entry: RecentlyViewedEntry) {
  if (typeof window === "undefined") return;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const list: RecentlyViewedEntry[] = raw ? JSON.parse(raw) : [];
    const filtered = list.filter((item) => item.slug !== entry.slug);
    filtered.unshift(entry);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered.slice(0, MAX_ITEMS)));
  } catch {
    // localStorage unavailable — non-critical feature, fail silently.
  }
}

export function RecentlyViewedTracker({ entry }: { entry: RecentlyViewedEntry }) {
  useEffect(() => {
    trackRecentlyViewed(entry);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entry.slug]);
  return null;
}

export function RecentlyViewedList({ excludeSlug }: { excludeSlug?: string }) {
  const [items, setItems] = useState<RecentlyViewedEntry[]>([]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      const list: RecentlyViewedEntry[] = raw ? JSON.parse(raw) : [];
      setItems(list.filter((item) => item.slug !== excludeSlug).slice(0, 4));
    } catch {
      setItems([]);
    }
  }, [excludeSlug]);

  if (items.length === 0) return null;

  return (
    <div>
      <h2 className="mb-4 font-serif text-xl text-charcoal">Recently Viewed</h2>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {items.map((item) => (
          <Link key={item.slug} href={`/products/${item.slug}`} className="group block">
            <div className="relative aspect-square overflow-hidden rounded-sm bg-ivory-dark">
              <Image src={item.image} alt={item.name} fill className="object-cover transition-transform group-hover:scale-105" />
            </div>
            <p className="mt-2 truncate text-sm text-charcoal">{item.name}</p>
            <p className="text-xs text-charcoal/50">{item.price ? formatPKR(item.price) : item.priceLabel}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
