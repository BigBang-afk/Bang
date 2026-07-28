import { useState } from "react";
import { useForm } from "react-hook-form";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MarketDataApi, apiErrorMessage } from "../../api/endpoints";
import { DataTable, type Column } from "../../components/ui/DataTable";
import { LoadingSkeleton } from "../../components/ui/States";
import { Modal } from "../../components/ui/Modal";
import { useToastStore } from "../../store/uiStore";
import type { ProviderConfigurationDto } from "../../types/domain";

const PROVIDER_TYPES = ["Demo", "CSV Import", "Authorized WebSocket", "Authorized REST", "Quotex (Read-Only)"];
const STATUS = ["Disconnected", "Connecting", "Connected", "Reconnecting", "Faulted"];

const emptyForm = {
  name: "", providerType: 0, isActive: false, apiEndpoint: "", apiKey: "",
  connectionTimeoutSeconds: 15, reconnectIntervalSeconds: 5, maxReconnectAttempts: 10,
  timeZoneId: "UTC", candleAlignmentMode: "ExchangeClock", pairMappingJson: "{}", csvImportDirectory: "",
};

export default function DataProviderSettingsPage() {
  const queryClient = useQueryClient();
  const pushToast = useToastStore((s) => s.push);
  const [editingId, setEditingId] = useState<string | null | undefined>(undefined);
  const { data: providers, isLoading } = useQuery({ queryKey: ["admin-providers"], queryFn: MarketDataApi.providers });
  const { register, handleSubmit, reset } = useForm({ defaultValues: emptyForm });

  const save = useMutation({
    mutationFn: (v: typeof emptyForm) => MarketDataApi.upsertProvider(editingId ?? null, { ...v, providerType: Number(v.providerType) }),
    onSuccess: () => {
      pushToast("Provider configuration saved.", "success");
      setEditingId(undefined);
      queryClient.invalidateQueries({ queryKey: ["admin-providers"] });
    },
    onError: (err) => pushToast(apiErrorMessage(err), "error"),
  });

  const columns: Column<ProviderConfigurationDto>[] = [
    { header: "Name", render: (p) => p.name },
    { header: "Type", render: (p) => PROVIDER_TYPES[p.providerType] },
    { header: "Status", render: (p) => <span className={p.lastKnownStatus === 2 ? "badge-up" : "badge-neutral"}>{STATUS[p.lastKnownStatus]}</span> },
    { header: "Active", render: (p) => <span className={p.isActive ? "badge-up" : "badge-neutral"}>{p.isActive ? "Yes" : "No"}</span> },
    { header: "", render: (p) => <button className="text-xs text-cyan-400 hover:underline" onClick={() => { setEditingId(p.id); reset({ ...p, apiKey: "" }); }}>Edit</button> },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="page-heading">Data Provider Settings</h1>
        <button className="btn-primary" onClick={() => { setEditingId(null); reset(emptyForm); }}>New provider</button>
      </div>
      <p className="text-sm text-slate-400">
        Only one configuration may be active at a time. Demo data is always clearly labeled and never presented as live pricing.
      </p>

      {isLoading ? <LoadingSkeleton rows={3} /> : <DataTable columns={columns} rows={providers ?? []} keyOf={(p) => p.id} />}

      <Modal
        open={editingId !== undefined}
        onClose={() => setEditingId(undefined)}
        title={editingId ? "Edit provider" : "New provider"}
        footer={<><button className="btn-secondary" onClick={() => setEditingId(undefined)}>Cancel</button><button className="btn-primary" disabled={save.isPending} onClick={handleSubmit((v) => save.mutate(v))}>Save</button></>}
      >
        <form className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
          <div><label className="label-text">Name</label><input className="input-field" {...register("name")} /></div>
          <div>
            <label className="label-text">Provider type</label>
            <select className="input-field" {...register("providerType", { valueAsNumber: true })}>
              {PROVIDER_TYPES.map((t, i) => <option key={t} value={i}>{t}</option>)}
            </select>
          </div>
          <div><label className="label-text">API endpoint</label><input className="input-field" {...register("apiEndpoint")} placeholder="wss://, https://, or the quotex-sidecar internal URL" /></div>
          <div><label className="label-text">API key</label><input type="password" className="input-field" {...register("apiKey")} placeholder="Not used for Quotex — credentials live only in the sidecar" /></div>
          <div className="grid grid-cols-3 gap-3">
            <div><label className="label-text">Timeout (s)</label><input type="number" className="input-field" {...register("connectionTimeoutSeconds", { valueAsNumber: true })} /></div>
            <div><label className="label-text">Reconnect (s)</label><input type="number" className="input-field" {...register("reconnectIntervalSeconds", { valueAsNumber: true })} /></div>
            <div><label className="label-text">Max attempts</label><input type="number" className="input-field" {...register("maxReconnectAttempts", { valueAsNumber: true })} /></div>
          </div>
          <div><label className="label-text">Time zone</label><input className="input-field" {...register("timeZoneId")} /></div>
          <div><label className="label-text">CSV import directory (CSV provider only)</label><input className="input-field" {...register("csvImportDirectory")} /></div>
          <label className="flex items-center gap-2 text-sm text-slate-300"><input type="checkbox" {...register("isActive")} /> Set as active provider</label>
        </form>
      </Modal>
    </div>
  );
}
