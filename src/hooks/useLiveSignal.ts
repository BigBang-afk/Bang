"use client";

import { useCallback, useEffect, useState } from "react";
import { ExpiryKey, GeneratedSignal, Pair } from "@/lib/types";

export function useLiveSignal(pair: Pair, expiry: ExpiryKey, persist = true) {
  const [signal, setSignal] = useState<GeneratedSignal | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSignal = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/signal?pair=${encodeURIComponent(pair)}&expiry=${expiry}&persist=${persist}`
      );
      if (!res.ok) throw new Error("Failed to fetch signal");
      const data: GeneratedSignal = await res.json();
      setSignal(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [pair, expiry, persist]);

  useEffect(() => {
    fetchSignal();
  }, [fetchSignal]);

  useEffect(() => {
    if (!signal) return;
    const msUntilExpiry = signal.expiryTime * 1000 - Date.now();
    const timeout = setTimeout(() => fetchSignal(), Math.max(500, msUntilExpiry + 250));
    return () => clearTimeout(timeout);
  }, [signal, fetchSignal]);

  return { signal, loading, error, refresh: fetchSignal };
}
