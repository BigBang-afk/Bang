"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { generateCampaignMessageAction } from "@/lib/actions/message-generator.actions";
import {
  CAMPAIGN_OBJECTIVES,
  CAMPAIGN_TYPES,
  MESSAGE_LANGUAGES,
  MESSAGE_LANGUAGE_LABELS,
  MESSAGE_TONES,
  AI_SEGMENTS,
  AI_SEGMENT_LABELS,
} from "@/types/marketing";

export function StandaloneMessageGenerator() {
  const [pending, startTransition] = useTransition();
  const [segmentLabel, setSegmentLabel] = useState<string>(AI_SEGMENTS[0]);
  const [productName, setProductName] = useState("");
  const [campaignType, setCampaignType] = useState<(typeof CAMPAIGN_TYPES)[number]>("SPECIAL_OFFER");
  const [objective, setObjective] = useState<(typeof CAMPAIGN_OBJECTIVES)[number]>("ENGAGEMENT");
  const [tone, setTone] = useState<(typeof MESSAGE_TONES)[number]>("friendly");
  const [language, setLanguage] = useState<(typeof MESSAGE_LANGUAGES)[number]>("ENGLISH");
  const [offer, setOffer] = useState("");
  const [callToAction, setCallToAction] = useState("");
  const [result, setResult] = useState<{ template: string; safe: boolean; violations: string[] } | null>(null);

  function handleGenerate() {
    startTransition(async () => {
      const response = await generateCampaignMessageAction({
        segmentLabel: AI_SEGMENT_LABELS[segmentLabel as keyof typeof AI_SEGMENT_LABELS],
        productName: productName || undefined,
        campaignType,
        objective,
        tone,
        language,
        offer: offer || undefined,
        callToAction: callToAction || undefined,
      });
      if (!response.ok) {
        toast.error(response.error);
        return;
      }
      setResult({ template: response.data.template, safe: response.data.safe, violations: response.data.violations.map((v) => v.message) });
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Inputs</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="gen-segment">Customer Segment</Label>
            <Select value={segmentLabel} onValueChange={setSegmentLabel}>
              <SelectTrigger id="gen-segment">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AI_SEGMENTS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {AI_SEGMENT_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="gen-product">Product (optional)</Label>
            <Input id="gen-product" value={productName} onChange={(e) => setProductName(e.target.value)} placeholder="e.g. Gold Necklace" />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="gen-campaign-type">Campaign Type</Label>
            <Select value={campaignType} onValueChange={(v) => setCampaignType(v as typeof campaignType)}>
              <SelectTrigger id="gen-campaign-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CAMPAIGN_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t.replace(/_/g, " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="gen-objective">Campaign Objective</Label>
            <Select value={objective} onValueChange={(v) => setObjective(v as typeof objective)}>
              <SelectTrigger id="gen-objective">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CAMPAIGN_OBJECTIVES.map((o) => (
                  <SelectItem key={o} value={o}>
                    {o}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="gen-tone">Tone</Label>
              <Select value={tone} onValueChange={(v) => setTone(v as typeof tone)}>
                <SelectTrigger id="gen-tone">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MESSAGE_TONES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="gen-language">Language</Label>
              <Select value={language} onValueChange={(v) => setLanguage(v as typeof language)}>
                <SelectTrigger id="gen-language">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MESSAGE_LANGUAGES.map((l) => (
                    <SelectItem key={l} value={l}>
                      {MESSAGE_LANGUAGE_LABELS[l]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="gen-offer">Offer (optional)</Label>
            <Input id="gen-offer" value={offer} onChange={(e) => setOffer(e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="gen-cta">Call To Action (optional)</Label>
            <Input id="gen-cta" value={callToAction} onChange={(e) => setCallToAction(e.target.value)} />
          </div>
          <Button onClick={handleGenerate} disabled={pending}>
            <Sparkles className="size-4" /> {pending ? "Generating..." : "Generate Message"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Generated Message</CardTitle>
        </CardHeader>
        <CardContent>
          {!result ? (
            <p className="text-sm text-muted-foreground">Fill in the inputs and generate a message template.</p>
          ) : (
            <div className="flex flex-col gap-3">
              <p className="whitespace-pre-wrap rounded-md border border-border bg-surface-elevated p-3 text-sm">{result.template}</p>
              {!result.safe && (
                <ul className="rounded-md border border-danger/30 bg-danger-soft p-2 text-xs text-danger">
                  {result.violations.map((v, i) => (
                    <li key={i}>{v}</li>
                  ))}
                </ul>
              )}
              <p className="text-xs text-muted-foreground">
                This is a template — placeholders are filled in per recipient only when used inside a campaign.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
