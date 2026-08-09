"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, FormField, Select } from "@/components/ui/input";
import { calculateRiskPosition, type RiskInstrument } from "@/lib/position-sizing";
import { formatUsd } from "@/lib/money";

export function PositionSizeCalculator({ defaultBalance }: { defaultBalance: number }) {
  const [accountBalance, setAccountBalance] = useState(String(defaultBalance.toFixed(2)));
  const [riskPct, setRiskPct] = useState("1");
  const [instrument, setInstrument] = useState<RiskInstrument>("FOREX");
  const [entryPrice, setEntryPrice] = useState("");
  const [stopLoss, setStopLoss] = useState("");
  const [takeProfit, setTakeProfit] = useState("");
  const [contractSize, setContractSize] = useState("100000");
  const [payoutPct, setPayoutPct] = useState("80");

  const result = useMemo(() => {
    return calculateRiskPosition({
      accountBalance: Number(accountBalance) || 0,
      riskPct: Number(riskPct) || 0,
      entryPrice: Number(entryPrice) || 0,
      stopLoss: Number(stopLoss) || 0,
      takeProfit: takeProfit === "" ? null : Number(takeProfit),
      instrument,
      contractSize: Number(contractSize) || 100000,
      payoutPct: Number(payoutPct) || 80,
    });
  }, [accountBalance, riskPct, entryPrice, stopLoss, takeProfit, instrument, contractSize, payoutPct]);

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Risk Calculator</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <FormField label="Account Balance (USD)">
            <Input type="number" step="any" value={accountBalance} onChange={(e) => setAccountBalance(e.target.value)} />
          </FormField>
          <FormField label="Risk %">
            <Input type="number" step="any" value={riskPct} onChange={(e) => setRiskPct(e.target.value)} />
          </FormField>
          <FormField label="Instrument">
            <Select value={instrument} onChange={(e) => setInstrument(e.target.value as RiskInstrument)}>
              <option value="FOREX">Forex</option>
              <option value="CRYPTO">Crypto</option>
              <option value="STOCKS">Stocks</option>
              <option value="BINARY">Binary</option>
              <option value="OTHER">Other</option>
            </Select>
          </FormField>
          {instrument !== "BINARY" && (
            <>
              <FormField label="Entry Price">
                <Input type="number" step="any" value={entryPrice} onChange={(e) => setEntryPrice(e.target.value)} />
              </FormField>
              <FormField label="Stop Loss">
                <Input type="number" step="any" value={stopLoss} onChange={(e) => setStopLoss(e.target.value)} />
              </FormField>
              <FormField label="Take Profit (optional)">
                <Input type="number" step="any" value={takeProfit} onChange={(e) => setTakeProfit(e.target.value)} />
              </FormField>
            </>
          )}
          {instrument === "FOREX" && (
            <FormField label="Contract Size (units per lot)" hint="Standard lot = 100,000">
              <Input type="number" step="any" value={contractSize} onChange={(e) => setContractSize(e.target.value)} />
            </FormField>
          )}
          {instrument === "BINARY" && (
            <FormField label="Payout %">
              <Input type="number" step="any" value={payoutPct} onChange={(e) => setPayoutPct(e.target.value)} />
            </FormField>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Result</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {result.error ? (
            <p className="text-sm text-negative">{result.error}</p>
          ) : (
            <>
              <ResultRow label="Maximum Risk (USD)" value={formatUsd(result.maxRiskUsd)} />
              <ResultRow
                label={result.positionSizeLabel}
                value={result.positionSize.toLocaleString("en-US", { maximumFractionDigits: 4 })}
              />
              {result.units !== undefined && <ResultRow label="Units" value={result.units.toLocaleString("en-US", { maximumFractionDigits: 2 })} />}
              <ResultRow label="Risk / Reward" value={result.riskRewardRatio !== null ? `1 : ${result.riskRewardRatio.toFixed(2)}` : "—"} />
              <ResultRow
                label="Potential TP Profit"
                value={result.potentialTpProfit !== null ? formatUsd(result.potentialTpProfit) : "—"}
                tone="positive"
              />
              <ResultRow label="Potential SL Loss" value={formatUsd(result.potentialSlLoss)} tone="negative" />
            </>
          )}
          <p className="pt-2 text-[11px] text-muted-2">
            Forex position sizing assumes a simplified price-distance model and may not exactly match your broker&apos;s pip
            value for cross-currency pairs. Verify against your broker before placing size-critical trades.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function ResultRow({ label, value, tone }: { label: string; value: string; tone?: "positive" | "negative" }) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-surface-2 px-3 py-2 text-sm">
      <span className="text-muted">{label}</span>
      <span className={`font-semibold ${tone === "positive" ? "text-positive" : tone === "negative" ? "text-negative" : ""}`}>{value}</span>
    </div>
  );
}
