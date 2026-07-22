"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { createAdminUserAction, type ActionState } from "@/app/admin/(protected)/users/actions";
import { ADMIN_ROLES, ADMIN_ROLE_LABELS } from "@/lib/constants";

export function CreateUserForm() {
  const [state, formAction, isPending] = useActionState(createAdminUserAction, {} as ActionState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.error) toast.error(state.error);
    if (state.success) { toast.success(state.success); formRef.current?.reset(); }
  }, [state.error, state.success]);

  return (
    <form ref={formRef} action={formAction} className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5 sm:items-end">
      <div><Label htmlFor="full_name" required>Full Name</Label><Input id="full_name" name="full_name" required /></div>
      <div><Label htmlFor="email" required>Email</Label><Input id="email" name="email" type="email" required /></div>
      <div><Label htmlFor="password" required>Password</Label><Input id="password" name="password" type="password" minLength={8} required /></div>
      <div>
        <Label htmlFor="role" required>Role</Label>
        <Select id="role" name="role" defaultValue="admin">
          {ADMIN_ROLES.map((r) => <option key={r} value={r}>{ADMIN_ROLE_LABELS[r]}</option>)}
        </Select>
      </div>
      <Button type="submit" variant="gold" disabled={isPending}>{isPending ? "Creating…" : "Create Admin"}</Button>
    </form>
  );
}
