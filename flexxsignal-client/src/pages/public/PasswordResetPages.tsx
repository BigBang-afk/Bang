import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { AuthApi, apiErrorMessage } from "../../api/endpoints";
import { useToastStore } from "../../store/uiStore";

const forgotSchema = z.object({ email: z.string().email("Enter a valid email address.") });

export function ForgotPasswordPage() {
  const pushToast = useToastStore((s) => s.push);
  const { register, handleSubmit, formState: { errors } } = useForm<z.infer<typeof forgotSchema>>({ resolver: zodResolver(forgotSchema) });
  const mutation = useMutation({
    mutationFn: (v: { email: string }) => AuthApi.forgotPassword(v.email),
    onSuccess: () => pushToast("If an account with this email exists, a reset link has been sent.", "info"),
    onError: (err) => pushToast(apiErrorMessage(err), "error"),
  });

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-16">
      <div className="glass-card w-full max-w-md p-8">
        <h1 className="text-2xl font-bold text-slate-100 mb-1">Forgot password</h1>
        <p className="text-sm text-slate-400 mb-6">We'll send reset instructions to your email.</p>
        <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="space-y-4">
          <div>
            <label htmlFor="email" className="label-text">Email</label>
            <input id="email" type="email" className="input-field" {...register("email")} />
            {errors.email && <p className="text-signal-down text-xs mt-1">{errors.email.message}</p>}
          </div>
          <button type="submit" disabled={mutation.isPending} className="btn-primary w-full">
            {mutation.isPending ? "Sending..." : "Send reset instructions"}
          </button>
        </form>
        <p className="text-sm text-slate-400 mt-6 text-center">
          <Link to="/login" className="text-cyan-400 hover:underline">Back to login</Link>
        </p>
      </div>
    </div>
  );
}

const resetSchema = z.object({
  email: z.string().email(),
  token: z.string().min(1, "Reset token is required."),
  newPassword: z.string().min(8, "Password must be at least 8 characters."),
});

export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const pushToast = useToastStore((s) => s.push);
  const { register, handleSubmit, formState: { errors } } = useForm<z.infer<typeof resetSchema>>({
    resolver: zodResolver(resetSchema),
    defaultValues: { email: params.get("email") ?? "", token: params.get("token") ?? "" },
  });

  const mutation = useMutation({
    mutationFn: AuthApi.resetPassword,
    onSuccess: () => {
      pushToast("Password reset successfully. Please log in.", "success");
      navigate("/login");
    },
    onError: (err) => pushToast(apiErrorMessage(err), "error"),
  });

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-16">
      <div className="glass-card w-full max-w-md p-8">
        <h1 className="text-2xl font-bold text-slate-100 mb-1">Reset password</h1>
        <p className="text-sm text-slate-400 mb-6">Enter the reset token from your email along with a new password.</p>
        <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="space-y-4">
          <div>
            <label htmlFor="email" className="label-text">Email</label>
            <input id="email" type="email" className="input-field" {...register("email")} />
          </div>
          <div>
            <label htmlFor="token" className="label-text">Reset token</label>
            <input id="token" className="input-field" {...register("token")} />
            {errors.token && <p className="text-signal-down text-xs mt-1">{errors.token.message}</p>}
          </div>
          <div>
            <label htmlFor="newPassword" className="label-text">New password</label>
            <input id="newPassword" type="password" className="input-field" {...register("newPassword")} />
            {errors.newPassword && <p className="text-signal-down text-xs mt-1">{errors.newPassword.message}</p>}
          </div>
          <button type="submit" disabled={mutation.isPending} className="btn-primary w-full">
            {mutation.isPending ? "Resetting..." : "Reset password"}
          </button>
        </form>
      </div>
    </div>
  );
}
