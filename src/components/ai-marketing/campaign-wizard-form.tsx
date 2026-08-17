"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Sparkles, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  createCampaignAction,
  previewAudienceAction,
  searchProductsForCampaignAction,
} from "@/lib/actions/campaigns.actions";
import { generateCampaignMessageAction } from "@/lib/actions/message-generator.actions";
import {
  CAMPAIGN_OBJECTIVES,
  CAMPAIGN_TYPES,
  MESSAGE_LANGUAGES,
  MESSAGE_LANGUAGE_LABELS,
  MESSAGE_TONES,
} from "@/types/marketing";
import type { PosCatalogItem } from "@/types/sales";
import type { AudienceResolution } from "@/services/audience-builder.service";

const CUSTOMER_TYPES = ["REGULAR", "VIP", "WHOLESALE", "CORPORATE"] as const;

export function CampaignWizardForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  // Step 1-2: identity + objective
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [objective, setObjective] = useState<(typeof CAMPAIGN_OBJECTIVES)[number]>("ENGAGEMENT");
  const [campaignType, setCampaignType] = useState<(typeof CAMPAIGN_TYPES)[number]>("SPECIAL_OFFER");

  // Step 3: audience
  const [customerType, setCustomerType] = useState<string[]>([]);
  const [vipOnly, setVipOnly] = useState(false);
  const [lastPurchaseOlderThanDays, setLastPurchaseOlderThanDays] = useState("");
  const [minTotalSpending, setMinTotalSpending] = useState("");
  const [minPurchaseCount, setMinPurchaseCount] = useState("");
  const [city, setCity] = useState("");
  const [audiencePreview, setAudiencePreview] = useState<AudienceResolution | null>(null);

  // Step 4: product
  const [productQuery, setProductQuery] = useState("");
  const [productResults, setProductResults] = useState<PosCatalogItem[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<PosCatalogItem | null>(null);

  // Step 5: offer
  const [offer, setOffer] = useState("");
  const [expiryDate, setExpiryDate] = useState("");

  // Step 6: message
  const [tone, setTone] = useState<(typeof MESSAGE_TONES)[number]>("friendly");
  const [language, setLanguage] = useState<(typeof MESSAGE_LANGUAGES)[number]>("ENGLISH");
  const [callToAction, setCallToAction] = useState("");
  const [messageTemplate, setMessageTemplate] = useState("");
  const [safetyViolations, setSafetyViolations] = useState<string[]>([]);

  function buildAudienceFilters() {
    return {
      customerType: customerType.length > 0 ? customerType : undefined,
      vipOnly: vipOnly || undefined,
      lastPurchaseOlderThanDays: lastPurchaseOlderThanDays ? Number(lastPurchaseOlderThanDays) : undefined,
      minTotalSpending: minTotalSpending ? Number(minTotalSpending) : undefined,
      minPurchaseCount: minPurchaseCount ? Number(minPurchaseCount) : undefined,
      city: city || undefined,
      requireOptedIn: true,
    };
  }

  function handlePreviewAudience() {
    startTransition(async () => {
      const result = await previewAudienceAction({ filters: buildAudienceFilters() });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setAudiencePreview(result.data);
    });
  }

  function handleSearchProducts(query: string) {
    setProductQuery(query);
    startTransition(async () => {
      const result = await searchProductsForCampaignAction(query);
      if (result.ok) setProductResults(result.data);
    });
  }

  function handleGenerateMessage() {
    startTransition(async () => {
      const result = await generateCampaignMessageAction({
        productName: selectedProduct?.productName,
        campaignType,
        objective,
        tone,
        language,
        offer: offer || undefined,
        callToAction: callToAction || undefined,
        hasExpiryDate: Boolean(expiryDate),
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setMessageTemplate(result.data.template);
      setSafetyViolations(result.data.violations.map((v) => v.message));
      if (!result.data.safe) toast.warning("This message needs edits before it can be submitted for approval.");
    });
  }

  function handleSaveDraft() {
    startTransition(async () => {
      const result = await createCampaignAction({
        name,
        description: description || undefined,
        objective,
        campaignType,
        audienceFilters: buildAudienceFilters(),
        language,
        productId: selectedProduct?.inventoryItemId,
        offer: offer || undefined,
        expiryDate: expiryDate || undefined,
        messageTemplate,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Campaign saved as draft.");
      router.push(`/ai-marketing/campaigns/${result.data.id}`);
    });
  }

  const canSave = name.trim().length > 0 && messageTemplate.trim().length > 0;

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Step 1-2 · Name &amp; Objective</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <div className="grid gap-1.5 sm:col-span-2">
            <Label htmlFor="campaign-name">Campaign Name</Label>
            <Input id="campaign-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Eid New Collection Announcement" />
          </div>
          <div className="grid gap-1.5 sm:col-span-2">
            <Label htmlFor="campaign-description">Description (optional)</Label>
            <Input id="campaign-description" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="campaign-objective">Objective</Label>
            <Select value={objective} onValueChange={(v) => setObjective(v as typeof objective)}>
              <SelectTrigger id="campaign-objective">
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
          <div className="grid gap-1.5">
            <Label htmlFor="campaign-type">Campaign Type</Label>
            <Select value={campaignType} onValueChange={(v) => setCampaignType(v as typeof campaignType)}>
              <SelectTrigger id="campaign-type">
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Step 3 · Audience</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <div className="grid gap-1.5 sm:col-span-2">
            <Label>Customer Type</Label>
            <div className="flex flex-wrap gap-3">
              {CUSTOMER_TYPES.map((ct) => (
                <label key={ct} className="flex items-center gap-1.5 text-sm">
                  <input
                    type="checkbox"
                    checked={customerType.includes(ct)}
                    onChange={(e) =>
                      setCustomerType((prev) => (e.target.checked ? [...prev, ct] : prev.filter((c) => c !== ct)))
                    }
                  />
                  {ct}
                </label>
              ))}
              <label className="flex items-center gap-1.5 text-sm">
                <input type="checkbox" checked={vipOnly} onChange={(e) => setVipOnly(e.target.checked)} />
                VIP only
              </label>
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="audience-last-purchase">Last purchase older than (days)</Label>
            <Input id="audience-last-purchase" type="number" min={0} value={lastPurchaseOlderThanDays} onChange={(e) => setLastPurchaseOlderThanDays(e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="audience-city">City</Label>
            <Input id="audience-city" value={city} onChange={(e) => setCity(e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="audience-min-spending">Minimum total spending</Label>
            <Input id="audience-min-spending" type="number" min={0} value={minTotalSpending} onChange={(e) => setMinTotalSpending(e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="audience-min-count">Minimum purchase count</Label>
            <Input id="audience-min-count" type="number" min={0} value={minPurchaseCount} onChange={(e) => setMinPurchaseCount(e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <Button type="button" variant="secondary" onClick={handlePreviewAudience} disabled={pending}>
              Preview Audience
            </Button>
          </div>
          {audiencePreview && (
            <div className="sm:col-span-2 grid grid-cols-2 gap-2 rounded-md border border-border bg-surface-elevated p-3 text-sm sm:grid-cols-4">
              <div>
                <p className="text-muted-foreground">Audience</p>
                <p className="font-semibold">{audiencePreview.matchedCount}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Eligible</p>
                <p className="font-semibold text-success">{audiencePreview.eligibleCount}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Opted out / no consent</p>
                <p className="font-semibold">{audiencePreview.excludedNotOptedIn}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Recently contacted</p>
                <p className="font-semibold">{audiencePreview.excludedRecentlyContacted}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Step 4-5 · Product &amp; Offer</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <div className="grid gap-1.5 sm:col-span-2">
            <Label htmlFor="product-search">Product (optional)</Label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
              <Input
                id="product-search"
                className="pl-8"
                value={productQuery}
                onChange={(e) => handleSearchProducts(e.target.value)}
                placeholder="Search in-stock items by name or barcode"
              />
            </div>
            {selectedProduct && (
              <p className="text-sm">
                Selected: <span className="font-medium">{selectedProduct.productName}</span>{" "}
                <Button type="button" variant="ghost" className="h-auto p-0 text-xs" onClick={() => setSelectedProduct(null)}>
                  clear
                </Button>
              </p>
            )}
            {!selectedProduct && productResults.length > 0 && (
              <ul className="max-h-48 overflow-y-auto rounded-md border border-border">
                {productResults.map((item) => (
                  <li key={item.inventoryItemId}>
                    <button
                      type="button"
                      className="w-full px-3 py-2 text-left text-sm hover:bg-surface-elevated"
                      onClick={() => {
                        setSelectedProduct(item);
                        setProductResults([]);
                        setProductQuery(item.productName);
                      }}
                    >
                      {item.productName} — {item.purity}, {item.netWeight}g
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="campaign-offer">Offer (optional)</Label>
            <Input id="campaign-offer" value={offer} onChange={(e) => setOffer(e.target.value)} placeholder="e.g. Free polishing with every purchase this week" />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="campaign-expiry">Expiry Date (optional)</Label>
            <Input id="campaign-expiry" type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Step 6-7 · Message &amp; Preview</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <Label htmlFor="message-tone">Tone</Label>
            <Select value={tone} onValueChange={(v) => setTone(v as typeof tone)}>
              <SelectTrigger id="message-tone">
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
            <Label htmlFor="message-language">Language</Label>
            <Select value={language} onValueChange={(v) => setLanguage(v as typeof language)}>
              <SelectTrigger id="message-language">
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
          <div className="grid gap-1.5 sm:col-span-2">
            <Label htmlFor="message-cta">Call To Action (optional)</Label>
            <Input id="message-cta" value={callToAction} onChange={(e) => setCallToAction(e.target.value)} placeholder="e.g. Reply YES to book a visit" />
          </div>
          <div className="sm:col-span-2">
            <Button type="button" variant="secondary" onClick={handleGenerateMessage} disabled={pending}>
              <Sparkles className="size-4" /> Generate with AI
            </Button>
          </div>
          <div className="grid gap-1.5 sm:col-span-2">
            <Label htmlFor="message-template">
              Message Template <Badge variant="default">AI RECOMMENDATION</Badge>
            </Label>
            <textarea
              id="message-template"
              className="min-h-28 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              value={messageTemplate}
              onChange={(e) => setMessageTemplate(e.target.value)}
              placeholder="{{customer_name}}, {{shop_name}} has something for you..."
            />
            <p className="text-xs text-muted-foreground">
              Allowed placeholders: {"{{customer_name}}"}, {"{{product_name}}"}, {"{{shop_name}}"}, {"{{gold_rate}}"}, {"{{offer}}"}, {"{{expiry_date}}"}.
              Placeholders are filled in per-recipient when the campaign is launched — never before.
            </p>
            {safetyViolations.length > 0 && (
              <ul className="rounded-md border border-danger/30 bg-danger-soft p-2 text-xs text-danger">
                {safetyViolations.map((v, i) => (
                  <li key={i}>{v}</li>
                ))}
              </ul>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button type="button" onClick={handleSaveDraft} disabled={pending || !canSave}>
          {pending ? "Saving..." : "Save as Draft"}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Saving creates a DRAFT campaign. Submitting for approval, approving, scheduling, and launching happen on the
        campaign&apos;s own detail page — a campaign is never sent from this form.
      </p>
    </div>
  );
}
