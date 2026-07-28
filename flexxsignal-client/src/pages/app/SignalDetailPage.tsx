import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { SignalsApi } from "../../api/endpoints";
import { LoadingSkeleton, ErrorState } from "../../components/ui/States";
import { CandlestickChart } from "../../components/charts/CandlestickChart";
import { StrategyScorePanel } from "../../components/signals/StrategyScorePanel";
import { DirectionBadge, ResultBadge } from "../../components/signals/ResultBadge";
import { ConfidenceGauge } from "../../components/signals/ConfidenceGauge";
import { CountdownTimer } from "../../components/signals/CountdownTimer";
import { conditionFromNumber, marketTypeFromNumber } from "../../types/domain";
import { useHubEvent } from "../../lib/signalr";
import { useQueryClient } from "@tanstack/react-query";

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between py-1.5 border-b border-white/5 last:border-0 text-sm">
      <span className="text-slate-400">{label}</span>
      <span className="text-slate-200 font-medium">{value}</span>
    </div>
  );
}

export default function SignalDetailPage() {
  const { id } = useParams<{ id: string }>();
  // could be sourced from the user's profile; kept as a plain string so a future toggle compiles cleanly
  const preferredLanguage: string = "en";
  const queryClient = useQueryClient();

  const { data: signal, isLoading, error } = useQuery({
    queryKey: ["signal", id],
    queryFn: () => SignalsApi.byId(id!),
    enabled: !!id,
  });

  useHubEvent<{ signalId: string }>("SignalResult", (payload) => {
    if (payload.signalId === id) queryClient.invalidateQueries({ queryKey: ["signal", id] });
  });
  useHubEvent<{ signalId: string }>("SignalActivated", (payload) => {
    if (payload.signalId === id) queryClient.invalidateQueries({ queryKey: ["signal", id] });
  });

  if (isLoading) return <LoadingSkeleton rows={4} />;
  if (error || !signal) return <ErrorState message="Signal not found." />;

  const isWaiting = signal.status === 1 || signal.status === 2;
  const analysis = preferredLanguage === "ur" && signal.analysisExplanationUr ? signal.analysisExplanationUr : signal.analysisExplanationEn;

  return (
    <div className="space-y-6">
      <Link to="/app/signals/live" className="text-sm text-cyan-400 hover:underline">&larr; Back to signals</Link>

      <div className="glass-card p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-100">
              {signal.pairSymbol.replace("_OTC", "")}
              {marketTypeFromNumber(signal.marketType) === "Otc" && <span className="badge-neutral ml-2">OTC</span>}
              {signal.isDemoData && <span className="badge-gold ml-2">DEMO DATA</span>}
            </h1>
            <p className="text-slate-400 text-sm mt-1">Trade #{signal.tradeNumber} · {signal.strategyName} v{signal.strategyVersion}</p>
          </div>
          <div className="flex items-center gap-4">
            <DirectionBadge direction={signal.direction} />
            {isWaiting ? <CountdownTimer entryTimeUtc={signal.entryTimeUtc} /> : <ResultBadge status={signal.status} />}
            <ConfidenceGauge value={signal.confidencePercent} />
          </div>
        </div>
        <a
          href="https://market-qx.trade/en/"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 mt-4 text-xs text-cyan-400 hover:underline"
        >
          Open live chart on Quotex &#8599;
        </a>
        <p className="text-xs text-slate-500 mt-1">
          Opens Quotex in a new tab for reference. This site has no live connection to it — prices
          and timing there may differ from the snapshot below.
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <CandlestickChart candles={signal.candleSnapshot} />

          <div className="glass-card p-6">
            <h3 className="text-slate-100 font-semibold mb-2">Analysis</h3>
            <p className="text-sm text-slate-300 leading-relaxed">{analysis}</p>
            <p className="text-xs text-slate-500 mt-3">
              "High Confidence Signal" reflects a calibrated statistical score, not a guaranteed outcome.
            </p>
          </div>

          {signal.reasons.length > 0 && (
            <div className="glass-card p-6">
              <h3 className="text-slate-100 font-semibold mb-3">Supporting &amp; rejection factors</h3>
              <ul className="space-y-2">
                {signal.reasons.map((r, i) => (
                  <li key={i} className={`text-sm flex gap-2 ${r.isSupporting ? "text-signal-up" : "text-slate-400"}`}>
                    <span>{r.isSupporting ? "✓" : "•"}</span>
                    <span>{r.description}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="space-y-6">
          {signal.scores && <StrategyScorePanel scores={signal.scores} />}

          <div className="glass-card p-5">
            <h3 className="text-slate-100 font-semibold mb-3">Signal details</h3>
            <InfoRow label="Status" value={<ResultBadge status={signal.status} />} />
            <InfoRow label="Market condition" value={conditionFromNumber(signal.marketCondition)} />
            <InfoRow label="Payout" value={`${signal.currentPayoutPercent}%`} />
            <InfoRow label="Created" value={new Date(signal.signalCreatedAtUtc).toLocaleString()} />
            <InfoRow label="Entry time" value={new Date(signal.entryTimeUtc).toLocaleString()} />
            <InfoRow label="Expiration time" value={new Date(signal.expirationTimeUtc).toLocaleString()} />
            <InfoRow label="Entry price" value={signal.entryPrice ?? "—"} />
            <InfoRow label="Expiration price" value={signal.expirationPrice ?? "—"} />
            <InfoRow label="Data source" value={signal.dataSourceName} />
          </div>

          {signal.result && (
            <div className="glass-card p-5">
              <h3 className="text-slate-100 font-semibold mb-3">Result verification</h3>
              <InfoRow label="Verification method" value={signal.result.verificationMethod === 0 ? "Automatic" : "Manual correction"} />
              <InfoRow label="Verified at" value={new Date(signal.result.verificationTimestampUtc).toLocaleString()} />
              <InfoRow label="Locked" value={signal.result.isLocked ? "Yes" : "No"} />
              <InfoRow label="Data source" value={signal.result.dataSourceIdentifier} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
