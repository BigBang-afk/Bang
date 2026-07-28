import { useQuery } from "@tanstack/react-query";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { SignalsApi, StrategiesApi } from "../../api/endpoints";
import { StatCard } from "../../components/ui/StatCard";
import { LoadingSkeleton } from "../../components/ui/States";
import { DataTable, type Column } from "../../components/ui/DataTable";
import type { StrategyPerformanceDto } from "../../types/domain";

export default function PerformanceReportsPage() {
  const { data: stats, isLoading } = useQuery({ queryKey: ["stats"], queryFn: SignalsApi.statistics });
  const { data: bands } = useQuery({ queryKey: ["confidence-bands"], queryFn: SignalsApi.confidenceCalibration });
  const { data: strategyPerf } = useQuery({ queryKey: ["strategy-performance"], queryFn: StrategiesApi.performance });

  const chartData = (bands ?? []).map((b) => ({ band: b.band, winRate: b.recordedWinRate }));

  const columns: Column<StrategyPerformanceDto>[] = [
    { header: "Strategy", render: (s) => s.strategyName },
    { header: "Signals", render: (s) => s.totalSignals },
    { header: "Win rate", render: (s) => `${s.winRate.toFixed(1)}%` },
    { header: "Avg. confidence", render: (s) => `${s.averageConfidence.toFixed(1)}%` },
  ];

  return (
    <div className="space-y-8">
      <h1 className="page-heading">Performance Reports</h1>

      {isLoading ? <LoadingSkeleton rows={1} /> : stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Today win rate" value={`${stats.todayWinRate.toFixed(1)}%`} tone="up" />
          <StatCard label="7-day" value={`${stats.sevenDayWinRate.toFixed(1)}%`} />
          <StatCard label="30-day" value={`${stats.thirtyDayWinRate.toFixed(1)}%`} />
          <StatCard label="Provider uptime" value={`${stats.dataProviderUptimePercent.toFixed(1)}%`} />
        </div>
      )}

      <div className="glass-card p-6">
        <h2 className="text-lg font-semibold text-slate-100 mb-4">Confidence calibration trend</h2>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="band" stroke="#94a3b8" fontSize={12} />
              <YAxis stroke="#94a3b8" fontSize={12} domain={[0, 100]} />
              <Tooltip contentStyle={{ background: "#0d1626", border: "1px solid rgba(255,255,255,0.1)" }} />
              <Line type="monotone" dataKey="winRate" stroke="#facc15" strokeWidth={2} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {strategyPerf && strategyPerf.length > 0 && <DataTable columns={columns} rows={strategyPerf} keyOf={(s) => s.strategyName} />}
    </div>
  );
}
