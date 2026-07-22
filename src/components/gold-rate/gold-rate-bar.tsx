import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { formatPKR, formatDate, formatTime } from "@/lib/utils";
import type { GoldRate } from "@/types/database";

function ChangeIndicator({ change }: { change: number }) {
  if (change > 0) return <span className="flex items-center gap-1 text-green-400"><TrendingUp size={14} /> +{formatPKR(change)}</span>;
  if (change < 0) return <span className="flex items-center gap-1 text-red-400"><TrendingDown size={14} /> {formatPKR(change)}</span>;
  return <span className="flex items-center gap-1 text-ivory/50"><Minus size={14} /> No change</span>;
}

export function GoldRateBar({ rates, disclaimer }: { rates: GoldRate[]; disclaimer: string }) {
  const ordered = ["24K", "22K", "21K", "18K"] as const;
  const byPurity = new Map(rates.map((r) => [r.purity, r]));
  const latest = rates[0];

  return (
    <section aria-label="Today's gold rates" className="bg-charcoal text-ivory">
      <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs uppercase tracking-widest text-gold">Today&apos;s Gold Rates</p>
          {latest && (
            <p className="text-xs text-ivory/50">
              Updated {formatDate(latest.updated_at)} at {formatTime(latest.updated_at)} · Source: {latest.rate_source} ·{" "}
              {latest.is_manual ? "Manual" : "Automatic"}
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {ordered.map((purity) => {
            const rate = byPurity.get(purity);
            if (!rate) return null;
            const change = parseFloat(rate.rate_change);
            return (
              <div key={purity} className="rounded-sm border border-white/10 bg-white/5 p-3.5">
                <p className="font-serif text-lg text-gold">{purity}</p>
                <p className="mt-1 text-base font-medium">{formatPKR(rate.rate_per_tola)} <span className="text-xs font-normal text-ivory/50">/tola</span></p>
                <p className="text-xs text-ivory/60">{formatPKR(rate.rate_per_gram)} /gram · {formatPKR(rate.rate_per_10_grams)} /10g</p>
                <div className="mt-1.5 text-xs"><ChangeIndicator change={change} /></div>
              </div>
            );
          })}
        </div>

        <p className="mt-4 text-xs italic text-ivory/50">{disclaimer}</p>
      </div>
    </section>
  );
}
