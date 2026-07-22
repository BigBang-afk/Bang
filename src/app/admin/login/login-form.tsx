"use client";

import { useActionState } from "react";
import { loginAction, type LoginState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

const initialState: LoginState = {};

export function LoginForm({ redirectTo }: { redirectTo: string }) {
  const [state, formAction, isPending] = useActionState(loginAction, initialState);

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="redirectTo" value={redirectTo} />

      <div>
        <Label htmlFor="email" required>Email</Label>
        <Input id="email" name="email" type="email" autoComplete="username" required placeholder="admin@zarghoonjewellers.com" />
      </div>

      <div>
        <Label htmlFor="password" required>Password</Label>
        <Input id="password" name="password" type="password" autoComplete="current-password" required minLength={8} placeholder="••••••••" />
      </div>

      {state.error && (
        <p role="alert" className="rounded-sm border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}

      <Button type="submit" variant="gold" className="w-full" disabled={isPending}>
        {isPending ? "Signing in…" : "Sign In"}
      </Button>
    </form>
  );
}
