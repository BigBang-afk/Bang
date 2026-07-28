import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { AuthApi, apiErrorMessage } from "../../api/endpoints";
import { useToastStore } from "../../store/uiStore";

const schema = z.object({
  currentPassword: z.string().min(1, "Required."),
  newPassword: z.string().min(8, "Password must be at least 8 characters."),
});
type FormValues = z.infer<typeof schema>;

export default function SecuritySettingsPage() {
  const pushToast = useToastStore((s) => s.push);
  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const mutation = useMutation({
    mutationFn: AuthApi.changePassword,
    onSuccess: () => {
      pushToast("Password changed successfully.", "success");
      reset();
    },
    onError: (err) => pushToast(apiErrorMessage(err), "error"),
  });

  return (
    <div className="space-y-6 max-w-xl">
      <h1 className="page-heading">Security Settings</h1>

      <div className="glass-card p-6">
        <h2 className="text-lg font-semibold text-slate-100 mb-4">Change password</h2>
        <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="space-y-4">
          <div>
            <label className="label-text">Current password</label>
            <input type="password" className="input-field" {...register("currentPassword")} />
            {errors.currentPassword && <p className="text-signal-down text-xs mt-1">{errors.currentPassword.message}</p>}
          </div>
          <div>
            <label className="label-text">New password</label>
            <input type="password" className="input-field" {...register("newPassword")} />
            {errors.newPassword && <p className="text-signal-down text-xs mt-1">{errors.newPassword.message}</p>}
          </div>
          <button type="submit" className="btn-primary" disabled={mutation.isPending}>
            {mutation.isPending ? "Updating..." : "Update password"}
          </button>
        </form>
      </div>

      <div className="glass-card p-6">
        <h2 className="text-lg font-semibold text-slate-100 mb-2">Two-factor authentication</h2>
        <p className="text-sm text-slate-400">
          FlexX Signal's account model is 2FA-ready. Two-factor enrollment via authenticator app will appear here
          once enabled by your administrator.
        </p>
      </div>

      <div className="glass-card p-6">
        <h2 className="text-lg font-semibold text-slate-100 mb-2">Account safety</h2>
        <p className="text-sm text-slate-400">
          We never store your trading-platform (e.g. Quotex) username, password, cookies or session tokens.
          FlexX Signal only manages your own platform account.
        </p>
      </div>
    </div>
  );
}
