"use client";

import { useState, useTransition } from "react";
import { completeSetupAction } from "@/lib/actions/setup";
import { Card } from "@/components/ui/card";
import { Input, FormField, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { previewUsdToPkrAndGold, formatUsd, formatPkr, formatGrams } from "@/lib/money";
import { cn, todayDateInputValue } from "@/lib/utils";
import { Check } from "lucide-react";

const steps = ["Trading Account", "Currency", "Gold"];

export function SetupWizard({ defaultTraderName }: { defaultTraderName: string }) {
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const [traderName, setTraderName] = useState(defaultTraderName || "");
  const [startingBalanceUsd, setStartingBalanceUsd] = useState("5000");
  const [mainTradingType, setMainTradingType] = useState("FOREX");
  const [usdToPkrRate, setUsdToPkrRate] = useState("280");
  const [goldPricePerGramPkr, setGoldPricePerGramPkr] = useState("29000");
  const [ratesUpdatedAt, setRatesUpdatedAt] = useState(todayDateInputValue());

  const preview = previewUsdToPkrAndGold(100, Number(usdToPkrRate) || 0, Number(goldPricePerGramPkr) || 0);

  function next() {
    setError(null);
    if (step === 0 && (!traderName.trim() || Number(startingBalanceUsd) < 0)) {
      setError("Please enter your name and a valid starting balance.");
      return;
    }
    if (step === 1 && Number(usdToPkrRate) <= 0) {
      setError("Exchange rate must be greater than zero.");
      return;
    }
    setStep((s) => Math.min(s + 1, steps.length - 1));
  }

  function back() {
    setError(null);
    setStep((s) => Math.max(s - 1, 0));
  }

  function submit() {
    setError(null);
    if (Number(goldPricePerGramPkr) <= 0) {
      setError("Gold price must be greater than zero.");
      return;
    }
    startTransition(async () => {
      const result = await completeSetupAction({
        traderName,
        startingBalanceUsd: Number(startingBalanceUsd),
        mainTradingType,
        usdToPkrRate: Number(usdToPkrRate),
        goldPricePerGramPkr: Number(goldPricePerGramPkr),
        ratesUpdatedAt,
      });
      if (result?.error) setError(result.error);
    });
  }

  return (
    <Card className="p-6">
      <div className="mb-6 flex items-center justify-center gap-2">
        {steps.map((label, i) => (
          <div key={label} className="flex items-center gap-2">
            <div
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold",
                i < step ? "bg-positive text-white" : i === step ? "bg-accent text-white" : "bg-surface-2 text-muted"
              )}
            >
              {i < step ? <Check size={14} /> : i + 1}
            </div>
            {i < steps.length - 1 && <div className="h-px w-8 bg-border-strong" />}
          </div>
        ))}
      </div>

      {step === 0 && (
        <div className="space-y-4">
          <FormField label="Trader Name">
            <Input value={traderName} onChange={(e) => setTraderName(e.target.value)} placeholder="Your name" />
          </FormField>
          <FormField label="Starting Trading Balance (USD)">
            <Input
              type="number"
              step="0.01"
              min="0"
              value={startingBalanceUsd}
              onChange={(e) => setStartingBalanceUsd(e.target.value)}
            />
          </FormField>
          <FormField label="Main Trading Type">
            <Select value={mainTradingType} onChange={(e) => setMainTradingType(e.target.value)}>
              <option value="FOREX">Forex</option>
              <option value="CRYPTO">Crypto</option>
              <option value="BINARY">Binary</option>
              <option value="STOCKS">Stocks</option>
              <option value="MIXED">Mixed</option>
            </Select>
          </FormField>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-4">
          <FormField label="1 USD = ? PKR" hint="Example: 1 USD = 280 PKR">
            <Input type="number" step="0.01" min="0" value={usdToPkrRate} onChange={(e) => setUsdToPkrRate(e.target.value)} />
          </FormField>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <FormField label="24K Gold Price Per Gram (PKR)" hint="Example: 1 gram = 29,000 PKR">
            <Input
              type="number"
              step="0.01"
              min="0"
              value={goldPricePerGramPkr}
              onChange={(e) => setGoldPricePerGramPkr(e.target.value)}
            />
          </FormField>
          <FormField label="Rates Last Updated (optional)">
            <Input type="date" value={ratesUpdatedAt} onChange={(e) => setRatesUpdatedAt(e.target.value)} />
          </FormField>

          <div className="rounded-lg border border-border bg-surface-2 p-4">
            <p className="mb-2 text-xs font-medium text-muted">Live preview — example on $100 profit</p>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-[10px] text-muted">USD</p>
                <p className="text-sm font-semibold">{formatUsd(preview.usd)}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted">PKR</p>
                <p className="text-sm font-semibold">{formatPkr(preview.pkr)}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted">24K Gold</p>
                <p className="text-sm font-semibold text-gold">{formatGrams(preview.grams)}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {error && <p className="mt-4 text-xs text-negative">{error}</p>}

      <div className="mt-6 flex items-center justify-between">
        <Button variant="outline" onClick={back} disabled={step === 0 || pending}>
          Back
        </Button>
        {step < steps.length - 1 ? (
          <Button onClick={next}>Next</Button>
        ) : (
          <Button onClick={submit} disabled={pending}>
            {pending ? "Setting up…" : "Finish Setup"}
          </Button>
        )}
      </div>
    </Card>
  );
}
