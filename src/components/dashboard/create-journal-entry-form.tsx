"use client";

import { useActionState } from "react";
import Link from "next/link";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SubmitButton } from "@/components/auth/submit-button";
import { Textarea } from "@/components/ui/textarea";
import { createJournalEntryAction } from "@/lib/actions/journal";
import type { AuthActionState } from "@/lib/actions/auth";
import type { MarketAssetRow } from "@/types/database";

const initialState: AuthActionState = { error: null };

export function CreateJournalEntryForm({
  assets,
  used,
  limit,
}: {
  assets: MarketAssetRow[];
  used: number;
  limit: number | null;
}) {
  const [state, formAction] = useActionState(createJournalEntryAction, initialState);
  const atLimit = limit !== null && used >= limit;

  return (
    <div className="space-y-4">
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

      <form action={formAction} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="assetId">Asset</Label>
          <Select name="assetId" disabled={atLimit}>
            <SelectTrigger id="assetId" className="w-full">
              <SelectValue placeholder="Select an asset" />
            </SelectTrigger>
            <SelectContent>
              {assets.map((asset) => (
                <SelectItem key={asset.id} value={asset.id}>
                  {asset.symbol}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="direction">Direction</Label>
          <Select name="direction" defaultValue="long" disabled={atLimit}>
            <SelectTrigger id="direction" className="w-full">
              <SelectValue placeholder="Direction" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="long">Long</SelectItem>
              <SelectItem value="short">Short</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="positionSize">Position size</Label>
          <Input
            id="positionSize"
            name="positionSize"
            type="number"
            step="any"
            min="0"
            required
            disabled={atLimit}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="entryPrice">Entry price</Label>
          <Input
            id="entryPrice"
            name="entryPrice"
            type="number"
            step="any"
            min="0"
            required
            disabled={atLimit}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="exitPrice">Exit price (optional)</Label>
          <Input
            id="exitPrice"
            name="exitPrice"
            type="number"
            step="any"
            min="0"
            disabled={atLimit}
          />
        </div>

        <div className="space-y-1.5 sm:col-span-2 lg:col-span-3">
          <Label htmlFor="notes">Notes</Label>
          <Textarea id="notes" name="notes" rows={2} maxLength={2000} disabled={atLimit} />
        </div>

        <div className="flex items-center gap-3 sm:col-span-2 lg:col-span-3">
          <SubmitButton className="w-auto" disabled={atLimit}>
            Log trade
          </SubmitButton>
          <span className="text-xs text-muted-foreground">
            {limit === null
              ? `${used} entries · unlimited on your plan`
              : `${used} / ${limit} entries used`}
          </span>
        </div>
      </form>
    </div>
  );
}
