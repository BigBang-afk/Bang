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
import { createSetupAction } from "@/lib/actions/setups";
import type { AuthActionState } from "@/lib/actions/auth";
import { TIMEFRAMES } from "@/lib/market-data/types";
import type { MarketAssetRow } from "@/types/database";

const initialState: AuthActionState = { error: null };

export function CreateSetupForm({
  assets,
  used,
  limit,
}: {
  assets: MarketAssetRow[];
  used: number;
  limit: number | null;
}) {
  const [state, formAction] = useActionState(createSetupAction, initialState);
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

      <form action={formAction} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-1.5">
          <Label htmlFor="assetId">Symbol</Label>
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
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="long">Long</SelectItem>
              <SelectItem value="short">Short</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="timeframe">Timeframe</Label>
          <Select name="timeframe" defaultValue="1h" disabled={atLimit}>
            <SelectTrigger id="timeframe" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TIMEFRAMES.map((tf) => (
                <SelectItem key={tf} value={tf}>
                  {tf}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="setupQuality">Setup quality</Label>
          <Select name="setupQuality" defaultValue="fair" disabled={atLimit}>
            <SelectTrigger id="setupQuality" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="poor">Poor</SelectItem>
              <SelectItem value="fair">Fair</SelectItem>
              <SelectItem value="good">Good</SelectItem>
              <SelectItem value="excellent">Excellent</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="entryPrice">Entry</Label>
          <Input id="entryPrice" name="entryPrice" type="number" step="any" min="0" required disabled={atLimit} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="stopLoss">Stop loss</Label>
          <Input id="stopLoss" name="stopLoss" type="number" step="any" min="0" required disabled={atLimit} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="takeProfit1">Take profit 1</Label>
          <Input id="takeProfit1" name="takeProfit1" type="number" step="any" min="0" disabled={atLimit} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="takeProfit2">Take profit 2 (optional)</Label>
          <Input id="takeProfit2" name="takeProfit2" type="number" step="any" min="0" disabled={atLimit} />
        </div>

        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="rationale">Reasoning</Label>
          <Textarea id="rationale" name="rationale" rows={2} maxLength={2000} disabled={atLimit} />
        </div>

        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="invalidation">Invalidation</Label>
          <Textarea
            id="invalidation"
            name="invalidation"
            rows={2}
            maxLength={1000}
            placeholder="What would prove this setup wrong?"
            disabled={atLimit}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="expiresAt">Expires (optional)</Label>
          <Input id="expiresAt" name="expiresAt" type="datetime-local" disabled={atLimit} />
        </div>

        <div className="flex items-center gap-3 sm:col-span-2 lg:col-span-4">
          <SubmitButton className="w-auto" disabled={atLimit}>
            Save setup
          </SubmitButton>
          <span className="text-xs text-muted-foreground">
            {limit === null ? `${used} setups · unlimited on your plan` : `${used} / ${limit} setups used`}
          </span>
        </div>
      </form>
    </div>
  );
}
