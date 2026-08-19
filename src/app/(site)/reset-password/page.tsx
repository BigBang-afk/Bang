"use client";

import { useState, type FormEvent, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password, confirmPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
        return;
      }
      setSuccess(true);
      setTimeout(() => router.push("/login"), 1500);
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return <p className="mx-auto max-w-md px-6 py-20 text-center text-brown-light">Invalid or missing reset link.</p>;
  }

  return (
    <div className="mx-auto max-w-md px-6 py-20">
      <div className="text-center">
        <h1 className="font-display text-3xl text-maroon">Reset Password</h1>
        <div className="gold-divider mx-auto my-6 w-24" />
      </div>
      <form onSubmit={onSubmit} className="flex flex-col gap-4 rounded-sm border border-gold/20 bg-ivory p-8">
        <Input label="New Password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        <Input label="Confirm New Password" type="password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
        {error && <p className="text-sm text-red-600">{error}</p>}
        {success && <p className="text-sm text-green-700">Password updated! Redirecting to sign in…</p>}
        <Button type="submit" loading={loading}>
          Reset Password
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-brown-light">
        <Link href="/login" className="font-medium text-maroon hover:underline">← Back to Sign In</Link>
      </p>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}
