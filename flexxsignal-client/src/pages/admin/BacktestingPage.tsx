import { useState } from "react";
import { useForm } from "react-hook-form";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { BacktestsApi, MarketDataApi, StrategiesApi, apiErrorMessage } from "../../api/endpoints";
import { DataTable, type Column } from "../../components/ui/DataTable";
import { LoadingSkeleton, EmptyState } from "../../components/ui/States";
import { Modal } from "../../components/ui/Modal";
import { useToastStore } from "../../store/uiStore";
import type { BacktestListItemDto } from "../../types/domain";

const STATUS_LABELS = ["Queued", "Running", "Completed", "Failed"];

export default function BacktestingPage() {
  const queryClient = useQueryClient();
  const pushToast = useToastStore((s) => s.push);
  const [runOpen, setRunOpen] = useState(false);
  const [viewingId, setViewingId] = useState<string | null>(null);

  const { data: backtests, isLoading } = useQuery({ queryKey: ["backtests"], queryFn: BacktestsApi.history, refetchInterval: 5000 });
  const { data: pairs } = useQuery({ queryKey: ["admin-pairs-lite"], queryFn: () => MarketDataApi.pairs(true) });
  const { data: strategies } = useQuery({ queryKey: ["admin-strategies"], queryFn: StrategiesApi.all });
  const { data: result } = useQuery({ queryKey: ["backtest-result", viewingId], queryFn: () => BacktestsApi.result(viewingId!), enabled: !!viewingId });

  const { register, handleSubmit } = useForm({
    defaultValues: { name: "", tradingPairId: "", timeframe: 60, strategyVersionId: "", duration: 60, inSampleStartUtc: "", inSampleEndUtc: "", confidenceThresholdOverride: 80 },
  });

  const run = useMutation({
    mutationFn: (v: any) => {
      const form = new FormData();
      Object.entries(v).forEach(([k, val]) => form.append(k, k.includes("Utc") ? new Date(val as string).toISOString() : String(val)));
      return BacktestsApi.run(form);
    },
    onSuccess: () => {
      pushToast("Backtest queued.", "success");
      setRunOpen(false);
      queryClient.invalidateQueries({ queryKey: ["backtests"] });
    },
    onError: (err) => pushToast(apiErrorMessage(err), "error"),
  });

  const columns: Column<BacktestListItemDto>[] = [
    { header: "Name", render: (b) => b.name },
    { header: "Status", render: (b) => <span className={b.status === 2 ? "badge-up" : b.status === 3 ? "badge-down" : "badge-neutral"}>{STATUS_LABELS[b.status]}</span> },
    { header: "Win rate", render: (b) => (b.winRate !== undefined ? `${b.winRate.toFixed(1)}%` : "—") },
    { header: "Created", render: (b) => new Date(b.createdAtUtc).toLocaleString() },
    { header: "", render: (b) => <button className="text-xs text-cyan-400 hover:underline" onClick={() => setViewingId(b.id)}>View</button> },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="page-heading">Strategy Backtesting</h1>
        <button className="btn-primary" onClick={() => setRunOpen(true)}>Run backtest</button>
      </div>

      {isLoading ? (
        <LoadingSkeleton rows={4} />
      ) : !backtests || backtests.length === 0 ? (
        <EmptyState title="No backtests yet" action={<button className="btn-primary" onClick={() => setRunOpen(true)}>Run your first backtest</button>} />
      ) : (
        <DataTable columns={columns} rows={backtests} keyOf={(b) => b.id} />
      )}

      <Modal
        open={runOpen}
        onClose={() => setRunOpen(false)}
        title="Run backtest"
        footer={<><button className="btn-secondary" onClick={() => setRunOpen(false)}>Cancel</button><button className="btn-primary" disabled={run.isPending} onClick={handleSubmit((v) => run.mutate(v))}>Run</button></>}
      >
        <form className="space-y-3">
          <div><label className="label-text">Name</label><input className="input-field" {...register("name")} /></div>
          <div>
            <label className="label-text">Trading pair</label>
            <select className="input-field" {...register("tradingPairId")}>
              <option value="">Select a pair</option>
              {pairs?.map((p) => <option key={p.id} value={p.id}>{p.displayName}</option>)}
            </select>
          </div>
          <div>
            <label className="label-text">Strategy version</label>
            <select className="input-field" {...register("strategyVersionId")}>
              <option value="">Select a strategy</option>
              {strategies?.map((s) => s.versions.filter((v) => v.isActive).map((v) => (
                <option key={v.id} value={v.id}>{s.name} v{v.versionNumber}</option>
              )))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label-text">In-sample start</label><input type="datetime-local" className="input-field" {...register("inSampleStartUtc")} /></div>
            <div><label className="label-text">In-sample end</label><input type="datetime-local" className="input-field" {...register("inSampleEndUtc")} /></div>
          </div>
          <div><label className="label-text">Confidence threshold override</label><input type="number" className="input-field" {...register("confidenceThresholdOverride", { valueAsNumber: true })} /></div>
          <p className="text-xs text-slate-500">Requires historical 1-minute candle data already imported for this pair (via Market Pair CSV import).</p>
        </form>
      </Modal>

      <Modal open={!!viewingId} onClose={() => setViewingId(null)} title={result?.name ?? "Backtest result"}>
        {result?.status === 3 && <p className="text-signal-down text-sm">{result.errorMessage}</p>}
        {result?.summary && (
          <div className="grid grid-cols-3 gap-3 text-sm">
            <div><p className="text-slate-500 text-xs">Total</p><p className="text-slate-200 font-semibold">{result.summary.totalSignals}</p></div>
            <div><p className="text-slate-500 text-xs">Win rate</p><p className="text-signal-up font-semibold">{result.summary.winRate.toFixed(1)}%</p></div>
            <div><p className="text-slate-500 text-xs">Max losing streak</p><p className="text-signal-down font-semibold">{result.summary.maxLosingStreak}</p></div>
            <div><p className="text-slate-500 text-xs">Wins</p><p className="text-slate-200">{result.summary.wins}</p></div>
            <div><p className="text-slate-500 text-xs">Losses</p><p className="text-slate-200">{result.summary.losses}</p></div>
            <div><p className="text-slate-500 text-xs">Avg. confidence</p><p className="text-slate-200">{result.summary.averageConfidence.toFixed(1)}%</p></div>
          </div>
        )}
        {viewingId && (
          <a className="btn-secondary text-xs mt-4 inline-block" href={`${import.meta.env.VITE_API_BASE_URL}/api/backtests/${viewingId}/export`} target="_blank" rel="noreferrer">
            Export trades CSV
          </a>
        )}
      </Modal>
    </div>
  );
}
