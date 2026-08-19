"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export default function ForgotPasswordPage() {
  const [identifier, setIdentifier] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [devLink, setDevLink] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier }),
      });
      const data = await res.json();
      setMessage(data.message);
      setDevLink(data.devResetLink ?? null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-6 py-20">
      <div className="text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-gold-dark">Account Recovery</p>
        <h1 className="mt-2 font-display text-3xl text-maroon">Forgot Password</h1>
        <div className="gold-divider mx-auto my-6 w-24" />
      </div>

      <form onSubmit={onSubmit} className="flex flex-col gap-4 rounded-sm border border-gold/20 bg-ivory p-8">
        <Input
          label="Mobile Number or Email"
          required
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
        />
        {message && <p className="text-sm text-brown-light">{message}</p>}
        {devLink && (
          <p className="rounded-sm bg-cream-dark p-3 text-xs text-brown-light">
            Dev mode (no SMS provider configured):{" "}
            <Link href={devLink} className="text-maroon underline">
              {devLink}
            </Link>
          </p>
        )}
        <Button type="submit" loading={loading}>
          Send Reset Instructions
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-brown-light">
        <Link href="/login" className="font-medium text-maroon hover:underline">
          ← Back to Sign In
        </Link>
      </p>
    </div>
  );
}
