import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format";
import { PURITY_LABELS, type GoldPurity } from "@/types/gold";
import type { EffectiveRateRow } from "@/services/gold-rate.service";

const DISPLAY_ORDER: GoldPurity[] = ["K24", "K22", "K21", "K18", "SILVER"];

export function GoldRateSummary({ rates }: { rates: EffectiveRateRow[] }) {
  const byPurity = new Map(rates.map((rate) => [rate.purity, rate]));
  const visiblePurities = DISPLAY_ORDER.filter(
    (purity) => purity !== "SILVER" || byPurity.has("SILVER"),
  );

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle>Today&apos;s Gold Rates</CardTitle>
        <Link
          href="/settings/gold-rates/history"
          className="flex items-center gap-1 text-xs font-medium text-gold hover:underline"
        >
          History
          <ArrowUpRight className="size-3" />
        </Link>
      </CardHeader>
      <CardContent>
        {rates.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No rates recorded for today yet.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
            {visiblePurities.map((purity) => {
              const rate = byPurity.get(purity);
              return (
                <div
                  key={purity}
                  className="rounded-md border border-border bg-surface-elevated px-3 py-3"
                >
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {PURITY_LABELS[purity]}
                  </p>
                  <p className="mt-1 text-lg font-semibold text-gold">
                    {rate ? formatCurrency(rate.ratePerGram.toString()) : "—"}
                  </p>
                  <p className="text-[11px] text-muted-foreground">per gram</p>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
