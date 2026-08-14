"use client";

import { useActionState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { SubmitButton } from "@/components/auth/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { registerAction, type AuthActionState } from "@/lib/actions/auth";

const initialState: AuthActionState = { error: null };

export function RegisterForm() {
  const [state, formAction] = useActionState(registerAction, initialState);

  if (state.success) {
    return (
      <Alert>
        <AlertDescription>{state.success}</AlertDescription>
      </Alert>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      {state.error && (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="fullName">Full name</Label>
        <Input id="fullName" name="fullName" type="text" autoComplete="name" required />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
        />
        <p className="text-xs text-muted-foreground">
          At least 8 characters, with an uppercase letter, a lowercase letter and a
          number.
        </p>
      </div>

      <SubmitButton>Create account</SubmitButton>

      <p className="text-center text-xs text-muted-foreground">
        By creating an account you agree that Lumenex provides decision-support
        analysis, not financial advice.
      </p>
    </form>
  );
}
