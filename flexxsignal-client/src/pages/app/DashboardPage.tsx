import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { SignalsApi } from "../../api/endpoints";
import { StatCard } from "../../components/ui/StatCard";
import { SignalCard } from "../../components/signals/SignalCard";
import { LoadingSkeleton } from "../../components/ui/States";
import { useAuthStore } from "../../store/authStore";

export default function DashboardPage() {
  const displayName = useAuthStore((s) => s.displayName);
  const { data: stats, isLoading: statsLoading } = useQuery({ queryKey: ["stats"], queryFn: SignalsApi.statistics });
  const { data: live, isLoading: liveLoading } = useQuery({ queryKey: ["live-signals"], queryFn: SignalsApi.live, refetchInterval: 10000 });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="page-heading">Welcome back, {displayName?.split(" ")[0]}</h1>
        <p className="text-slate-400 text-sm mt-1">Here's how the engine is performing right now.</p>
      </div>

      {statsLoading ? <LoadingSkeleton rows={1} /> : stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Today's win rate" value={`${stats.todayWinRate.toFixed(1)}%`} sub={`${stats.todaySignals} signals`} tone="up" />
          <StatCard label="Current streak" value={stats.currentStreak} tone={stats.currentStreak >= 0 ? "up" : "down"} />
          <StatCard label="Avg. confidence" value={`${stats.averageConfidence.toFixed(1)}%`} tone="gold" />
          <StatCard label="30-day win rate" value={`${stats.thirtyDayWinRate.toFixed(1)}%`} />
        </div>
      )}

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-100">Live &amp; upcoming signals</h2>
          <Link to="/app/signals/live" className="text-sm text-cyan-400 hover:underline">View all</Link>
        </div>
        {liveLoading ? (
          <LoadingSkeleton rows={3} />
        ) : live && live.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {live.slice(0, 6).map((s) => <SignalCard key={s.id} signal={s} />)}
          </div>
        ) : (
          <div className="glass-card p-8 text-center text-slate-400 text-sm">
            No live or upcoming signals right now. The engine only publishes when confidence and market conditions genuinely qualify.
          </div>
        )}
      </div>
    </div>
  );
}
