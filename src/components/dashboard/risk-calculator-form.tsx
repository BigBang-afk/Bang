"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Info } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { calculateRisk, RiskCalculatorInputError } from "@/lib/trading/risk-calculator";
import type { MarketAssetRow } from "@/types/database";

const NO_INSTRUMENT = "none";

export function RiskCalculatorForm({ assets }: { assets: MarketAssetRow[] }) {
  const [accountBalance, setAccountBalance] = useState("10000");
  const [riskPercent, setRiskPercent] = useState("1");
  const [entryPrice, setEntryPrice] = useState("");
  const [stopLoss, setStopLoss] = useState("");
  const [takeProfit, setTakeProfit] = useState("");
  const [assetId, setAssetId] = useState(NO_INSTRUMENT);
  const [positionType, setPositionType] = useState<"long" | "short">("long");

  const asset = assets.find((a) => a.id === assetId) ?? null;

  const outcome = useMemo(() => {
    const account = Number(accountBalance);
    const risk = Number(riskPercent);
    const entry = Number(entryPrice);
    const stop = Number(stopLoss);
    const target = takeProfit.trim() === "" ? null : Number(takeProfit);

    if (![account, risk, entry, stop].every((n) => Number.isFinite(n))) return null;
    if (entry <= 0 || stop <= 0) return null;

    try {
      const result = calculateRisk({
        accountBalance: account,
        riskPercent: risk,
        entry,
        stopLoss: stop,
        takeProfit: target !== null && Number.isFinite(target) ? target : null,
        positionType,
        marketType: asset?.market_type ?? null,
        symbol: asset?.symbol ?? null,
      });
      return { ok: true as const, result };
    } catch (err) {
      if (err instanceof RiskCalculatorInputError) {
        return { ok: false as const, message: err.message };
      }
      throw err;
    }
  }, [accountBalance, riskPercent, entryPrice, stopLoss, takeProfit, positionType, asset]);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Inputs</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="accountBalance">Account balance (USD)</Label>
            <Input
              id="accountBalance"
              type="number"
              min="0"
              step="any"
              value={accountBalance}
              onChange={(e) => setAccountBalance(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="riskPercent">Risk per trade (%)</Label>
            <Input
              id="riskPercent"
              type="number"
              min="0"
              max="100"
              step="any"
              value={riskPercent}
              onChange={(e) => setRiskPercent(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="instrument">Instrument (optional)</Label>
              <Select value={assetId} onValueChange={(v) => setAssetId(v ?? NO_INSTRUMENT)}>
                <SelectTrigger id="instrument" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_INSTRUMENT}>None selected</SelectItem>
                  {assets.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.symbol}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="positionType">Position type</Label>
              <Select value={positionType} onValueChange={(v) => setPositionType(v as "long" | "short")}>
                <SelectTrigger id="positionType" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="long">Long</SelectItem>
                  <SelectItem value="short">Short</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="entryPrice">Entry price</Label>
            <Input
              id="entryPrice"
              type="number"
              min="0"
              step="any"
              value={entryPrice}
              onChange={(e) => setEntryPrice(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="stopLoss">Stop-loss price</Label>
            <Input
              id="stopLoss"
              type="number"
              min="0"
              step="any"
              value={stopLoss}
              onChange={(e) => setStopLoss(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="takeProfit">Take-profit price (optional)</Label>
            <Input
              id="takeProfit"
              type="number"
              min="0"
              step="any"
              value={takeProfit}
              onChange={(e) => setTakeProfit(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Result</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!outcome ? (
            <p className="text-sm text-muted-foreground">
              Enter an account balance, risk %, entry and stop-loss to calculate.
            </p>
          ) : !outcome.ok ? (
            <Alert variant="destructive">
              <AlertDescription>{outcome.message}</AlertDescription>
            </Alert>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-border p-3">
                  <p className="text-xs text-muted-foreground">Dollar risk</p>
                  <p className="mt-1 text-lg font-semibold">
                    ${outcome.result.dollarRisk.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <p className="text-xs text-muted-foreground">Risk percentage</p>
                  <p className="mt-1 text-lg font-semibold">{outcome.result.riskPercent}%</p>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <p className="text-xs text-muted-foreground">Stop distance</p>
                  <p className="mt-1 text-lg font-semibold">
                    {outcome.result.stopDistance.toLocaleString(undefined, { maximumFractionDigits: 5 })}
                  </p>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <p className="text-xs text-muted-foreground">Reward</p>
                  <p className="mt-1 text-lg font-semibold">
                    {outcome.result.reward !== null
                      ? outcome.result.reward.toLocaleString(undefined, { maximumFractionDigits: 5 })
                      : "—"}
                  </p>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <p className="text-xs text-muted-foreground">Risk / reward</p>
                  <p className="mt-1 text-lg font-semibold">
                    {outcome.result.riskRewardRatio !== null
                      ? `1 : ${outcome.result.riskRewardRatio.toFixed(2)}`
                      : "—"}
                  </p>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <p className="text-xs text-muted-foreground">Position size</p>
                  <p className="mt-1 text-lg font-semibold">
                    {outcome.result.positionSize !== null
                      ? outcome.result.positionSize.toLocaleString(undefined, {
                          maximumFractionDigits: 6,
                        })
                      : "—"}
                  </p>
                </div>
              </div>

              {outcome.result.positionSizeUnavailableReason && (
                <Alert>
                  <Info className="size-4" />
                  <AlertDescription>{outcome.result.positionSizeUnavailableReason}</AlertDescription>
                </Alert>
              )}

              {outcome.result.warnings.map((w) => (
                <Alert key={w.code} variant="destructive">
                  <AlertTriangle className="size-4" />
                  <AlertDescription>{w.message}</AlertDescription>
                </Alert>
              ))}

              <Alert>
                <AlertTriangle className="size-4" />
                <AlertDescription>
                  Position sizing is a math tool, not a guarantee. Confirm figures against your
                  broker/exchange before trading.
                </AlertDescription>
              </Alert>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
