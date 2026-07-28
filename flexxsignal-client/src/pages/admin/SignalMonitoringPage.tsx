import { useState } from "react";
import { useForm } from "react-hook-form";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { SignalsApi, MarketDataApi, StrategiesApi, apiErrorMessage } from "../../api/endpoints";
import { DataTable, type Column } from "../../components/ui/DataTable";
import { LoadingSkeleton } from "../../components/ui/States";
import { Modal, ConfirmDialog } from "../../components/ui/Modal";
import { DirectionBadge, ResultBadge } from "../../components/signals/ResultBadge";
import { useToastStore } from "../../store/uiStore";
import type { SignalListItemDto } from "../../types/domain";

export default function SignalMonitoringPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const pushToast = useToastStore((s) => s.push);
  const [createOpen, setCreateOpen] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<SignalListItemDto | null>(null);

  const { data, isLoading } = useQuery({ queryKey: ["admin-signals"], queryFn: () => SignalsApi.history({ page: 1, pageSize: 100 }) });
  const { data: pairs } = useQuery({ queryKey: ["admin-pairs-lite"], queryFn: () => MarketDataApi.pairs(true) });
  const { data: strategies } = useQuery({ queryKey: ["admin-strategies"], queryFn: StrategiesApi.all });

  const { register, handleSubmit, reset } = useForm({
    defaultValues: { pairSymbol: "", direction: 0, duration: 60, timeframe: 60, entryTimeUtc: "", confidencePercent: 85, analysisExplanationEn: "", strategyVersionId: "" },
  });

  const createManual = useMutation({
    mutationFn: (v: any) => SignalsApi.createManual({ ...v, entryTimeUtc: new Date(v.entryTimeUtc).toISOString() }),
    onSuccess: () => {
      pushToast("Manual signal created.", "success");
      setCreateOpen(false);
      reset();
      queryClient.invalidateQueries({ queryKey: ["admin-signals"] });
    },
    onError: (err) => pushToast(apiErrorMessage(err), "error"),
  });

  const cancel = useMutation({
    mutationFn: () => SignalsApi.cancel(cancelTarget!.id, "Canceled by administrator via Signal Monitoring."),
    onSuccess: () => {
      pushToast("Signal canceled.", "success");
      setCancelTarget(null);
      queryClient.invalidateQueries({ queryKey: ["admin-signals"] });
    },
  });

  const columns: Column<SignalListItemDto>[] = [
    { header: "Trade #", render: (s) => s.tradeNumber },
    { header: "Pair", render: (s) => s.pairSymbol },
    { header: "Direction", render: (s) => <DirectionBadge direction={s.direction} /> },
    { header: "Confidence", render: (s) => `${s.confidencePercent.toFixed(1)}%` },
    { header: "Status", render: (s) => <ResultBadge status={s.status} /> },
    { header: "Entry", render: (s) => new Date(s.entryTimeUtc).toLocaleString() },
    {
      header: "Actions",
      render: (s) => (
        <div className="flex gap-2">
          <button className="text-xs text-cyan-400 hover:underline" onClick={() => navigate(`/app/signals/${s.id}`)}>View</button>
          {(s.status === 1 || s.status === 2) && (
            <button className="text-xs text-signal-down hover:underline" onClick={() => setCancelTarget(s)}>Cancel</button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="page-heading">Signal Monitoring</h1>
        <button className="btn-primary" onClick={() => setCreateOpen(true)}>Create manual signal</button>
      </div>

      {isLoading ? <LoadingSkeleton rows={6} /> : <DataTable columns={columns} rows={data?.items ?? []} keyOf={(s) => s.id} />}

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Create manual signal"
        footer={<><button className="btn-secondary" onClick={() => setCreateOpen(false)}>Cancel</button><button className="btn-primary" disabled={createManual.isPending} onClick={handleSubmit((v) => createManual.mutate(v))}>Publish</button></>}
      >
        <form className="space-y-3">
          <div>
            <label className="label-text">Pair</label>
            <select className="input-field" {...register("pairSymbol")}>
              <option value="">Select a pair</option>
              {pairs?.map((p) => <option key={p.id} value={p.symbol}>{p.displayName}</option>)}
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
            <div>
              <label className="label-text">Direction</label>
              <select className="input-field" {...register("direction", { valueAsNumber: true })}>
                <option value={0}>UP</option>
                <option value={1}>DOWN</option>
              </select>
            </div>
            <div><label className="label-text">Confidence %</label><input type="number" className="input-field" {...register("confidencePercent", { valueAsNumber: true })} /></div>
          </div>
          <div><label className="label-text">Entry time</label><input type="datetime-local" className="input-field" {...register("entryTimeUtc")} /></div>
          <div><label className="label-text">Analysis explanation</label><textarea className="input-field" rows={3} {...register("analysisExplanationEn")} /></div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!cancelTarget}
        title="Cancel signal"
        message={`Cancel signal for trade #${cancelTarget?.tradeNumber}? This action is audited.`}
        confirmLabel="Cancel signal"
        danger
        onConfirm={() => cancel.mutate()}
        onCancel={() => setCancelTarget(null)}
      />
    </div>
  );
}
