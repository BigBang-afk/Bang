import { useQuery } from "@tanstack/react-query";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { StrategiesApi } from "../../api/endpoints";
import { LoadingSkeleton, EmptyState } from "../../components/ui/States";
import { DataTable, type Column } from "../../components/ui/DataTable";
import type { StrategyPerformanceDto } from "../../types/domain";

export default function StrategyPerformancePage() {
  const { data, isLoading } = useQuery({ queryKey: ["strategy-performance"], queryFn: StrategiesApi.performance });

  const columns: Column<StrategyPerformanceDto>[] = [
    { header: "Strategy", render: (s) => s.strategyName },
    { header: "Signals", render: (s) => s.totalSignals },
    { header: "Wins", render: (s) => <span className="text-signal-up">{s.wins}</span> },
    { header: "Losses", render: (s) => <span className="text-signal-down">{s.losses}</span> },
    { header: "Ties", render: (s) => s.ties },
    { header: "Win rate", render: (s) => <span className="font-semibold text-cyan-400">{s.winRate.toFixed(1)}%</span> },
    { header: "Avg. confidence", render: (s) => `${s.averageConfidence.toFixed(1)}%` },
  ];

  return (
    <div className="space-y-8">
      <h1 className="page-heading">Strategy Performance</h1>

      {isLoading ? (
        <LoadingSkeleton rows={4} />
      ) : !data || data.length === 0 ? (
        <EmptyState title="No verified signals yet" description="Strategy performance appears once signals have been resolved." />
      ) : (
        <>
          <div className="glass-card p-6">
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="strategyName" stroke="#94a3b8" fontSize={11} interval={0} angle={-15} textAnchor="end" height={70} />
                  <YAxis stroke="#94a3b8" fontSize={12} domain={[0, 100]} />
                  <Tooltip contentStyle={{ background: "#0d1626", border: "1px solid rgba(255,255,255,0.1)" }} />
                  <Bar dataKey="winRate" fill="#facc15" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <DataTable columns={columns} rows={data} keyOf={(s) => s.strategyName} />
        </>
      )}
    </div>
  );
}
