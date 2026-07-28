import { useState } from "react";
import { useForm } from "react-hook-form";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { SubscriptionsApi, apiErrorMessage } from "../../api/endpoints";
import { DataTable, type Column } from "../../components/ui/DataTable";
import { LoadingSkeleton } from "../../components/ui/States";
import { Modal } from "../../components/ui/Modal";
import { useToastStore } from "../../store/uiStore";
import type { SubscriptionPlanDto } from "../../types/domain";

const emptyForm = {
  name: "", description: "", monthlyPrice: 0, annualPrice: 0, currency: "USD", isActive: true,
  maxSignalsPerDay: 5, allowAllPairs: false, allowedPairsCsv: "", signalDelaySeconds: 60, signalHistoryDays: 7,
  analyticsAccess: false, backtestingAccess: false, notificationAccess: true, otcPairsAccess: false,
};

export default function SubscriptionManagementPage() {
  const queryClient = useQueryClient();
  const pushToast = useToastStore((s) => s.push);
  const [editingId, setEditingId] = useState<string | null | undefined>(undefined);

  const { data: plans, isLoading } = useQuery({ queryKey: ["admin-plans"], queryFn: () => SubscriptionsApi.plans(false) });
  const { register, handleSubmit, reset } = useForm({ defaultValues: emptyForm });

  const save = useMutation({
    mutationFn: (v: typeof emptyForm) => SubscriptionsApi.upsertPlan(editingId ?? null, v),
    onSuccess: () => {
      pushToast("Plan saved.", "success");
      setEditingId(undefined);
      queryClient.invalidateQueries({ queryKey: ["admin-plans"] });
    },
    onError: (err) => pushToast(apiErrorMessage(err), "error"),
  });

  const openNew = () => { setEditingId(null); reset(emptyForm); };
  const openEdit = (p: SubscriptionPlanDto) => { setEditingId(p.id); reset({ ...p, allowedPairsCsv: "" }); };

  const columns: Column<SubscriptionPlanDto>[] = [
    { header: "Name", render: (p) => p.name },
    { header: "Monthly", render: (p) => `$${p.monthlyPrice}` },
    { header: "Signals/day", render: (p) => (p.maxSignalsPerDay === 0 ? "Unlimited" : p.maxSignalsPerDay) },
    { header: "OTC access", render: (p) => (p.otcPairsAccess ? "Yes" : "No") },
    { header: "Active", render: (p) => <span className={p.isActive ? "badge-up" : "badge-neutral"}>{p.isActive ? "Yes" : "No"}</span> },
    { header: "", render: (p) => <button className="text-xs text-cyan-400 hover:underline" onClick={() => openEdit(p)}>Edit</button> },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="page-heading">Subscription Management</h1>
        <button className="btn-primary" onClick={openNew}>New plan</button>
      </div>

      {isLoading ? <LoadingSkeleton rows={4} /> : <DataTable columns={columns} rows={plans ?? []} keyOf={(p) => p.id} />}

      <Modal
        open={editingId !== undefined}
        onClose={() => setEditingId(undefined)}
        title={editingId ? "Edit plan" : "New plan"}
        footer={
          <>
            <button className="btn-secondary" onClick={() => setEditingId(undefined)}>Cancel</button>
            <button className="btn-primary" disabled={save.isPending} onClick={handleSubmit((v) => save.mutate(v))}>Save</button>
          </>
        }
      >
        <form className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label-text">Name</label><input className="input-field" {...register("name")} /></div>
            <div><label className="label-text">Currency</label><input className="input-field" {...register("currency")} /></div>
          </div>
          <div><label className="label-text">Description</label><textarea className="input-field" rows={2} {...register("description")} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label-text">Monthly price</label><input type="number" step="0.01" className="input-field" {...register("monthlyPrice", { valueAsNumber: true })} /></div>
            <div><label className="label-text">Annual price</label><input type="number" step="0.01" className="input-field" {...register("annualPrice", { valueAsNumber: true })} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label-text">Max signals/day (0=unlimited)</label><input type="number" className="input-field" {...register("maxSignalsPerDay", { valueAsNumber: true })} /></div>
            <div><label className="label-text">Signal delay (seconds)</label><input type="number" className="input-field" {...register("signalDelaySeconds", { valueAsNumber: true })} /></div>
          </div>
          <div><label className="label-text">History days</label><input type="number" className="input-field" {...register("signalHistoryDays", { valueAsNumber: true })} /></div>
          <div><label className="label-text">Allowed pairs (comma-separated, ignored if "all pairs")</label><input className="input-field" {...register("allowedPairsCsv")} /></div>
          <div className="grid grid-cols-2 gap-2">
            <label className="flex items-center gap-2 text-sm text-slate-300"><input type="checkbox" {...register("isActive")} /> Active</label>
            <label className="flex items-center gap-2 text-sm text-slate-300"><input type="checkbox" {...register("allowAllPairs")} /> All pairs</label>
            <label className="flex items-center gap-2 text-sm text-slate-300"><input type="checkbox" {...register("otcPairsAccess")} /> OTC access</label>
            <label className="flex items-center gap-2 text-sm text-slate-300"><input type="checkbox" {...register("analyticsAccess")} /> Analytics</label>
            <label className="flex items-center gap-2 text-sm text-slate-300"><input type="checkbox" {...register("backtestingAccess")} /> Backtesting</label>
            <label className="flex items-center gap-2 text-sm text-slate-300"><input type="checkbox" {...register("notificationAccess")} /> Notifications</label>
          </div>
        </form>
      </Modal>
    </div>
  );
}
