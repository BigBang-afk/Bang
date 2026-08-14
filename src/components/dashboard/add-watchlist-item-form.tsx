"use client";

import { useActionState } from "react";
import Link from "next/link";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { addWatchlistItemAction } from "@/lib/actions/watchlist";
import type { AuthActionState } from "@/lib/actions/auth";
import type { MarketAssetRow } from "@/types/database";

const initialState: AuthActionState = { error: null };

export function AddWatchlistItemForm({
  watchlistId,
  assets,
}: {
  watchlistId: string;
  assets: MarketAssetRow[];
}) {
  const [state, formAction] = useActionState(addWatchlistItemAction, initialState);

  return (
    <div className="space-y-2 pt-1">
      {state.error && (
        <Alert variant="destructive" className="py-1.5">
          <AlertDescription className="text-xs">
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
        <input type="hidden" name="watchlistId" value={watchlistId} />
        <Select name="assetId">
          <SelectTrigger className="flex-1">
            <SelectValue placeholder="Add an asset…" />
          </SelectTrigger>
          <SelectContent>
            {assets.map((asset) => (
              <SelectItem key={asset.id} value={asset.id}>
                {asset.symbol} · {asset.display_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button type="submit" size="sm" variant="outline">
          Add
        </Button>
      </form>
    </div>
  );
}
