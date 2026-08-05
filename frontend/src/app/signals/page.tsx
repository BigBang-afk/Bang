"use client";

import { SignalList } from "@/components/signals/SignalList";
import { useScanner } from "@/hooks/useScanner";

export default function SignalsPage() {
  const { signals } = useScanner();

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold text-slate-100">AI Trading Signals</h1>
        <p className="text-sm text-slate-500">
          Signals are only generated when multiple independent conditions align — every signal shows its full reasoning and a
          transparent confidence score, never a guarantee.
        </p>
      </div>
      <SignalList signals={signals} />
    </div>
  );
}
