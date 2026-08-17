"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Search, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  searchCustomersForInsightsAction,
  getCustomerInsightsAction,
  type CustomerSearchOption,
  type CustomerInsightBundle,
} from "@/lib/actions/customer-insights.actions";
import { AI_SEGMENT_LABELS } from "@/types/marketing";
import { formatCurrency } from "@/lib/format";

export function CustomerInsightsPanel() {
  const [pending, startTransition] = useTransition();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CustomerSearchOption[]>([]);
  const [selected, setSelected] = useState<CustomerSearchOption | null>(null);
  const [insights, setInsights] = useState<CustomerInsightBundle | null>(null);

  function handleSearch(value: string) {
    setQuery(value);
    startTransition(async () => {
      const result = await searchCustomersForInsightsAction(value);
      if (result.ok) setResults(result.data);
    });
  }

  function handleSelect(customer: CustomerSearchOption) {
    setSelected(customer);
    setResults([]);
    setInsights(null);
    startTransition(async () => {
      const result = await getCustomerInsightsAction({ customerId: customer.id });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setInsights(result.data);
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
        <Input className="pl-8" value={query} onChange={(e) => handleSearch(e.target.value)} placeholder="Search customers by name or phone" />
      </div>
      {!selected && results.length > 0 && (
        <ul className="max-w-md overflow-hidden rounded-md border border-border">
          {results.map((c) => (
            <li key={c.id}>
              <button type="button" className="w-full px-3 py-2 text-left text-sm hover:bg-surface-elevated" onClick={() => handleSelect(c)}>
                {c.name} — {c.customerCode} — {c.phone}
              </button>
            </li>
          ))}
        </ul>
      )}

      {selected && (
        <div className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold text-foreground">{selected.name}</h2>

          {pending && !insights && <p className="text-sm text-muted-foreground">Loading insights...</p>}

          {insights && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="size-4 text-gold" /> AI Customer Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-foreground">{insights.summary.text}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Segments</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-2">
                  {insights.segments.map((s) => (
                    <Badge key={s}>{AI_SEGMENT_LABELS[s]}</Badge>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Business Engagement Score</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-semibold text-gold">{insights.score.score}/100</p>
                  <p className="mb-3 text-xs text-muted-foreground">
                    A purchasing-behavior metric — not a prediction of personality or private characteristics.
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
                    <div>
                      <p className="text-muted-foreground">Recency</p>
                      <p className="font-medium">{insights.score.recencySubscore}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Frequency</p>
                      <p className="font-medium">{insights.score.frequencySubscore}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Monetary</p>
                      <p className="font-medium">{insights.score.monetarySubscore}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Engagement</p>
                      <p className="font-medium">{insights.score.engagementSubscore}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Recommended Products</CardTitle>
                </CardHeader>
                <CardContent>
                  {insights.recommendations.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No purchase history to base a recommendation on yet.</p>
                  ) : (
                    <ul className="space-y-2">
                      {insights.recommendations.map((r) => (
                        <li key={r.inventoryItemId} className="rounded-md border border-border p-2 text-sm">
                          <p className="font-medium">
                            {r.productName} — {formatCurrency(r.sellingPrice)}
                          </p>
                          <p className="text-xs text-muted-foreground">{r.reason}</p>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </div>
      )}
    </div>
  );
}
