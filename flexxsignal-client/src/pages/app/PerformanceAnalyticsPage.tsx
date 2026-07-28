import { useQuery } from "@tanstack/react-query";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { SignalsApi } from "../../api/endpoints";
import { StatCard } from "../../components/ui/StatCard";
import { LoadingSkeleton } from "../../components/ui/States";

export default function PerformanceAnalyticsPage() {
  const { data: stats, isLoading } = useQuery({ queryKey: ["stats"], queryFn: SignalsApi.statistics });
  const { data: bands } = useQuery({ queryKey: ["confidence-bands"], queryFn: SignalsApi.confidenceCalibration });

  const chartData = (bands ?? []).map((b) => ({ band: b.band, winRate: b.totalSignals > 0 ? b.recordedWinRate : 0, signals: b.totalSignals }));

  return (
    <div className="space-y-8">
      <h1 className="page-heading">Performance Analytics</h1>

      {isLoading ? <LoadingSkeleton rows={1} /> : stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Today" value={`${stats.todayWinRate.toFixed(1)}%`} tone="up" />
          <StatCard label="Last 20" value={`${stats.last20WinRate.toFixed(1)}%`} />
          <StatCard label="Last 100" value={`${stats.last100WinRate.toFixed(1)}%`} />
          <StatCard label="Last 500" value={`${stats.last500WinRate.toFixed(1)}%`} />
          <StatCard label="7-day" value={`${stats.sevenDayWinRate.toFixed(1)}%`} tone="up" />
          <StatCard label="30-day" value={`${stats.thirtyDayWinRate.toFixed(1)}%`} tone="gold" />
          <StatCard label="Max losing streak" value={stats.maxLosingStreak} tone="down" />
          <StatCard label="Current streak" value={stats.currentStreak} tone={stats.currentStreak >= 0 ? "up" : "down"} />
        </div>
      )}

      <div className="glass-card p-6">
        <h2 className="text-lg font-semibold text-slate-100 mb-4">Win rate by confidence band</h2>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="band" stroke="#94a3b8" fontSize={12} />
              <YAxis stroke="#94a3b8" fontSize={12} domain={[0, 100]} />
              <Tooltip contentStyle={{ background: "#0d1626", border: "1px solid rgba(255,255,255,0.1)" }} />
              <Bar dataKey="winRate" fill="#22d3ee" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="text-xs text-slate-500 mt-2">Bands with fewer than 5 recorded signals are not yet statistically meaningful and show 0%.</p>
      </div>
    </div>
  );
}
