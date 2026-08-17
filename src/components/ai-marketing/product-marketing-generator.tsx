"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Search, Sparkles, Save } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { searchProductsForCampaignAction } from "@/lib/actions/campaigns.actions";
import { generateProductCaptionsAction, createContentDraftAction } from "@/lib/actions/content.actions";
import type { PosCatalogItem } from "@/types/sales";
import type { GeneratedCaption } from "@/services/content-generator.service";

export function ProductMarketingGenerator() {
  const [pending, startTransition] = useTransition();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PosCatalogItem[]>([]);
  const [selected, setSelected] = useState<PosCatalogItem | null>(null);
  const [captions, setCaptions] = useState<GeneratedCaption[] | null>(null);

  function handleSearch(value: string) {
    setQuery(value);
    startTransition(async () => {
      const result = await searchProductsForCampaignAction(value);
      if (result.ok) setResults(result.data);
    });
  }

  function handleGenerate() {
    if (!selected) return;
    startTransition(async () => {
      const result = await generateProductCaptionsAction({ inventoryItemId: selected.inventoryItemId });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setCaptions(result.data);
    });
  }

  function handleSaveDraft(caption: GeneratedCaption) {
    startTransition(async () => {
      const result = await createContentDraftAction({
        inventoryItemId: selected?.inventoryItemId,
        platform: caption.platform,
        contentType: "PRODUCT_SPOTLIGHT",
        body: caption.body,
        hashtags: caption.hashtags,
        callToAction: caption.callToAction,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Saved as a DRAFT content item — awaiting approval.");
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Select a Product</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
            <Input className="pl-8" value={query} onChange={(e) => handleSearch(e.target.value)} placeholder="Search in-stock items by name or barcode" />
          </div>
          {selected && (
            <p className="text-sm">
              Selected: <span className="font-medium">{selected.productName}</span> — {selected.purity}, {selected.netWeight}g
            </p>
          )}
          {!selected && results.length > 0 && (
            <ul className="max-h-48 overflow-y-auto rounded-md border border-border">
              {results.map((item) => (
                <li key={item.inventoryItemId}>
                  <button
                    type="button"
                    className="w-full px-3 py-2 text-left text-sm hover:bg-surface-elevated"
                    onClick={() => {
                      setSelected(item);
                      setResults([]);
                      setCaptions(null);
                    }}
                  >
                    {item.productName} — {item.purity}, {item.netWeight}g
                  </button>
                </li>
              ))}
            </ul>
          )}
          <Button onClick={handleGenerate} disabled={!selected || pending}>
            <Sparkles className="size-4" /> Generate Captions
          </Button>
        </CardContent>
      </Card>

      {captions && (
        <div className="grid gap-4 sm:grid-cols-2">
          {captions.map((caption) => (
            <Card key={caption.platform}>
              <CardHeader>
                <CardTitle className="text-sm">{caption.platform}</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                <p className="whitespace-pre-wrap rounded-md border border-border bg-surface-elevated p-2 text-sm">{caption.body}</p>
                <p className="text-xs text-muted-foreground">{caption.hashtags.join(" ")}</p>
                <Button variant="secondary" size="sm" onClick={() => handleSaveDraft(caption)} disabled={pending}>
                  <Save className="size-3.5" /> Save as Draft
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
