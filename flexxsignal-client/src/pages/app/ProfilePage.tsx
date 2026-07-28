import { useForm } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AuthApi, apiErrorMessage } from "../../api/endpoints";
import { LoadingSkeleton } from "../../components/ui/States";
import { useToastStore } from "../../store/uiStore";

interface ProfileForm { displayName: string; preferredLanguage: string; timeZoneId: string; themePreference: string; }

export default function ProfilePage() {
  const queryClient = useQueryClient();
  const pushToast = useToastStore((s) => s.push);
  const { data: profile, isLoading } = useQuery({ queryKey: ["profile"], queryFn: AuthApi.me });
  const { register, handleSubmit } = useForm<ProfileForm>({ values: profile });

  const mutation = useMutation({
    mutationFn: AuthApi.updateMe,
    onSuccess: () => {
      pushToast("Profile updated.", "success");
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
    onError: (err) => pushToast(apiErrorMessage(err), "error"),
  });

  if (isLoading) return <LoadingSkeleton rows={3} />;

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="page-heading">Profile</h1>
      <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="glass-card p-6 space-y-4">
        <div>
          <label className="label-text">Display name</label>
          <input className="input-field" {...register("displayName")} />
        </div>
        <div>
          <label className="label-text">Email</label>
          <input className="input-field opacity-60" value={profile?.email} disabled />
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="label-text">Analysis language</label>
            <select className="input-field" {...register("preferredLanguage")}>
              <option value="en">English</option>
              <option value="ur">Urdu / Hinglish</option>
            </select>
          </div>
          <div>
            <label className="label-text">Theme</label>
            <select className="input-field" {...register("themePreference")}>
              <option value="dark">Dark</option>
              <option value="light">Light</option>
            </select>
          </div>
        </div>
        <div>
          <label className="label-text">Time zone</label>
          <input className="input-field" placeholder="e.g. Asia/Karachi" {...register("timeZoneId")} />
        </div>
        <button type="submit" className="btn-primary" disabled={mutation.isPending}>
          {mutation.isPending ? "Saving..." : "Save changes"}
        </button>
      </form>
    </div>
  );
}
