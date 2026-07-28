import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { NotificationsApi } from "../../api/endpoints";
import { LoadingSkeleton, EmptyState } from "../../components/ui/States";
import { requestBrowserNotificationPermission } from "../../components/signals/CountdownTimer";
import { useToastStore } from "../../store/uiStore";

export default function NotificationsPage() {
  const queryClient = useQueryClient();
  const pushToast = useToastStore((s) => s.push);
  const { data: notifications, isLoading } = useQuery({ queryKey: ["notifications", "all"], queryFn: () => NotificationsApi.list(false) });
  const { data: preferences } = useQuery({ queryKey: ["notification-preferences"], queryFn: NotificationsApi.preferences });

  const markAllRead = useMutation({
    mutationFn: NotificationsApi.markAllRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const { register, handleSubmit } = useForm({ values: preferences });
  const updatePrefs = useMutation({
    mutationFn: NotificationsApi.updatePreferences,
    onSuccess: () => {
      pushToast("Notification preferences saved.", "success");
      queryClient.invalidateQueries({ queryKey: ["notification-preferences"] });
    },
  });

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="page-heading">Notifications</h1>
        <button className="btn-secondary text-sm" onClick={() => markAllRead.mutate()}>Mark all read</button>
      </div>

      {isLoading ? (
        <LoadingSkeleton rows={4} />
      ) : !notifications || notifications.length === 0 ? (
        <EmptyState title="No notifications yet" />
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => (
            <div key={n.id} className={`glass-card p-4 flex items-start justify-between ${!n.isRead ? "border-l-4 border-l-cyan-400" : ""}`}>
              <div>
                <p className="text-sm font-medium text-slate-100">{n.title}</p>
                <p className="text-sm text-slate-400">{n.message}</p>
                <p className="text-xs text-slate-500 mt-1">{new Date(n.createdAtUtc).toLocaleString()}</p>
              </div>
              {!n.isRead && (
                <button className="text-xs text-cyan-400 hover:underline" onClick={() => NotificationsApi.markRead(n.id).then(() => queryClient.invalidateQueries({ queryKey: ["notifications"] }))}>
                  Mark read
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {preferences && (
        <div className="glass-card p-6">
          <h2 className="text-lg font-semibold text-slate-100 mb-4">Notification preferences</h2>
          <form onSubmit={handleSubmit((v) => updatePrefs.mutate(v))} className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <label className="flex items-center gap-2 text-sm text-slate-300"><input type="checkbox" {...register("soundEnabled")} /> Signal sound</label>
              <label className="flex items-center gap-2 text-sm text-slate-300"><input type="checkbox" {...register("browserNotificationsEnabled")} onClick={() => requestBrowserNotificationPermission()} /> Browser notifications</label>
              <label className="flex items-center gap-2 text-sm text-slate-300"><input type="checkbox" {...register("emailNotificationsEnabled")} /> Email notifications</label>
              <label className="flex items-center gap-2 text-sm text-slate-300"><input type="checkbox" {...register("notifyUpSignals")} /> Notify on UP signals</label>
              <label className="flex items-center gap-2 text-sm text-slate-300"><input type="checkbox" {...register("notifyDownSignals")} /> Notify on DOWN signals</label>
              <label className="flex items-center gap-2 text-sm text-slate-300"><input type="checkbox" {...register("upcomingSignalReminder")} /> Upcoming signal reminder</label>
            </div>
            <div>
              <label className="label-text">Minimum confidence to notify (%)</label>
              <input type="number" min={0} max={100} className="input-field max-w-xs" {...register("minimumConfidencePercent", { valueAsNumber: true })} />
            </div>
            <button type="submit" className="btn-primary">Save preferences</button>
          </form>
        </div>
      )}
    </div>
  );
}
