import type { Metadata } from "next";
import { getCurrentGoldRates } from "@/lib/gold";
import { formatPkr, formatDateTime, purityLabel } from "@/lib/format";
import { GoldRateChart } from "@/components/charts/GoldRateChart";

export const metadata: Metadata = {
  title: "Today's Gold Rate",
  description: "Check today's live 24K, 21K and 18K gold rates per gram in PKR at Zarghoon Jewellers, Quetta.",
  alternates: { canonical: "/gold-rate" },
};

export default async function GoldRatePage() {
  const rates = await getCurrentGoldRates();
  const entries: { purity: "K24" | "K21" | "K18"; rate: number | null; at: Date | undefined }[] = [
    { purity: "K24", rate: rates.K24, at: rates.effectiveAt.K24 },
    { purity: "K21", rate: rates.K21, at: rates.effectiveAt.K21 },
    { purity: "K18", rate: rates.K18, at: rates.effectiveAt.K18 },
  ];

  return (
    <div className="mx-auto max-w-5xl px-6 py-16">
      <div className="text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-gold-dark">Live Pricing</p>
        <h1 className="mt-2 font-display text-4xl text-maroon">Today&apos;s Gold Rate</h1>
        <div className="gold-divider mx-auto my-6 w-32" />
        <p className="text-brown-light">
          All product prices on our website are calculated automatically using the rate below —
          never a fixed, outdated price.
        </p>
      </div>

      <div className="mt-12 grid gap-6 sm:grid-cols-3">
        {entries.map((e) => (
          <div key={e.purity} className="rounded-sm border border-gold/30 bg-ivory p-8 text-center shadow-sm">
            <p className="font-display text-2xl text-maroon">{purityLabel(e.purity)} Gold</p>
            <p className="mt-4 font-display text-4xl font-semibold text-gold-dark">
              {e.rate != null ? formatPkr(e.rate, 0) : "—"}
            </p>
            <p className="mt-1 text-xs uppercase tracking-wider text-brown-light">per gram</p>
            {e.at && <p className="mt-4 text-xs text-brown-light">Updated {formatDateTime(e.at)}</p>}
          </div>
        ))}
      </div>

      <div className="mt-16">
        <h2 className="text-center font-display text-2xl text-maroon">Rate History</h2>
        <div className="mt-6 rounded-sm border border-gold/20 bg-ivory p-6">
          <GoldRateChart />
        </div>
      </div>
    </div>
  );
}
