"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { setUserBranchAccessAction } from "@/lib/actions/branches.actions";
import type { BranchAccessMode } from "@/generated/prisma/client";

type BranchOption = { id: string; name: string };

export function UserBranchAccessForm({
  userId,
  userName,
  branchAccessMode,
  authorizedBranchIds,
  branches,
}: {
  userId: string;
  userName: string;
  branchAccessMode: BranchAccessMode;
  authorizedBranchIds: string[];
  branches: BranchOption[];
}) {
  const [mode, setMode] = useState<BranchAccessMode>(branchAccessMode);
  const [selected, setSelected] = useState<Set<string>>(new Set(authorizedBranchIds));
  const [pending, startTransition] = useTransition();

  function toggleBranch(branchId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(branchId)) next.delete(branchId);
      else next.add(branchId);
      return next;
    });
  }

  function handleSave() {
    startTransition(async () => {
      const result = await setUserBranchAccessAction({ targetUserId: userId, branchAccessMode: mode, branchIds: [...selected] });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`Branch access updated for ${userName}.`);
    });
  }

  return (
    <div className="flex flex-col gap-2 rounded-md border border-border p-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-foreground">{userName}</p>
        <Select value={mode} onValueChange={(v) => setMode(v as BranchAccessMode)}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL_BRANCHES">All Branches</SelectItem>
            <SelectItem value="SPECIFIC_BRANCHES">Specific Branches</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {mode === "SPECIFIC_BRANCHES" && (
        <div className="flex flex-wrap gap-2">
          {branches.map((branch) => (
            <label key={branch.id} className="flex items-center gap-1.5 rounded-md border border-border px-2 py-1 text-xs">
              <input type="checkbox" checked={selected.has(branch.id)} onChange={() => toggleBranch(branch.id)} />
              {branch.name}
            </label>
          ))}
        </div>
      )}
      <div>
        <Button size="sm" variant="secondary" onClick={handleSave} disabled={pending}>
          {pending ? "Saving..." : "Save"}
        </Button>
      </div>
    </div>
  );
}
