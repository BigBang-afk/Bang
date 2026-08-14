"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createWatchlistAction } from "@/lib/actions/watchlist";
import type { AuthActionState } from "@/lib/actions/auth";

const initialState: AuthActionState = { error: null };

export function CreateWatchlistForm({ used, limit }: { used: number; limit: number | null }) {
  const [state, formAction] = useActionState(createWatchlistAction, initialState);
  const atLimit = limit !== null && used >= limit;

  return (
    <div className="space-y-3">
      {state.error && (
        <Alert variant="destructive">
          <AlertDescription>
            {state.error}
            {state.code === "limit_reached" && (
              <>
                {" "}
                <Link href="/dashboard/subscription" className="underline underline-offset-2">
                  View plans
                </Link>
              </>
            )}
          </AlertDescription>
        </Alert>
      )}

      <form action={formAction} className="flex gap-2">
        <Input
          name="name"
          placeholder="e.g. Core majors"
          required
          maxLength={60}
          disabled={atLimit}
        />
        <Button type="submit" size="sm" disabled={atLimit}>
          <Plus className="size-4" />
          Create
        </Button>
      </form>

      <p className="text-xs text-muted-foreground">
        {limit === null ? `${used} watchlists · unlimited on your plan` : `${used} / ${limit} watchlists used`}
      </p>
    </div>
  );
}
