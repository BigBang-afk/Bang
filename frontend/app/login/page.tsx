"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { login } from "@/lib/auth";
import { ApiError } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [needsTotp, setNeedsTotp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password, totpCode || undefined);
      router.push("/dashboard");
    } catch (err) {
      if (err instanceof ApiError && err.message.toLowerCase().includes("2fa")) {
        setNeedsTotp(true);
      }
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-void px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gold tracking-tight">AURUM</h1>
          <p className="text-gray-400 text-sm mt-1">Institutional AI Crypto Signal Platform</p>
        </div>

        <form onSubmit={submit} className="card-glow space-y-4">
          <div>
            <label className="label-muted">Email</label>
            <input
              type="email"
              required
              className="input-field w-full mt-1"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="label-muted">Password</label>
            <input
              type="password"
              required
              className="input-field w-full mt-1"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {needsTotp && (
            <div>
              <label className="label-muted">2FA Code</label>
              <input
                type="text"
                className="input-field w-full mt-1"
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value)}
              />
            </div>
          )}
          {error && <p className="text-bear text-sm">{error}</p>}
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <p className="text-center text-sm text-gray-400 mt-4">
          No account?{" "}
          <Link href="/register" className="text-gold hover:underline">
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}
