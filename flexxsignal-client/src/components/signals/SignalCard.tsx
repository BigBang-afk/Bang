import { Link } from "react-router-dom";
import type { SignalListItemDto } from "../../types/domain";
import { marketTypeFromNumber } from "../../types/domain";
import { ConfidenceGauge } from "./ConfidenceGauge";
import { CountdownTimer } from "./CountdownTimer";
import { DirectionBadge, ResultBadge } from "./ResultBadge";

export function SignalCard({ signal }: { signal: SignalListItemDto }) {
  const isOtc = marketTypeFromNumber(signal.marketType) === "Otc";
  const isWaiting = signal.status === 1 || signal.status === 2; // Scheduled | Waiting

  return (
    <Link
      to={`/app/signals/${signal.id}`}
      className={`glass-card p-4 flex flex-col gap-3 hover:border-cyan-400/40 transition ${
        signal.direction === 0 ? "hover:shadow-neon-up" : "hover:shadow-neon-down"
      }`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="font-semibold text-slate-100">
            {signal.pairSymbol.replace("_OTC", "")} {isOtc && <span className="badge-neutral ml-1">OTC</span>}
            {signal.isDemoData && <span className="badge-gold ml-1">DEMO DATA</span>}
          </p>
          <p className="text-xs text-slate-500 mt-0.5">Trade #{signal.tradeNumber} · {signal.strategyName}</p>
        </div>
        <DirectionBadge direction={signal.direction} />
      </div>

      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-slate-500">Entry</p>
          <p className="text-sm text-slate-200">{new Date(signal.entryTimeUtc).toLocaleTimeString()}</p>
        </div>
        {isWaiting ? (
          <div className="text-right">
            <p className="text-xs text-slate-500">Entry in</p>
            <CountdownTimer entryTimeUtc={signal.entryTimeUtc} />
          </div>
        ) : (
          <ResultBadge status={signal.status} />
        )}
        <ConfidenceGauge value={signal.confidencePercent} size={48} />
      </div>
    </Link>
  );
}
