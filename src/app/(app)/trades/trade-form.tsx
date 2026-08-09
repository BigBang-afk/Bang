"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createTradeAction, updateTradeAction } from "@/lib/actions/trades";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, FormField, Select, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScreenshotUpload } from "@/components/ui/screenshot-upload";
import { previewUsdToPkrAndGold, formatUsd, formatPkr, formatGrams } from "@/lib/money";
import { todayDateInputValue } from "@/lib/utils";

interface Strategy {
  id: string;
  name: string;
}

export interface TradeFormValues {
  id?: string;
  date: string;
  time: string;
  session: string;
  customSession: string;
  broker: string;
  marketType: string;
  symbol: string;
  direction: string;
  entryPrice: string;
  exitPrice: string;
  positionSize: string;
  riskUsd: string;
  stopLoss: string;
  takeProfit: string;
  plannedRR: string;
  grossPnlUsd: string;
  feesUsd: string;
  useNetOverride: boolean;
  netPnlOverride: string;
  strategyId: string;
  setup: string;
  timeframe: string;
  durationMinutes: string;
  screenshotUrl: string | null;
  notes: string;
  emotion: string;
  qualityRating: string;
  result: string;
}

const defaultValues: TradeFormValues = {
  date: todayDateInputValue(),
  time: "",
  session: "",
  customSession: "",
  broker: "",
  marketType: "FOREX",
  symbol: "",
  direction: "LONG",
  entryPrice: "",
  exitPrice: "",
  positionSize: "",
  riskUsd: "",
  stopLoss: "",
  takeProfit: "",
  plannedRR: "",
  grossPnlUsd: "",
  feesUsd: "0",
  useNetOverride: false,
  netPnlOverride: "",
  strategyId: "",
  setup: "",
  timeframe: "",
  durationMinutes: "",
  screenshotUrl: null,
  notes: "",
  emotion: "",
  qualityRating: "",
  result: "WIN",
};

