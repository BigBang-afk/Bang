import { useState } from "react";
import { useForm } from "react-hook-form";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { StrategiesApi, apiErrorMessage } from "../../api/endpoints";
import { LoadingSkeleton } from "../../components/ui/States";
import { Modal } from "../../components/ui/Modal";
import { useToastStore } from "../../store/uiStore";
import type { StrategyDto } from "../../types/domain";

const STATUS_LABELS = ["Disabled", "Enabled", "Testing"];

const weightFields = [
  ["weightTrendAlignment", "Trend alignment"], ["weightMarketStructure", "Market structure"],
  ["weightCandlePressure", "Candle pressure"], ["weightMomentum", "Momentum"],
  ["weightSupportResistance", "Support/resistance"], ["weightBreakoutRejection", "Breakout/rejection"],
  ["weightMultiTimeframeAgreement", "Multi-timeframe"], ["weightVolatilityQuality", "Volatility quality"],
  ["weightHistoricalPerformance", "Historical performance"],
] as const;

export default function StrategyManagementPage() {
  const queryClient = useQueryClient();
  const pushToast = useToastStore((s) => s.push);
  const [selected, setSelected] = useState<StrategyDto | null>(null);
  const [versionModalOpen, setVersionModalOpen] = useState(false);

  const { data: strategies, isLoading } = useQuery({ queryKey: ["admin-strategies"], queryFn: StrategiesApi.all });

  const toggleStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: number }) => StrategiesApi.updateStatus(id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-strategies"] }),
  });

  const activateVersion = useMutation({
    mutationFn: (versionId: string) => StrategiesApi.activateVersion(versionId),
    onSuccess: () => {
      pushToast("Version activated.", "success");
      queryClient.invalidateQueries({ queryKey: ["admin-strategies"] });
    },
  });

  const latestVersion = selected?.versions[0];
  const { register, handleSubmit } = useForm({
    values: latestVersion ? {
      changeNotes: "", weightTrendAlignment: latestVersion.weightTrendAlignment, weightMarketStructure: latestVersion.weightMarketStructure,
      weightCandlePressure: latestVersion.weightCandlePressure, weightMomentum: latestVersion.weightMomentum,
      weightSupportResistance: latestVersion.weightSupportResistance, weightBreakoutRejection: latestVersion.weightBreakoutRejection,
      weightMultiTimeframeAgreement: latestVersion.weightMultiTimeframeAgreement, weightVolatilityQuality: latestVersion.weightVolatilityQuality,
      weightHistoricalPerformance: latestVersion.weightHistoricalPerformance, minimumPublishConfidence: latestVersion.minimumPublishConfidence,
    } : undefined,
  });

  const createVersion = useMutation({
    mutationFn: (v: any) => StrategiesApi.createVersion({ ...v, strategyId: selected!.id, parameters: {}, activateImmediately: true }),
    onSuccess: () => {
      pushToast("New strategy version created and activated.", "success");
      setVersionModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ["admin-strategies"] });
    },
    onError: (err) => pushToast(apiErrorMessage(err), "error"),
  });

  if (isLoading) return <LoadingSkeleton rows={4} />;

  return (
    <div className="space-y-6">
      <h1 className="page-heading">Strategy Management</h1>

      <div className="grid md:grid-cols-2 gap-4">
        {strategies?.map((s) => (
          <div key={s.id} className="glass-card p-5">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-slate-100">{s.name}</h3>
                <p className="text-xs text-slate-500 mt-0.5">{s.key}</p>
              </div>
              <span className={s.status === 1 ? "badge-up" : "badge-neutral"}>{STATUS_LABELS[s.status]}</span>
            </div>
            <p className="text-sm text-slate-400 mt-2">{s.description}</p>
            <div className="flex items-center justify-between mt-4 text-xs text-slate-500">
              <span>{s.versions.length} version(s) · v{s.versions.find((v) => v.isActive)?.versionNumber ?? "-"} active</span>
              <span>Max {s.maxSignalsPerHour}/hr · {s.dailyLossLimitPercent}% daily loss cap</span>
            </div>
            <div className="flex gap-2 mt-4">
              <button
                className="btn-secondary text-xs flex-1"
                onClick={() => toggleStatus.mutate({ id: s.id, status: s.status === 1 ? 0 : 1 })}
              >
                {s.status === 1 ? "Disable" : "Enable"}
              </button>
              <button className="btn-primary text-xs flex-1" onClick={() => { setSelected(s); setVersionModalOpen(true); }}>
                Tune weights
              </button>
            </div>
            {s.versions.length > 1 && (
              <div className="mt-3 pt-3 border-t border-white/10 space-y-1">
                {s.versions.map((v) => (
                  <div key={v.id} className="flex items-center justify-between text-xs">
                    <span className={v.isActive ? "text-cyan-400" : "text-slate-500"}>v{v.versionNumber} — min conf. {v.minimumPublishConfidence}%</span>
                    {!v.isActive && <button className="text-cyan-400 hover:underline" onClick={() => activateVersion.mutate(v.id)}>Activate</button>}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <Modal
        open={versionModalOpen}
        onClose={() => setVersionModalOpen(false)}
        title={`Tune confidence weights: ${selected?.name}`}
        footer={
          <>
            <button className="btn-secondary" onClick={() => setVersionModalOpen(false)}>Cancel</button>
            <button className="btn-primary" disabled={createVersion.isPending} onClick={handleSubmit((v) => createVersion.mutate(v))}>
              Save as new version
            </button>
          </>
        }
      >
        <form className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
          <p className="text-xs text-slate-500">Weights should sum to 100. Saving creates and activates a new version, so history stays reproducible.</p>
          <div className="grid grid-cols-2 gap-3">
            {weightFields.map(([key, label]) => (
              <div key={key}>
                <label className="label-text">{label}</label>
                <input type="number" step="0.5" className="input-field" {...register(key as any, { valueAsNumber: true })} />
              </div>
            ))}
          </div>
          <div>
            <label className="label-text">Minimum publish confidence</label>
            <input type="number" step="0.5" className="input-field" {...register("minimumPublishConfidence", { valueAsNumber: true })} />
          </div>
          <div>
            <label className="label-text">Change notes</label>
            <textarea className="input-field" rows={2} {...register("changeNotes")} />
          </div>
        </form>
      </Modal>
    </div>
  );
}
