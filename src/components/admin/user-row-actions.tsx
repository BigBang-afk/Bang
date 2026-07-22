"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { updateAdminUserRoleAction, toggleAdminUserActiveAction } from "@/app/admin/(protected)/users/actions";
import { ADMIN_ROLES, ADMIN_ROLE_LABELS, type AdminRole } from "@/lib/constants";
import type { AdminProfile } from "@/types/database";

export function UserRowActions({ profile, isSelf }: { profile: AdminProfile; isSelf: boolean }) {
  const [role, setRole] = useState<AdminRole>(profile.role);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex items-center gap-2">
      <select
        value={role}
        disabled={isPending || isSelf}
        onChange={(e) => {
          const next = e.target.value as AdminRole;
          setRole(next);
          startTransition(async () => { await updateAdminUserRoleAction(profile.id, next); toast.success("Role updated"); });
        }}
        className="rounded-sm border border-charcoal/20 px-2 py-1 text-xs"
      >
        {ADMIN_ROLES.map((r) => <option key={r} value={r}>{ADMIN_ROLE_LABELS[r]}</option>)}
      </select>
      <button
        type="button"
        disabled={isPending || isSelf}
        onClick={() => startTransition(async () => {
          await toggleAdminUserActiveAction(profile.id, !profile.is_active);
          toast.success(profile.is_active ? "Deactivated" : "Activated");
        })}
        className="rounded-sm border border-charcoal/20 px-2 py-1 text-xs disabled:opacity-40"
      >
        {profile.is_active ? "Deactivate" : "Activate"}
      </button>
    </div>
  );
}
