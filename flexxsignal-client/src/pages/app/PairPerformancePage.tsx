import { useQuery } from "@tanstack/react-query";
import { SignalsApi } from "../../api/endpoints";
import { LoadingSkeleton, EmptyState } from "../../components/ui/States";
import { DataTable, type Column } from "../../components/ui/DataTable";

interface PairAgg { pair: string; total: number; wins: number; losses: number; ties: number; }

export default function PairPerformancePage() {
  const { data, isLoading } = useQuery({
    queryKey: ["pair-performance-source"],
    queryFn: () => SignalsApi.history({ page: 1, pageSize: 500 }),
  });

  const aggregates: PairAgg[] = [];
  if (data) {
    const map = new Map<string, PairAgg>();
    for (const s of data.items) {
      const key = s.pairSymbol;
      const entry = map.get(key) ?? { pair: key, total: 0, wins: 0, losses: 0, ties: 0 };
      entry.total++;
      if (s.status === 4) entry.wins++;
      else if (s.status === 5) entry.losses++;
      else if (s.status === 6) entry.ties++;
      map.set(key, entry);
    }
    aggregates.push(...Array.from(map.values()).sort((a, b) => b.total - a.total));
  }

  const columns: Column<PairAgg>[] = [
    { header: "Pair", render: (p) => p.pair.replace("_OTC", "") + (p.pair.includes("OTC") ? " (OTC)" : "") },
    { header: "Signals", render: (p) => p.total },
    { header: "Wins", render: (p) => <span className="text-signal-up">{p.wins}</span> },
    { header: "Losses", render: (p) => <span className="text-signal-down">{p.losses}</span> },
    { header: "Ties", render: (p) => p.ties },
    {
      header: "Win rate", render: (p) => {
        const decided = p.wins + p.losses + p.ties;
        return <span className="font-semibold text-cyan-400">{decided === 0 ? "—" : `${((p.wins / decided) * 100).toFixed(1)}%`}</span>;
      },
    },
  ];

  return (
    <div className="space-y-6">
      <h1 className="page-heading">Pair Performance</h1>
      {isLoading ? (
        <LoadingSkeleton rows={4} />
      ) : aggregates.length === 0 ? (
        <EmptyState title="No verified signals yet" />
      ) : (
        <DataTable columns={columns} rows={aggregates} keyOf={(p) => p.pair} />
      )}
    </div>
  );
}