export function TradeForm({
  strategies,
  usdToPkrRate,
  goldPricePerGramPkr,
  initial,
}: {
  strategies: Strategy[];
  usdToPkrRate: number;
  goldPricePerGramPkr: number;
  initial?: Partial<TradeFormValues>;
}) {
  const router = useRouter();
  const [values, setValues] = useState<TradeFormValues>({ ...defaultValues, ...initial });
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const isEdit = Boolean(values.id);

  function set<K extends keyof TradeFormValues>(key: K, val: TradeFormValues[K]) {
    setValues((v) => ({ ...v, [key]: val }));
  }

  const netPnl = useMemo(() => {
    if (values.useNetOverride && values.netPnlOverride !== "") {
      return Number(values.netPnlOverride) || 0;
    }
    const gross = Number(values.grossPnlUsd) || 0;
    const fees = Number(values.feesUsd) || 0;
    return gross - fees;
  }, [values.grossPnlUsd, values.feesUsd, values.useNetOverride, values.netPnlOverride]);

  const preview = previewUsdToPkrAndGold(netPnl, usdToPkrRate, goldPricePerGramPkr);

  function handleSubmit() {
    setError(null);
    if (!values.symbol.trim()) return setError("Symbol/Pair is required.");
    if (values.grossPnlUsd === "" && (!values.useNetOverride || values.netPnlOverride === "")) {
      return setError("Enter a gross P&L or a net P&L override.");
    }

    const payload = {
      id: values.id,
      date: values.date,
      time: values.time || undefined,
      session: values.session || undefined,
      customSession: values.customSession || undefined,
      broker: values.broker || undefined,
      marketType: values.marketType,
      symbol: values.symbol,
      direction: values.direction,
      entryPrice: values.entryPrice === "" ? null : Number(values.entryPrice),
      exitPrice: values.exitPrice === "" ? null : Number(values.exitPrice),
      positionSize: values.positionSize === "" ? null : Number(values.positionSize),
      riskUsd: values.riskUsd === "" ? null : Number(values.riskUsd),
      stopLoss: values.stopLoss === "" ? null : Number(values.stopLoss),
      takeProfit: values.takeProfit === "" ? null : Number(values.takeProfit),
      plannedRR: values.plannedRR === "" ? null : Number(values.plannedRR),
      grossPnlUsd: Number(values.grossPnlUsd || netPnl),
      feesUsd: Number(values.feesUsd || 0),
      netPnlOverride: values.useNetOverride && values.netPnlOverride !== "" ? Number(values.netPnlOverride) : null,
      strategyId: values.strategyId || null,
      setup: values.setup || undefined,
      timeframe: values.timeframe || undefined,
      durationMinutes: values.durationMinutes === "" ? null : Number(values.durationMinutes),
      screenshotUrl: values.screenshotUrl,
      notes: values.notes || undefined,
      emotion: values.emotion || undefined,
      qualityRating: values.qualityRating === "" ? null : Number(values.qualityRating),
      result: values.result,
    };

    startTransition(async () => {
      const result = isEdit ? await updateTradeAction(payload) : await createTradeAction(payload);
      if (result?.error) {
        setError(result.error);
      } else {
        router.push("/trades");
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle>Trade Details</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 md:grid-cols-3">
          <FormField label="Date">
            <Input type="date" value={values.date} onChange={(e) => set("date", e.target.value)} />
          </FormField>
          <FormField label="Time">
            <Input type="time" value={values.time} onChange={(e) => set("time", e.target.value)} />
          </FormField>
          <FormField label="Trading Session">
            <Select value={values.session} onChange={(e) => set("session", e.target.value)}>
              <option value="">—</option>
              <option value="ASIA">Asia</option>
              <option value="LONDON">London</option>
              <option value="NEW_YORK">New York</option>
              <option value="CUSTOM">Custom</option>
            </Select>
          </FormField>
          {values.session === "CUSTOM" && (
            <FormField label="Custom Session Name">
              <Input value={values.customSession} onChange={(e) => set("customSession", e.target.value)} />
            </FormField>
          )}
          <FormField label="Broker / Exchange">
            <Input value={values.broker} onChange={(e) => set("broker", e.target.value)} placeholder="e.g. Exness" />
          </FormField>
          <FormField label="Market Type">
            <Select value={values.marketType} onChange={(e) => set("marketType", e.target.value)}>
              <option value="FOREX">Forex</option>
              <option value="CRYPTO">Crypto</option>
              <option value="BINARY">Binary</option>
              <option value="STOCKS">Stocks</option>
              <option value="OTHER">Other</option>
            </Select>
          </FormField>
          <FormField label="Symbol / Pair">
            <Input value={values.symbol} onChange={(e) => set("symbol", e.target.value.toUpperCase())} placeholder="XAUUSD" />
          </FormField>
          <FormField label="Direction">
            <Select value={values.direction} onChange={(e) => set("direction", e.target.value)}>
              <option value="LONG">Buy / Long</option>
              <option value="SHORT">Sell / Short</option>
              <option value="CALL">Call</option>
              <option value="PUT">Put</option>
            </Select>
          </FormField>
          <FormField label="Result">
            <Select value={values.result} onChange={(e) => set("result", e.target.value)}>
              <option value="WIN">Win</option>
              <option value="LOSS">Loss</option>
              <option value="BREAKEVEN">Breakeven</option>
            </Select>
          </FormField>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Prices & Risk</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 md:grid-cols-3">
          <FormField label="Entry Price">
            <Input type="number" step="any" value={values.entryPrice} onChange={(e) => set("entryPrice", e.target.value)} />
          </FormField>
          <FormField label="Exit Price">
            <Input type="number" step="any" value={values.exitPrice} onChange={(e) => set("exitPrice", e.target.value)} />
          </FormField>
          <FormField label="Position / Lot Size">
            <Input type="number" step="any" value={values.positionSize} onChange={(e) => set("positionSize", e.target.value)} />
          </FormField>
          <FormField label="Stop Loss">
            <Input type="number" step="any" value={values.stopLoss} onChange={(e) => set("stopLoss", e.target.value)} />
          </FormField>
          <FormField label="Take Profit">
            <Input type="number" step="any" value={values.takeProfit} onChange={(e) => set("takeProfit", e.target.value)} />
          </FormField>
          <FormField label="Risk (USD)">
            <Input type="number" min="0" step="any" value={values.riskUsd} onChange={(e) => set("riskUsd", e.target.value)} />
          </FormField>
          <FormField label="Planned Risk/Reward" hint="e.g. 2 = 1:2 RR">
            <Input type="number" step="any" value={values.plannedRR} onChange={(e) => set("plannedRR", e.target.value)} />
          </FormField>
          <FormField label="Timeframe">
            <Input value={values.timeframe} onChange={(e) => set("timeframe", e.target.value)} placeholder="M15, H1, D1…" />
          </FormField>
          <FormField label="Trade Duration (minutes)">
            <Input type="number" min="0" value={values.durationMinutes} onChange={(e) => set("durationMinutes", e.target.value)} />
          </FormField>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Profit & Loss</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
            <FormField label="Gross Profit/Loss (USD)">
              <Input type="number" step="any" value={values.grossPnlUsd} onChange={(e) => set("grossPnlUsd", e.target.value)} />
            </FormField>
            <FormField label="Fees / Commission (USD)">
              <Input type="number" min="0" step="any" value={values.feesUsd} onChange={(e) => set("feesUsd", e.target.value)} />
            </FormField>
            <FormField label="Quality Rating (1-5)">
              <Input type="number" min="1" max="5" value={values.qualityRating} onChange={(e) => set("qualityRating", e.target.value)} />
            </FormField>
          </div>

          <label className="flex items-center gap-2 text-xs text-muted">
            <input
              type="checkbox"
              checked={values.useNetOverride}
              onChange={(e) => set("useNetOverride", e.target.checked)}
              className="h-4 w-4 accent-accent"
            />
            Manually override Net P&L (useful for binary options)
          </label>
          {values.useNetOverride && (
            <FormField label="Net P&L Override (USD)">
              <Input type="number" step="any" value={values.netPnlOverride} onChange={(e) => set("netPnlOverride", e.target.value)} />
            </FormField>
          )}

          <div className="rounded-lg border border-border bg-surface-2 p-4">
            <p className="mb-2 text-xs font-medium text-muted">
              Net P&L = Gross P&L − Fees {values.useNetOverride && "(overridden)"}
            </p>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-[10px] text-muted">USD</p>
                <p className={`text-sm font-semibold ${netPnl >= 0 ? "text-positive" : "text-negative"}`}>
                  {formatUsd(netPnl, { showSign: true })}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-muted">PKR</p>
                <p className={`text-sm font-semibold ${netPnl >= 0 ? "text-positive" : "text-negative"}`}>
                  {formatPkr(preview.pkr, { showSign: true })}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-muted">{netPnl >= 0 ? "24K Gold" : "Value Equivalent"}</p>
                <p className="text-sm font-semibold text-gold">{formatGrams(Math.abs(preview.grams))}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Journal & Context</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Strategy">
              <Select value={values.strategyId} onChange={(e) => set("strategyId", e.target.value)}>
                <option value="">—</option>
                {strategies.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="Setup">
              <Input value={values.setup} onChange={(e) => set("setup", e.target.value)} placeholder="Breakout retest…" />
            </FormField>
            <FormField label="Emotion">
              <Select value={values.emotion} onChange={(e) => set("emotion", e.target.value)}>
                <option value="">—</option>
                <option value="Confident">Confident</option>
                <option value="Calm">Calm</option>
                <option value="Anxious">Anxious</option>
                <option value="Greedy">Greedy</option>
                <option value="Fearful">Fearful</option>
                <option value="Revenge">Revenge</option>
                <option value="FOMO">FOMO</option>
              </Select>
            </FormField>
          </div>
          <FormField label="Notes">
            <Textarea value={values.notes} onChange={(e) => set("notes", e.target.value)} rows={3} />
          </FormField>
          <ScreenshotUpload value={values.screenshotUrl} onChange={(url) => set("screenshotUrl", url)} />
        </CardContent>
      </Card>

      {error && (
        <p className="rounded-lg border border-negative/30 bg-negative-bg px-4 py-2 text-sm text-negative">{error}</p>
      )}

      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={() => router.back()} disabled={pending}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} disabled={pending}>
          {pending ? "Saving…" : isEdit ? "Save Changes" : "Save Trade"}
        </Button>
      </div>
    </div>
  );
}
