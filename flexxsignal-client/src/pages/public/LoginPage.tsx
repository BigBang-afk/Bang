import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { AuthApi, apiErrorMessage } from "../../api/endpoints";
import { useAuthStore } from "../../store/authStore";
import { useToastStore } from "../../store/uiStore";

const schema = z.object({
  email: z.string().email("Enter a valid email address."),
  password: z.string().min(1, "Password is required."),
});
type FormValues = z.infer<typeof schema>;

export default function LoginPage() {
  const navigate = useNavigate();
  const setSession = useAuthStore((s) => s.setSession);
  const pushToast = useToastStore((s) => s.push);
  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const mutation = useMutation({
    mutationFn: AuthApi.login,
    onSuccess: (data) => {
      setSession(data);
      pushToast("Welcome back!", "success");
      navigate("/app/dashboard");
    },
    onError: (err) => pushToast(apiErrorMessage(err), "error"),
  });

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-16">
      <div className="glass-card w-full max-w-md p-8">
        <h1 className="text-2xl font-bold text-slate-100 mb-1">Log in</h1>
        <p className="text-sm text-slate-400 mb-6">Welcome back to FlexX Signal.</p>

        <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="space-y-4">
          <div>
            <label htmlFor="email" className="label-text">Email</label>
            <input id="email" type="email" autoComplete="email" className="input-field" {...register("email")} />
            {errors.email && <p className="text-signal-down text-xs mt-1">{errors.email.message}</p>}
          </div>
          <div>
            <label htmlFor="password" className="label-text">Password</label>
            <input id="password" type="password" autoComplete="current-password" className="input-field" {...register("password")} />
            {errors.password && <p className="text-signal-down text-xs mt-1">{errors.password.message}</p>}
          </div>
          <div className="flex justify-end">
            <Link to="/forgot-password" className="text-xs text-cyan-400 hover:underline">Forgot password?</Link>
          </div>
          <button type="submit" disabled={mutation.isPending} className="btn-primary w-full">
            {mutation.isPending ? "Signing in..." : "Log in"}
          </button>
        </form>

        <p className="text-sm text-slate-400 mt-6 text-center">
          Don't have an account? <Link to="/register" className="text-cyan-400 hover:underline">Register</Link>
        </p>
      </div>
    </div>
  );
}
