"use client";

import { useState, type FormEvent, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

function AdminLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, remember }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Login failed.");
        return;
      }
      router.push(searchParams.get("next") || "/admin");
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-md">
      <div className="mb-8 text-center">
        <p className="font-display text-2xl tracking-wide text-gold">Zarghoon Jewellers</p>
        <h1 className="mt-2 font-display text-3xl text-cream">Admin Sign In</h1>
        <div className="gold-divider mx-auto mt-4 w-24" />
      </div>

      <form onSubmit={onSubmit} className="rounded-sm bg-ivory p-8 shadow-2xl">
        <div className="flex flex-col gap-4">
          <Input
            label="Email"
            type="email"
            required
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Input
            label="Password"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <label className="flex items-center gap-2 text-sm text-brown-light">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="h-4 w-4 accent-maroon"
            />
            Remember this session for 30 days
          </label>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" loading={loading} className="mt-2 w-full">
            Sign In
          </Button>
        </div>
      </form>
      <p className="mt-6 text-center text-sm text-cream/70">
        <Link href="/" className="hover:text-gold">
          ← Back to storefront
        </Link>
      </p>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-maroon-dark bg-[radial-gradient(ellipse_at_top,_var(--brand-maroon)_0%,_var(--brand-maroon-dark)_60%)] px-4 py-16">
      <Suspense>
        <AdminLoginForm />
      </Suspense>
    </div>
  );
}
