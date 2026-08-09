"use client";

import { useState, useTransition } from "react";
import { loginAction } from "@/lib/actions/auth";
import { Input, FormField } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";

export function LoginForm() {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await loginAction({
        email: String(formData.get("email") ?? ""),
        password: String(formData.get("password") ?? ""),
        rememberMe: formData.get("rememberMe") === "on",
      });
      if (result?.error) setError(result.error);
    });
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      <FormField label="Email">
        <Input type="email" name="email" required autoComplete="email" placeholder="you@example.com" />
      </FormField>
      <FormField label="Password">
        <Input type="password" name="password" required autoComplete="current-password" placeholder="••••••••" />
      </FormField>
      <label className="flex items-center gap-2 text-xs text-muted">
        <Checkbox name="rememberMe" />
        Remember me for 30 days
      </label>
      {error && <p className="text-xs text-negative">{error}</p>}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Signing in…" : "Sign In"}
      </Button>
    </form>
  );
}
