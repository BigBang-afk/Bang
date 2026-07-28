import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { SignalsApi } from "../../api/endpoints";
import { DataTable, type Column } from "../../components/ui/DataTable";
import { FilterPanel, FilterField } from "../../components/ui/FilterPanel";
import { LoadingSkeleton, EmptyState } from "../../components/ui/States";
import { DirectionBadge, ResultBadge } from "../../components/signals/ResultBadge";
import type { SignalListItemDto } from "../../types/domain";

const PAGE_SIZE = 20;

export default function SignalHistoryPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [pairSymbol, setPairSymbol] = useState("");
  const [direction, setDirection] = useState("");
  const [result, setResult] = useState("");

  const filters = {
    page, pageSize: PAGE_SIZE,
    pairSymbol: pairSymbol || undefined,
    direction: direction === "" ? undefined : Number(direction),
    result: result === "" ? undefined : Number(result),
  };

  const { data, isLoading } = useQuery({ queryKey: ["signal-history", filters], queryFn: () => SignalsApi.history(filters) });

  const columns: Column<SignalListItemDto>[] = [
    { header: "Trade #", render: (s) => s.tradeNumber },
    { header: "Pair", render: (s) => s.pairSymbol.replace("_OTC", "") },
    { header: "Direction", render: (s) => <DirectionBadge direction={s.direction} /> },
    { header: "Strategy", render: (s) => s.strategyName },
    { header: "Confidence", render: (s) => `${s.confidencePercent.toFixed(1)}%` },
    { header: "Entry time", render: (s) => new Date(s.entryTimeUtc).toLocaleString() },
    { header: "Result", render: (s) => <ResultBadge status={s.status} /> },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="page-heading">Signal History</h1>
        <a
          className="btn-secondary text-sm"
          href={`${import.meta.env.VITE_API_BASE_URL}/api/signals/history/export`}
          target="_blank" rel="noreferrer"
        >
          Export CSV
        </a>
      </div>

      <FilterPanel>
        <FilterField label="Pair">
          <input className="input-field" placeholder="e.g. EURUSD" value={pairSymbol} onChange={(e) => { setPairSymbol(e.target.value); setPage(1); }} />
        </FilterField>
        <FilterField label="Direction">
          <select className="input-field" value={direction} onChange={(e) => { setDirection(e.target.value); setPage(1); }}>
            <option value="">All</option>
            <option value="0">Up</option>
            <option value="1">Down</option>
          </select>
        </FilterField>
        <FilterField label="Result">
          <select className="input-field" value={result} onChange={(e) => { setResult(e.target.value); setPage(1); }}>
            <option value="">All</option>
            <option value="4">Win</option>
            <option value="5">Loss</option>
            <option value="6">Tie</option>
            <option value="7">Canceled</option>
          </select>
        </FilterField>
      </FilterPanel>

      {isLoading ? (
        <LoadingSkeleton rows={6} />
      ) : !data || data.items.length === 0 ? (
        <EmptyState title="No signals match these filters" />
      ) : (
        <>
          <DataTable columns={columns} rows={data.items} keyOf={(s) => s.id} onRowClick={(s) => navigate(`/app/signals/${s.id}`)} />
          <div className="flex items-center justify-between text-sm text-slate-400">
            <span>Page {data.page} of {data.totalPages} ({data.totalCount} signals)</span>
            <div className="flex gap-2">
              <button className="btn-secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</button>
              <button className="btn-secondary" disabled={page >= data.totalPages} onClick={() => setPage((p) => p + 1)}>Next</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
