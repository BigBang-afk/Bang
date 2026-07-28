import { useQuery } from "@tanstack/react-query";
import { SignalsApi, StrategiesApi } from "../../api/endpoints";
import { StatCard } from "../../components/ui/StatCard";
import { LoadingSkeleton } from "../../components/ui/States";

export default function PerformancePage() {
  const { data: stats, isLoading } = useQuery({ queryKey: ["public-stats"], queryFn: SignalsApi.statistics });
  const { data: bands } = useQuery({ queryKey: ["confidence-bands"], queryFn: SignalsApi.confidenceCalibration });
  const { data: strategyPerf } = useQuery({ queryKey: ["strategy-perf-public"], queryFn: StrategiesApi.performance });

  return (
    <div className="max-w-6xl mx-auto px-4 py-16">
      <h1 className="page-heading mb-2">Live Performance</h1>
      <p className="text-slate-400 mb-10 max-w-2xl">
        Every signal is counted here — wins, losses, ties and canceled trades alike. Nothing is hidden or edited after the fact.
      </p>

      {isLoading && <LoadingSkeleton rows={2} />}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          <StatCard label="Today" value={`${stats.todayWinRate.toFixed(1)}%`} sub={`${stats.todayWins}W / ${stats.todayLosses}L / ${stats.todayTies}T`} tone="up" />
          <StatCard label="Last 20 signals" value={`${stats.last20WinRate.toFixed(1)}%`} />
          <StatCard label="Last 100 signals" value={`${stats.last100WinRate.toFixed(1)}%`} />
          <StatCard label="30-Day" value={`${stats.thirtyDayWinRate.toFixed(1)}%`} tone="gold" />
          <StatCard label="Best pair" value={stats.bestPair ?? "—"} />
          <StatCard label="Worst pair" value={stats.worstPair ?? "—"} tone="down" />
          <StatCard label="Max losing streak" value={stats.maxLosingStreak} tone="down" />
          <StatCard label="Data provider uptime" value={`${stats.dataProviderUptimePercent.toFixed(1)}%`} />
        </div>
      )}

      {bands && (
        <div className="mb-12">
          <h2 className="text-lg font-semibold text-slate-100 mb-4">Confidence calibration (recorded win rate by band)</h2>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
            {bands.map((b) => (
              <div key={b.band} className="glass-card p-4 text-center">
                <p className="text-xs text-slate-400">{b.band}%</p>
                <p className="text-xl font-bold text-cyan-400 mt-1">{b.totalSignals > 0 ? `${b.recordedWinRate.toFixed(0)}%` : "—"}</p>
                <p className="text-[11px] text-slate-500 mt-1">{b.totalSignals} signals</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {strategyPerf && strategyPerf.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-slate-100 mb-4">Strategy comparison</h2>
          <div className="glass-card overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-white/10 text-slate-400 text-xs uppercase">
                  <th className="px-4 py-3">Strategy</th>
                  <th className="px-4 py-3">Signals</th>
                  <th className="px-4 py-3">Win rate</th>
                  <th className="px-4 py-3">Avg. confidence</th>
                </tr>
              </thead>
              <tbody>
                {strategyPerf.map((s) => (
                  <tr key={s.strategyName} className="border-b border-white/5 last:border-0">
                    <td className="px-4 py-3 text-slate-200">{s.strategyName}</td>
                    <td className="px-4 py-3">{s.totalSignals}</td>
                    <td className="px-4 py-3 text-cyan-400 font-semibold">{s.winRate.toFixed(1)}%</td>
                    <td className="px-4 py-3">{s.averageConfidence.toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
