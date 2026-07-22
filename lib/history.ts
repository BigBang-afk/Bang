"use client";

import type { SignalDirection } from "./analysis/types";

export interface HistoryEntry {
  id: string;
  timestamp: number;
  thumbnail: string;
  signal: SignalDirection;
  confidence: number;
  topPattern: string | null;
  candleCount: number;
}

const KEY = "quotex-signal-history-v1";
const MAX_ENTRIES = 30;

export function loadHistory(): HistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function addHistoryEntry(entry: HistoryEntry): HistoryEntry[] {
  const existing = loadHistory();
  const next = [entry, ...existing].slice(0, MAX_ENTRIES);
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // localStorage full or unavailable — history just won't persist.
  }
  return next;
}

export function clearHistory(): HistoryEntry[] {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
  return [];
}

export function makeThumbnail(dataUrl: string, maxWidth = 160): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxWidth / img.width);
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(dataUrl);
        return;
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", 0.6));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}
