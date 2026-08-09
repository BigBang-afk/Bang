"use client";

import { useState, useTransition } from "react";
import { registerAction } from "@/lib/actions/auth";
import { Input, FormField } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function RegisterForm() {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setError(null);
    const password = String(formData.get("password") ?? "");
    const confirm = String(formData.get("confirmPassword") ?? "");
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    startTransition(async () => {
      const result = await registerAction({
        email: String(formData.get("email") ?? ""),
        traderName: String(formData.get("traderName") ?? ""),
        password,
      });
      if (result?.error) setError(result.error);
    });
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      <FormField label="Trader Name">
        <Input name="traderName" required placeholder="Your name" />
      </FormField>
      <FormField label="Email">
        <Input type="email" name="email" required autoComplete="email" placeholder="you@example.com" />
      </FormField>
      <FormField label="Password" hint="At least 8 characters">
        <Input type="password" name="password" required autoComplete="new-password" placeholder="••••••••" />
      </FormField>
      <FormField label="Confirm Password">
        <Input type="password" name="confirmPassword" required autoComplete="new-password" placeholder="••••••••" />
      </FormField>
      {error && <p className="text-xs text-negative">{error}</p>}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Creating account…" : "Create Account"}
      </Button>
    </form>
  );
}
