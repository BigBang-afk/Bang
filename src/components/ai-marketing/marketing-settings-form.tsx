"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { updateMarketingSettingsAction } from "@/lib/actions/marketing-settings.actions";
import type { MarketingSettings } from "@/services/marketing-settings.service";

export function MarketingSettingsForm({ initial }: { initial: MarketingSettings }) {
  const [settings, setSettings] = useState(initial);
  const [pending, startTransition] = useTransition();

  function field<K extends keyof MarketingSettings>(key: K, value: string) {
    setSettings((prev) => ({ ...prev, [key]: Number(value) }));
  }

  function weightField(key: keyof MarketingSettings["engagementScoreWeights"], value: string) {
    setSettings((prev) => ({ ...prev, engagementScoreWeights: { ...prev.engagementScoreWeights, [key]: Number(value) } }));
  }

  const weightTotal =
    settings.engagementScoreWeights.recency +
    settings.engagementScoreWeights.frequency +
    settings.engagementScoreWeights.monetary +
    settings.engagementScoreWeights.engagement;

  function handleSave() {
    startTransition(async () => {
      const result = await updateMarketingSettingsAction(settings);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Marketing settings updated.");
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Frequency Control</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3">
          <Field label="Max messages / customer / day" value={settings.maxMessagesPerCustomerPerDay} onChange={(v) => field("maxMessagesPerCustomerPerDay", v)} />
          <Field label="Max messages / customer / week" value={settings.maxMessagesPerCustomerPerWeek} onChange={(v) => field("maxMessagesPerCustomerPerWeek", v)} />
          <Field label="Min gap between campaigns (hours)" value={settings.minCampaignGapHours} onChange={(v) => field("minCampaignGapHours", v)} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Rate Limiting &amp; Retry</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3">
          <Field label="Messages / minute" value={settings.rateLimitPerMinute} onChange={(v) => field("rateLimitPerMinute", v)} />
          <Field label="Messages / hour" value={settings.rateLimitPerHour} onChange={(v) => field("rateLimitPerHour", v)} />
          <Field label="Max retries" value={settings.maxRetries} onChange={(v) => field("maxRetries", v)} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Attribution &amp; Scoring</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <Field label="Attribution window (days)" value={settings.attributionWindowDays} onChange={(v) => field("attributionWindowDays", v)} />
          <Field label="RFM lookback period (days)" value={settings.rfmPeriodDays} onChange={(v) => field("rfmPeriodDays", v)} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            Business Engagement Score Weights{" "}
            <span className={weightTotal === 100 ? "text-success" : "text-danger"}>(sum: {weightTotal}/100)</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-4">
          <Field label="Recency" value={settings.engagementScoreWeights.recency} onChange={(v) => weightField("recency", v)} />
          <Field label="Frequency" value={settings.engagementScoreWeights.frequency} onChange={(v) => weightField("frequency", v)} />
          <Field label="Monetary" value={settings.engagementScoreWeights.monetary} onChange={(v) => weightField("monetary", v)} />
          <Field label="Engagement" value={settings.engagementScoreWeights.engagement} onChange={(v) => weightField("engagement", v)} />
        </CardContent>
      </Card>

      <div>
        <Button onClick={handleSave} disabled={pending || weightTotal !== 100}>
          {pending ? "Saving..." : "Save Settings"}
        </Button>
      </div>
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: number; onChange: (value: string) => void }) {
  return (
    <div className="grid gap-1.5">
      <Label>{label}</Label>
      <Input type="number" min={0} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
