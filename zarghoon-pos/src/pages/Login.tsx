import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Lock, User, Eye, EyeOff } from "lucide-react";
import Logo from "../components/Logo";
import { useAuthStore } from "../store/authStore";

export default function Login() {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const ok = login(username, password);
    if (ok) {
      navigate("/");
    } else {
      setError("Invalid username or password.");
    }
  }

  return (
    <div className="relative flex min-h-svh items-center justify-center overflow-hidden bg-ink-950 px-4">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-40 -top-40 h-96 w-96 rounded-full bg-gold-700/10 blur-[120px]" />
        <div className="absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-gold-600/10 blur-[120px]" />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "radial-gradient(circle, #d4af37 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />
      </div>

      <div className="animate-rise relative w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 scale-125">
            <Logo showText={false} size={64} />
          </div>
          <h1 className="shimmer-text font-serif text-3xl font-semibold tracking-wide">
            Zarghoon Jewellers
          </h1>
          <p className="mt-1 text-xs uppercase tracking-[0.3em] text-gold-500/70">
            Private Cloud POS
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-gold-900/40 bg-ink-900/50 p-6 shadow-2xl backdrop-blur-sm"
        >
          <p className="mb-5 text-center text-sm text-[#a89a7d]">
            Sign in to access the store dashboard
          </p>

          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-[#a89a7d]">
                Username
              </label>
              <div className="flex items-center rounded-lg border border-gold-900/50 bg-ink-950 px-3 focus-within:border-gold-500/70">
                <User size={16} className="text-ink-500" />
                <input
                  autoFocus
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin"
                  className="w-full bg-transparent px-2.5 py-2.5 text-sm text-[#ece6d9] outline-none placeholder:text-ink-600"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-[#a89a7d]">
                Password
              </label>
              <div className="flex items-center rounded-lg border border-gold-900/50 bg-ink-950 px-3 focus-within:border-gold-500/70">
                <Lock size={16} className="text-ink-500" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-transparent px-2.5 py-2.5 text-sm text-[#ece6d9] outline-none placeholder:text-ink-600"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="text-ink-500 hover:text-gold-400"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          </div>

          {error && (
            <p className="mt-4 rounded-lg border border-rose-900/50 bg-rose-950/30 px-3 py-2 text-xs text-rose-400">
              {error}
            </p>
          )}

          <button
            type="submit"
            className="mt-6 w-full rounded-lg bg-gradient-to-r from-gold-600 to-gold-500 py-2.5 text-sm font-semibold text-ink-950 shadow-lg shadow-gold-900/30 transition hover:from-gold-500 hover:to-gold-400"
          >
            Sign In
          </button>

          <p className="mt-4 text-center text-[11px] text-ink-600">
            Default access — admin / zarghoon123
            <br />
            Change this in Settings after signing in.
          </p>
        </form>

        <p className="mt-6 text-center text-[11px] text-ink-600">
          This site is private and not indexed by search engines.
        </p>
      </div>
    </div>
  );
}
