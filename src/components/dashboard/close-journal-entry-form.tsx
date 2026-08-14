"use client";

import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { closeJournalEntryAction } from "@/lib/actions/journal";
import type { AuthActionState } from "@/lib/actions/auth";

const initialState: AuthActionState = { error: null };

export function CloseJournalEntryForm({ entryId }: { entryId: string }) {
  const [state, formAction] = useActionState(closeJournalEntryAction, initialState);
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <Button type="button" size="sm" variant="outline" onClick={() => setOpen(true)}>
        Close trade
      </Button>
    );
  }

  return (
    <form action={formAction} className="flex items-center gap-1.5">
      <input type="hidden" name="entryId" value={entryId} />
      <Input
        name="exitPrice"
        type="number"
        step="any"
        min="0"
        placeholder="Exit price"
        required
        className="h-8 w-28"
      />
      <Button type="submit" size="sm">
        Save
      </Button>
      {state.error && <span className="text-xs text-danger">{state.error}</span>}
    </form>
  );
}
