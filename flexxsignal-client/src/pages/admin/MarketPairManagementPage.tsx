import { useState } from "react";
import { useForm } from "react-hook-form";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MarketDataApi, apiErrorMessage } from "../../api/endpoints";
import { DataTable, type Column } from "../../components/ui/DataTable";
import { LoadingSkeleton } from "../../components/ui/States";
import { Modal } from "../../components/ui/Modal";
import { useToastStore } from "../../store/uiStore";
import type { TradingPairDto } from "../../types/domain";

const emptyForm = {
  symbol: "", displayName: "", marketType: 0, baseCurrency: "", quoteCurrency: "", isActive: true,
  currentPayoutPercent: 80, providerSymbolMapping: "", pricePrecision: 5, requiresPremium: false,
};

export default function MarketPairManagementPage() {
  const queryClient = useQueryClient();
  const pushToast = useToastStore((s) => s.push);
  const [editingId, setEditingId] = useState<string | null | undefined>(undefined);
  const { data: pairs, isLoading } = useQuery({ queryKey: ["admin-pairs"], queryFn: () => MarketDataApi.pairs(false) });
  const { register, handleSubmit, reset } = useForm({ defaultValues: emptyForm });

  const save = useMutation({
    mutationFn: (v: typeof emptyForm) => MarketDataApi.upsertPair(editingId ?? null, { ...v, marketType: Number(v.marketType) }),
    onSuccess: () => {
      pushToast("Pair saved.", "success");
      setEditingId(undefined);
      queryClient.invalidateQueries({ queryKey: ["admin-pairs"] });
    },
    onError: (err) => pushToast(apiErrorMessage(err), "error"),
  });

  const openNew = () => { setEditingId(null); reset(emptyForm); };
  const openEdit = (p: TradingPairDto) => { setEditingId(p.id); reset({ ...p, baseCurrency: "", quoteCurrency: "", providerSymbolMapping: p.symbol }); };

  const columns: Column<TradingPairDto>[] = [
    { header: "Symbol", render: (p) => p.symbol },
    { header: "Display name", render: (p) => p.displayName },
    { header: "Type", render: (p) => (p.marketType === 1 ? "OTC" : "Regular") },
    { header: "Payout", render: (p) => `${p.currentPayoutPercent}%` },
    { header: "Active", render: (p) => <span className={p.isActive ? "badge-up" : "badge-neutral"}>{p.isActive ? "Yes" : "No"}</span> },
    { header: "", render: (p) => <button className="text-xs text-cyan-400 hover:underline" onClick={() => openEdit(p)}>Edit</button> },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="page-heading">Market Pair Management</h1>
        <button className="btn-primary" onClick={openNew}>New pair</button>
      </div>
      {isLoading ? <LoadingSkeleton rows={5} /> : <DataTable columns={columns} rows={pairs ?? []} keyOf={(p) => p.id} />}

      <Modal
        open={editingId !== undefined}
        onClose={() => setEditingId(undefined)}
        title={editingId ? "Edit pair" : "New pair"}
        footer={<><button className="btn-secondary" onClick={() => setEditingId(undefined)}>Cancel</button><button className="btn-primary" disabled={save.isPending} onClick={handleSubmit((v) => save.mutate(v))}>Save</button></>}
      >
        <form className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label-text">Symbol</label><input className="input-field" {...register("symbol")} /></div>
            <div><label className="label-text">Display name</label><input className="input-field" {...register("displayName")} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label-text">Base currency</label><input className="input-field" {...register("baseCurrency")} /></div>
            <div><label className="label-text">Quote currency</label><input className="input-field" {...register("quoteCurrency")} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-text">Market type</label>
              <select className="input-field" {...register("marketType", { valueAsNumber: true })}>
                <option value={0}>Regular</option>
                <option value={1}>OTC</option>
              </select>
            </div>
            <div><label className="label-text">Payout %</label><input type="number" step="0.01" className="input-field" {...register("currentPayoutPercent", { valueAsNumber: true })} /></div>
          </div>
          <div><label className="label-text">Provider symbol mapping</label><input className="input-field" {...register("providerSymbolMapping")} /></div>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-sm text-slate-300"><input type="checkbox" {...register("isActive")} /> Active</label>
            <label className="flex items-center gap-2 text-sm text-slate-300"><input type="checkbox" {...register("requiresPremium")} /> Requires premium</label>
          </div>
        </form>
      </Modal>
    </div>
  );
}
