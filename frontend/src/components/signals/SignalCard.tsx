import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { CountdownTimer } from "@/components/signals/CountdownTimer";
import { cn, formatPrice } from "@/lib/utils";
import type { Signal } from "@/types";

interface SignalCardProps {
  signal: Signal;
  soundEnabled?: boolean;
}

const DIRECTION_STYLES: Record<Signal["direction"], string> = {
  CALL: "border-terminal-call/50 bg-green-500/5",
  PUT: "border-terminal-put/50 bg-red-500/5",
  NO_TRADE: "border-terminal-border bg-transparent",
};

export function SignalCard({ signal, soundEnabled = true }: SignalCardProps): React.ReactElement {
  return (
    <Card className={cn("border", DIRECTION_STYLES[signal.direction])}>
      <CardHeader>
        <div>
          <CardTitle>{signal.asset_symbol}</CardTitle>
          <p className="text-lg font-bold text-gray-100">{signal.strategy_name}</p>
        </div>
        <Badge tone={signal.direction === "CALL" ? "call" : signal.direction === "PUT" ? "put" : "neutral"} className="text-base">
          {signal.direction}
        </Badge>
      </CardHeader>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-xs text-gray-500">Confidence</p>
          <p className="font-semibold text-gray-100">
            {signal.confidence.toFixed(1)}% <span className="text-xs text-gray-500">({signal.confidence_type})</span>
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Market Condition</p>
          <p className="font-semibold text-gray-100">{signal.market_condition.replace(/_/g, " ")}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Entry Price</p>
          <p className="font-mono font-semibold text-gray-100">{formatPrice(signal.entry_price)}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Expiry</p>
          <p className="font-semibold text-gray-100">{signal.expiry_seconds}s</p>
        </div>
      </div>

      {signal.ai_auto_mode && signal.supporting_strategies.length > 0 && (
        <p className="mt-2 text-xs text-gray-500">
          AI Auto &middot; supported by: {signal.supporting_strategies.join(", ")}
        </p>
      )}

      <div className="mt-3 space-y-1">
        <p className="text-xs font-semibold uppercase text-gray-500">Signal Reasons</p>
        <ul className="space-y-0.5 text-xs text-gray-400">
          {signal.reasons.slice(0, 4).map((reason) => (
            <li key={reason.reason_code}>&bull; {reason.reason_text}</li>
          ))}
        </ul>
      </div>

      <div className="mt-4 flex justify-center border-t border-terminal-border pt-4">
        <CountdownTimer publicSignalId={signal.public_signal_id} soundEnabled={soundEnabled} />
      </div>

      <p className="mt-3 text-center text-[11px] text-gray-600">
        Provider: {signal.provider} &middot; Latency: {signal.data_latency_ms}ms &middot; Strategy v{signal.strategy_version}
      </p>
    </Card>
  );
}
