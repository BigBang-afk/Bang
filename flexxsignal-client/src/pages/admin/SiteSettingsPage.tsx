import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AdminApi } from "../../api/endpoints";
import { LoadingSkeleton } from "../../components/ui/States";
import { useToastStore } from "../../store/uiStore";

interface SettingDto { key: string; value: string; category: string; dataType: string; description?: string; isSecret: boolean; }

export default function SiteSettingsPage() {
  const queryClient = useQueryClient();
  const pushToast = useToastStore((s) => s.push);
  const { data: settings, isLoading } = useQuery({ queryKey: ["admin-settings"], queryFn: () => AdminApi.settings() as Promise<SettingDto[]> });
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const save = useMutation({
    mutationFn: ({ key, value }: { key: string; value: string }) => AdminApi.updateSetting(key, value),
    onSuccess: () => {
      pushToast("Setting updated.", "success");
      queryClient.invalidateQueries({ queryKey: ["admin-settings"] });
    },
  });

  if (isLoading) return <LoadingSkeleton rows={4} />;

  const categories = Array.from(new Set((settings ?? []).map((s) => s.category)));

  return (
    <div className="space-y-8">
      <h1 className="page-heading">Site Settings</h1>
      {categories.map((cat) => (
        <div key={cat} className="glass-card p-6">
          <h2 className="text-lg font-semibold text-slate-100 mb-4">{cat}</h2>
          <div className="space-y-3">
            {settings!.filter((s) => s.category === cat).map((s) => (
              <div key={s.key} className="flex items-center gap-3">
                <div className="flex-1">
                  <p className="text-sm text-slate-300">{s.key}</p>
                  {s.description && <p className="text-xs text-slate-500">{s.description}</p>}
                </div>
                <input
                  className="input-field max-w-xs"
                  defaultValue={s.value}
                  disabled={s.isSecret}
                  onChange={(e) => setDrafts((d) => ({ ...d, [s.key]: e.target.value }))}
                />
                <button
                  className="btn-secondary text-xs"
                  disabled={s.isSecret || drafts[s.key] === undefined}
                  onClick={() => save.mutate({ key: s.key, value: drafts[s.key] })}
                >
                  Save
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
