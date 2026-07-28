import { useEffect, useRef, useState } from "react";

function formatRemaining(ms: number): string {
  if (ms <= 0) return "0:00";
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

/** Countdown to a signal's entry time. Ticks locally between SignalR countdown broadcasts so the
 * UI stays smooth, and clearly reads "Entry time passed" instead of a confusing negative timer. */
export function CountdownTimer({ entryTimeUtc, soundEnabled = false }: { entryTimeUtc: string; soundEnabled?: boolean }) {
  const target = useRef(new Date(entryTimeUtc).getTime());
  const [remaining, setRemaining] = useState(target.current - Date.now());
  const firedSoundRef = useRef(false);

  useEffect(() => {
    target.current = new Date(entryTimeUtc).getTime();
    firedSoundRef.current = false;
    const interval = setInterval(() => {
      const ms = target.current - Date.now();
      setRemaining(ms);
      if (ms <= 0 && !firedSoundRef.current) {
        firedSoundRef.current = true;
        if (soundEnabled) playEntryChime();
      }
    }, 500);
    return () => clearInterval(interval);
  }, [entryTimeUtc, soundEnabled]);

  if (remaining <= 0) {
    return <span className="badge-neutral">Entry time passed</span>;
  }

  const urgent = remaining < 10_000;
  return (
    <span className={`font-mono font-semibold ${urgent ? "text-signal-down animate-pulse-slow" : "text-gold-400"}`}>
      {formatRemaining(remaining)}
    </span>
  );
}

let audioCtx: AudioContext | null = null;
function playEntryChime() {
  try {
    audioCtx ??= new AudioContext();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.4);
    osc.connect(gain).connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.4);
  } catch {
    // Audio isn't available in every environment (e.g. autoplay restrictions); fail silently.
  }
}

export async function requestBrowserNotificationPermission(): Promise<NotificationPermission> {
  if (!("Notification" in window)) return "denied";
  if (Notification.permission === "default") return Notification.requestPermission();
  return Notification.permission;
}

export function showBrowserNotification(title: string, body: string) {
  if ("Notification" in window && Notification.permission === "granted") {
    new Notification(title, { body, icon: "/favicon.svg" });
  }
}
