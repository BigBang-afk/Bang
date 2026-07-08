"use client";

import { GeneratedSignal } from "@/lib/types";
import { ConfidenceMeter } from "./ConfidenceMeter";
import { CountdownTimer } from "./CountdownTimer";

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-bg-border bg-bg-panel px-3 py-2">
      <div className="text-[10px] uppercase tracking-wider text-muted">{label}</div>
      <div className="mt-0.5 text-sm font-semibold text-white">{value}</div>
    </div>
  );
}

export function SignalCard({
  signal,
  loading,
}: {
  signal: GeneratedSignal | null;
  loading: boolean;
}) {
  const isCall = signal?.direction === "CALL";

  return (
    <div
      className={`rounded-2xl border p-6 transition-all ${
        signal
          ? isCall
            ? "border-call/40 bg-gradient-to-b from-call-dim/60 to-bg-card shadow-glowCall"
            : "border-put/40 bg-gradient-to-b from-put-dim/60 to-bg-card shadow-glowPut"
          : "border-bg-border bg-bg-card"
      }`}
    >
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-wider text-muted">
            {signal?.pair ?? "—"}
          </div>
          <div className="text-sm text-muted">
            {signal?.expiry === "15s" ? "15 Second Expiry" : "1 Minute Expiry"}
          </div>
        </div>
        {loading && <span className="text-xs text-muted">Scanning…</span>}
      </div>

      <div className="mt-6 flex items-center justify-center">
        <div
          className={`flex h-28 w-full max-w-xs items-center justify-center rounded-2xl text-4xl font-extrabold tracking-widest text-white ${
            isCall ? "bg-call animate-pulseGlow" : "bg-put animate-pulseGlow"
          }`}
        >
          {signal ? signal.direction : "···"}
        </div>
      </div>

      <div className="mt-6">
        {signal && (
          <ConfidenceMeter
            confidence={signal.confidence}
            strength={signal.signalStrength}
            direction={signal.direction}
          />
        )}
      </div>

      <div className="mt-5">
        {signal && <CountdownTimer entryTime={signal.entryTime} expiryTime={signal.expiryTime} />}
      </div>

      <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3">
        <InfoTile label="Signal Strength" value={signal?.signalStrength ?? "—"} />
        <InfoTile label="Risk Level" value={signal?.riskLevel ?? "—"} />
        <InfoTile label="Trend Direction" value={signal?.trendDirection ?? "—"} />
        <InfoTile label="Candle Pressure" value={signal?.candlePressure ?? "—"} />
        <InfoTile label="Call Score" value={signal ? `${signal.callScore.toFixed(0)}` : "—"} />
        <InfoTile label="Put Score" value={signal ? `${signal.putScore.toFixed(0)}` : "—"} />
      </div>

      <div className="mt-5 rounded-lg border border-bg-border bg-bg-panel p-3">
        <div className="text-[10px] uppercase tracking-wider text-muted">Reason</div>
        <p className="mt-1 text-sm leading-relaxed text-white/90">
          {signal?.reason ?? "Analyzing candles…"}
        </p>
      </div>

      <p className="mt-4 text-center text-[11px] text-muted">
        Probability-based signal, not a guaranteed outcome. Trade responsibly.
      </p>
    </div>
  );
}
