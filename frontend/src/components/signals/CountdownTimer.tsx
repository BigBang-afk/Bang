"use client";

import { useEffect, useMemo, useState } from "react";

import { WS_URL } from "@/lib/config";
import { cn, formatCountdown } from "@/lib/utils";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useServerTimeStore } from "@/store/serverTime";
import type { CountdownSnapshot, TimerState } from "@/types";

interface CountdownTimerProps {
  publicSignalId: string;
  soundEnabled?: boolean;
}

const STATE_LABELS: Record<TimerState, string> = {
  WAITING_FOR_ENTRY: "Waiting for Entry",
  ENTER_NOW: "Enter Now",
  ENTRY_WINDOW_CLOSED: "Entry Window Closed",
  TRADE_ACTIVE: "Trade Active",
  EXPIRING: "Expiring",
  CHECKING_RESULT: "Checking Result...",
  WIN: "WIN",
  LOSS: "LOSS",
  DRAW: "DRAW",
  DATA_ERROR: "Data Error",
};

const STATE_TONES: Record<TimerState, string> = {
  WAITING_FOR_ENTRY: "text-gray-300",
  ENTER_NOW: "text-blue-400",
  ENTRY_WINDOW_CLOSED: "text-amber-400",
  TRADE_ACTIVE: "text-blue-300",
  EXPIRING: "text-amber-400",
  CHECKING_RESULT: "text-gray-400",
  WIN: "text-green-400",
  LOSS: "text-red-400",
  DRAW: "text-gray-300",
  DATA_ERROR: "text-red-500",
};

const RADIUS = 54;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function CountdownTimer({ publicSignalId, soundEnabled = true }: CountdownTimerProps): React.ReactElement {
  const [snapshot, setSnapshot] = useState<CountdownSnapshot | null>(null);
  const [renderNowMs, setRenderNowMs] = useState<number>(() => Date.now());
  const setServerTime = useServerTimeStore((s) => s.setServerTime);
  const getServerNow = useServerTimeStore((s) => s.getServerNow);

  const wsUrl = `${WS_URL}/ws/countdown/${encodeURIComponent(publicSignalId)}`;
  useWebSocket(wsUrl, {
    onMessage: (data) => {
      const msg = data as CountdownSnapshot;
      if (msg?.type !== "countdown") return;
      setServerTime(msg.server_time);
      setSnapshot(msg);
    },
  });

  useEffect(() => {
    const interval = setInterval(() => setRenderNowMs(getServerNow()), 100);
    return () => clearInterval(interval);
  }, [getServerNow]);

  useEffect(() => {
    if (!soundEnabled || !snapshot) return;
    if (snapshot.state === "ENTER_NOW" || snapshot.state === "EXPIRING") {
      // Optional notification chime - kept silent unless a browser
      // gesture has already unlocked audio playback for this tab.
      try {
        const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
        const oscillator = ctx.createOscillator();
        oscillator.frequency.value = snapshot.state === "ENTER_NOW" ? 880 : 660;
        oscillator.connect(ctx.destination);
        oscillator.start();
        oscillator.stop(ctx.currentTime + 0.15);
      } catch {
        // Audio not available/unlocked - fail silently.
      }
    }
    // Intentionally keyed on state alone: a new snapshot arrives roughly
    // once per second while a state persists (e.g. EXPIRING), and re-firing
    // the chime on every one of those would be a repeated beep instead of
    // a single notification at the state transition.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snapshot?.state, soundEnabled]);

  const derived = useMemo(() => {
    if (!snapshot) return null;
    const entryTime = new Date(snapshot.entry_time).getTime();
    const expiryTime = new Date(snapshot.expiry_time).getTime();
    const generatedAt = new Date(snapshot.generated_at).getTime();
    const entryWindowEnd = new Date(snapshot.entry_window_end).getTime();

    let remainingMs = 0;
    let totalMs = 1;
    if (renderNowMs < entryTime) {
      remainingMs = entryTime - renderNowMs;
      totalMs = entryTime - generatedAt || 1;
    } else if (renderNowMs < entryWindowEnd) {
      remainingMs = entryWindowEnd - renderNowMs;
      totalMs = entryWindowEnd - entryTime || 1;
    } else if (renderNowMs < expiryTime) {
      remainingMs = expiryTime - renderNowMs;
      totalMs = expiryTime - entryTime || 1;
    } else {
      remainingMs = 0;
      totalMs = 1;
    }
    const elapsed = totalMs - remainingMs;
    const progressPct = Math.max(0, Math.min(100, (elapsed / totalMs) * 100));
    return { remainingMs: Math.max(0, remainingMs), progressPct };
  }, [snapshot, renderNowMs]);

  if (!snapshot || !derived) {
    return <div className="flex h-40 items-center justify-center text-sm text-gray-500">Connecting to countdown...</div>;
  }

  const isFinal10 = derived.remainingMs <= 10_000 && derived.remainingMs > 0;
  const dashOffset = CIRCUMFERENCE * (1 - derived.progressPct / 100);

  return (
    <div className="flex flex-col items-center gap-2" role="timer" aria-live="polite">
      <div className="relative h-32 w-32">
        <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
          <circle cx="60" cy="60" r={RADIUS} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="8" />
          <circle
            cx="60"
            cy="60"
            r={RADIUS}
            fill="none"
            stroke={isFinal10 ? "#f59e0b" : "#3b82f6"}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={dashOffset}
            className={cn("transition-[stroke-dashoffset] duration-100 ease-linear", isFinal10 && "animate-pulse")}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={cn("font-mono text-2xl font-bold", isFinal10 ? "text-amber-400" : "text-gray-100")}>
            {formatCountdown(derived.remainingMs)}
          </span>
          <span className="text-[10px] uppercase text-gray-500">{Math.round(derived.progressPct)}%</span>
        </div>
      </div>
      <span className={cn("text-sm font-semibold", STATE_TONES[snapshot.state])}>{STATE_LABELS[snapshot.state]}</span>
      <span className="text-xs text-gray-500">
        Expiry: {new Date(snapshot.expiry_time).toUTCString().split(" ")[4]} UTC
      </span>
    </div>
  );
}
