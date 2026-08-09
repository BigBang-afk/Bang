"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateSettingsAction } from "@/lib/actions/settings";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, FormField } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";

export interface SettingsValues {
  usdToPkrRate: string;
  goldPricePerGramPkr: string;
  defaultRiskPct: string;
  defaultDailyTargetPct: string;
  defaultDailyLossPct: string;
  defaultMaxTrades: string;
  defaultMaxConsecutiveLosses: string;
  countBreakevenAsWin: boolean;
  drawdownLowPct: string;
  drawdownModeratePct: string;
  drawdownHighPct: string;
  drawdownCriticalPct: string;
  theme: string;
  timezone: string;
}

export function SettingsForm({ initial }: { initial: SettingsValues }) {
  const router = useRouter();
  const [values, setValues] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  function set<K extends keyof SettingsValues>(key: K, v: SettingsValues[K]) {
    setValues((s) => ({ ...s, [key]: v }));
    setSaved(false);
  }

  function submit() {
    setError(null);
    startTransition(async () => {
      const result = await updateSettingsAction({
        usdToPkrRate: Number(values.usdToPkrRate),
        goldPricePerGramPkr: Number(values.goldPricePerGramPkr),
        defaultRiskPct: Number(values.defaultRiskPct),
        defaultDailyTargetPct: Number(values.defaultDailyTargetPct),
        defaultDailyLossPct: Number(values.defaultDailyLossPct),
        defaultMaxTrades: Number(values.defaultMaxTrades),
        defaultMaxConsecutiveLosses: Number(values.defaultMaxConsecutiveLosses),
        countBreakevenAsWin: values.countBreakevenAsWin,
        drawdownLowPct: Number(values.drawdownLowPct),
        drawdownModeratePct: Number(values.drawdownModeratePct),
        drawdownHighPct: Number(values.drawdownHighPct),
        drawdownCriticalPct: Number(values.drawdownCriticalPct),
        theme: values.theme,
        timezone: values.timezone,
      });
      if (result?.error) setError(result.error);
      else {
        setSaved(true);
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Currency & Gold Rates</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormField label="1 USD = ? PKR">
            <Input type="number" step="any" min="0" value={values.usdToPkrRate} onChange={(e) => set("usdToPkrRate", e.target.value)} />
          </FormField>
          <FormField label="24K Gold Price Per Gram (PKR)">
            <Input type="number" step="any" min="0" value={values.goldPricePerGramPkr} onChange={(e) => set("goldPricePerGramPkr", e.target.value)} />
          </FormField>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Trading Defaults</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 md:grid-cols-3">
          <FormField label="Default Risk %">
            <Input type="number" step="any" value={values.defaultRiskPct} onChange={(e) => set("defaultRiskPct", e.target.value)} />
          </FormField>
          <FormField label="Daily Target %">
            <Input type="number" step="any" value={values.defaultDailyTargetPct} onChange={(e) => set("defaultDailyTargetPct", e.target.value)} />
          </FormField>
          <FormField label="Daily Loss %">
            <Input type="number" step="any" value={values.defaultDailyLossPct} onChange={(e) => set("defaultDailyLossPct", e.target.value)} />
          </FormField>
          <FormField label="Max Trades">
            <Input type="number" min="1" value={values.defaultMaxTrades} onChange={(e) => set("defaultMaxTrades", e.target.value)} />
          </FormField>
          <FormField label="Max Consecutive Losses">
            <Input type="number" min="1" value={values.defaultMaxConsecutiveLosses} onChange={(e) => set("defaultMaxConsecutiveLosses", e.target.value)} />
          </FormField>
          <div className="flex items-end pb-2">
            <label className="flex items-center gap-2 text-xs text-muted">
              <Checkbox checked={values.countBreakevenAsWin} onChange={(e) => set("countBreakevenAsWin", e.target.checked)} />
              Count breakeven trades as wins
            </label>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Drawdown Risk Thresholds</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <FormField label="Low ≥ %">
            <Input type="number" step="any" value={values.drawdownLowPct} onChange={(e) => set("drawdownLowPct", e.target.value)} />
          </FormField>
          <FormField label="Moderate ≥ %">
            <Input type="number" step="any" value={values.drawdownModeratePct} onChange={(e) => set("drawdownModeratePct", e.target.value)} />
          </FormField>
          <FormField label="High ≥ %">
            <Input type="number" step="any" value={values.drawdownHighPct} onChange={(e) => set("drawdownHighPct", e.target.value)} />
          </FormField>
          <FormField label="Critical ≥ %">
            <Input type="number" step="any" value={values.drawdownCriticalPct} onChange={(e) => set("drawdownCriticalPct", e.target.value)} />
          </FormField>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
        </CardHeader>
        <CardContent>
          <FormField label="Timezone">
            <Input value={values.timezone} onChange={(e) => set("timezone", e.target.value)} placeholder="Asia/Karachi" />
          </FormField>
        </CardContent>
      </Card>

      {error && <p className="text-sm text-negative">{error}</p>}
      <div className="flex items-center justify-end gap-3">
        {saved && <span className="text-xs text-positive">Saved</span>}
        <Button onClick={submit} disabled={pending}>
          {pending ? "Saving…" : "Save Settings"}
        </Button>
      </div>
    </div>
  );
}
