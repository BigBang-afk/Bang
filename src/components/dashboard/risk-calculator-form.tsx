"use client";

import { useMemo, useState } from "react";
import { AlertTriangle } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function RiskCalculatorForm() {
  const [accountSize, setAccountSize] = useState("10000");
  const [riskPercent, setRiskPercent] = useState("1");
  const [entryPrice, setEntryPrice] = useState("");
  const [stopLoss, setStopLoss] = useState("");
  const [takeProfit, setTakeProfit] = useState("");

  const result = useMemo(() => {
    const account = Number(accountSize);
    const risk = Number(riskPercent);
    const entry = Number(entryPrice);
    const stop = Number(stopLoss);
    const target = Number(takeProfit);

    if (![account, risk, entry, stop].every((n) => Number.isFinite(n) && n > 0)) {
      return null;
    }
    if (entry === stop) return null;

    const riskAmount = account * (risk / 100);
    const perUnitRisk = Math.abs(entry - stop);
    const positionSize = riskAmount / perUnitRisk;
    const notional = positionSize * entry;

    let riskReward: number | null = null;
    if (Number.isFinite(target) && target > 0 && target !== entry) {
      const reward = Math.abs(target - entry);
      riskReward = reward / perUnitRisk;
    }

    return { riskAmount, positionSize, notional, riskReward };
  }, [accountSize, riskPercent, entryPrice, stopLoss, takeProfit]);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Inputs</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="accountSize">Account size (USD)</Label>
            <Input
              id="accountSize"
              type="number"
              min="0"
              step="any"
              value={accountSize}
              onChange={(e) => setAccountSize(e.target.value)}
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
          {!result ? (
            <p className="text-sm text-muted-foreground">
              Enter an account size, risk %, entry and stop-loss to calculate position
              size.
            </p>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-border p-3">
                  <p className="text-xs text-muted-foreground">Amount at risk</p>
                  <p className="mt-1 text-lg font-semibold">
                    ${result.riskAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <p className="text-xs text-muted-foreground">Position size</p>
                  <p className="mt-1 text-lg font-semibold">
                    {result.positionSize.toLocaleString(undefined, { maximumFractionDigits: 6 })}
                  </p>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <p className="text-xs text-muted-foreground">Notional value</p>
                  <p className="mt-1 text-lg font-semibold">
                    ${result.notional.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <p className="text-xs text-muted-foreground">Risk / reward</p>
                  <p className="mt-1 text-lg font-semibold">
                    {result.riskReward ? `1 : ${result.riskReward.toFixed(2)}` : "—"}
                  </p>
                </div>
              </div>

              <Alert>
                <AlertTriangle className="size-4" />
                <AlertDescription>
                  Position sizing is a math tool, not a guarantee. Confirm figures against
                  your broker/exchange before trading.
                </AlertDescription>
              </Alert>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
