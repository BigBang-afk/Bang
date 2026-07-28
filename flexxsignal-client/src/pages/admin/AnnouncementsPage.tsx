import { useState } from "react";
import { useForm } from "react-hook-form";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { NotificationsApi, apiErrorMessage } from "../../api/endpoints";
import { LoadingSkeleton, EmptyState } from "../../components/ui/States";
import { Modal } from "../../components/ui/Modal";
import { useToastStore } from "../../store/uiStore";

const emptyForm = { titleEn: "", bodyEn: "", titleUr: "", bodyUr: "", severity: "Info", isPublished: true };

export default function AnnouncementsPage() {
  const queryClient = useQueryClient();
  const pushToast = useToastStore((s) => s.push);
  const [open, setOpen] = useState(false);
  const { data: announcements, isLoading } = useQuery({ queryKey: ["admin-announcements"], queryFn: NotificationsApi.announcements });
  const { register, handleSubmit, reset } = useForm({ defaultValues: emptyForm });

  const save = useMutation({
    mutationFn: (v: typeof emptyForm) => NotificationsApi.upsertAnnouncement(null, v),
    onSuccess: () => {
      pushToast("Announcement published.", "success");
      setOpen(false);
      reset(emptyForm);
      queryClient.invalidateQueries({ queryKey: ["admin-announcements"] });
    },
    onError: (err) => pushToast(apiErrorMessage(err), "error"),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="page-heading">Announcements</h1>
        <button className="btn-primary" onClick={() => setOpen(true)}>New announcement</button>
      </div>

      {isLoading ? (
        <LoadingSkeleton rows={3} />
      ) : !announcements || announcements.length === 0 ? (
        <EmptyState title="No announcements" />
      ) : (
        <div className="space-y-3">
          {announcements.map((a) => (
            <div key={a.id} className="glass-card p-4">
              <div className="flex items-center gap-2">
                <span className={a.severity === "Critical" ? "badge-down" : a.severity === "Warning" ? "badge-gold" : "badge-neutral"}>{a.severity}</span>
                <h3 className="font-semibold text-slate-100">{a.titleEn}</h3>
              </div>
              <p className="text-sm text-slate-400 mt-1">{a.bodyEn}</p>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="New announcement"
        footer={<><button className="btn-secondary" onClick={() => setOpen(false)}>Cancel</button><button className="btn-primary" disabled={save.isPending} onClick={handleSubmit((v) => save.mutate(v))}>Publish</button></>}
      >
        <form className="space-y-3">
          <div><label className="label-text">Title (English)</label><input className="input-field" {...register("titleEn")} /></div>
          <div><label className="label-text">Body (English)</label><textarea className="input-field" rows={3} {...register("bodyEn")} /></div>
          <div><label className="label-text">Title (Urdu, optional)</label><input className="input-field" {...register("titleUr")} /></div>
          <div><label className="label-text">Body (Urdu, optional)</label><textarea className="input-field" rows={2} {...register("bodyUr")} /></div>
          <div>
            <label className="label-text">Severity</label>
            <select className="input-field" {...register("severity")}>
              <option>Info</option>
              <option>Warning</option>
              <option>Critical</option>
            </select>
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-300"><input type="checkbox" {...register("isPublished")} /> Publish immediately</label>
        </form>
      </Modal>
    </div>
  );
}
