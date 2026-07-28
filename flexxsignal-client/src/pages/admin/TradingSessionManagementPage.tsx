import { useState } from "react";
import { useForm } from "react-hook-form";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MarketDataApi, apiErrorMessage } from "../../api/endpoints";
import { DataTable } from "../../components/ui/DataTable";
import type { Column } from "../../components/ui/DataTable";
import { LoadingSkeleton } from "../../components/ui/States";
import { Modal } from "../../components/ui/Modal";
import { useToastStore } from "../../store/uiStore";

interface SessionDto { id: string; name: string; tradingPairId?: string; startUtc: string; endUtc: string; isActive: boolean; daysOfWeekMask: string; maxSignalsPerHour: number; }

const emptyForm = { name: "", tradingPairId: "", startUtc: "00:00:00", endUtc: "23:59:59", isActive: true, daysOfWeekMask: "1111111", maxSignalsPerHour: 6 };

export default function TradingSessionManagementPage() {
  const queryClient = useQueryClient();
  const pushToast = useToastStore((s) => s.push);
  const [editingId, setEditingId] = useState<string | null | undefined>(undefined);
  const { data: sessions, isLoading } = useQuery({ queryKey: ["admin-sessions"], queryFn: () => MarketDataApi.sessions() as Promise<SessionDto[]> });
  const { data: pairs } = useQuery({ queryKey: ["admin-pairs-lite"], queryFn: () => MarketDataApi.pairs(false) });
  const { register, handleSubmit, reset } = useForm({ defaultValues: emptyForm });

  const save = useMutation({
    mutationFn: (v: typeof emptyForm) => MarketDataApi.upsertSession(editingId ?? null, { ...v, tradingPairId: v.tradingPairId || null }),
    onSuccess: () => {
      pushToast("Session saved.", "success");
      setEditingId(undefined);
      queryClient.invalidateQueries({ queryKey: ["admin-sessions"] });
    },
    onError: (err) => pushToast(apiErrorMessage(err), "error"),
  });

  const columns: Column<SessionDto>[] = [
    { header: "Name", render: (s) => s.name },
    { header: "Window (UTC)", render: (s) => `${s.startUtc} - ${s.endUtc}` },
    { header: "Max signals/hr", render: (s) => s.maxSignalsPerHour },
    { header: "Active", render: (s) => <span className={s.isActive ? "badge-up" : "badge-neutral"}>{s.isActive ? "Yes" : "No"}</span> },
    { header: "", render: (s) => <button className="text-xs text-cyan-400 hover:underline" onClick={() => { setEditingId(s.id); reset({ ...s, tradingPairId: s.tradingPairId ?? "" }); }}>Edit</button> },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="page-heading">Trading Session Management</h1>
        <button className="btn-primary" onClick={() => { setEditingId(null); reset(emptyForm); }}>New session</button>
      </div>
      {isLoading ? <LoadingSkeleton rows={3} /> : <DataTable columns={columns} rows={sessions ?? []} keyOf={(s) => s.id} />}

      <Modal
        open={editingId !== undefined}
        onClose={() => setEditingId(undefined)}
        title={editingId ? "Edit session" : "New session"}
        footer={<><button className="btn-secondary" onClick={() => setEditingId(undefined)}>Cancel</button><button className="btn-primary" disabled={save.isPending} onClick={handleSubmit((v) => save.mutate(v))}>Save</button></>}
      >
        <form className="space-y-3">
          <div><label className="label-text">Name</label><input className="input-field" {...register("name")} /></div>
          <div>
            <label className="label-text">Trading pair (optional — blank applies to all)</label>
            <select className="input-field" {...register("tradingPairId")}>
              <option value="">All pairs</option>
              {pairs?.map((p) => <option key={p.id} value={p.id}>{p.displayName}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label-text">Start (UTC HH:mm:ss)</label><input className="input-field" {...register("startUtc")} /></div>
            <div><label className="label-text">End (UTC HH:mm:ss)</label><input className="input-field" {...register("endUtc")} /></div>
          </div>
          <div><label className="label-text">Max signals per hour</label><input type="number" className="input-field" {...register("maxSignalsPerHour", { valueAsNumber: true })} /></div>
          <label className="flex items-center gap-2 text-sm text-slate-300"><input type="checkbox" {...register("isActive")} /> Active</label>
        </form>
      </Modal>
    </div>
  );
}
