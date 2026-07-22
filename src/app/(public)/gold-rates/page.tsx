import type { Metadata } from "next";
import { GoldRateBar } from "@/components/gold-rate/gold-rate-bar";
import { GoldRateHistoryChart } from "./history-chart";
import { SectionHeading } from "@/components/ui/section-heading";
import { LinkButton } from "@/components/ui/button";
import { getActiveGoldRates, getGoldRateHistory } from "@/lib/data/gold-rates";
import { getWebsiteSettings } from "@/lib/data/settings";
import { formatDate, formatPKR } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Today's Gold Rates in Quetta",
  description: "Check today's 24K, 22K, 21K and 18K gold rates per tola and per gram at Zarghoon Jewellers, Sarafa Market, Quetta.",
};

export default async function GoldRatesPage() {
  const [rates, settings, history24k] = await Promise.all([
    getActiveGoldRates(),
    getWebsiteSettings(),
    getGoldRateHistory({ purity: "24K", limit: 30 }),
  ]);

  const chartData = history24k.slice().reverse().map((h) => ({ date: h.effective_date, ratePerGram: parseFloat(h.rate_per_gram) }));

  return (
    <div>
      <section className="bg-charcoal py-16 text-center text-ivory">
        <div className="mx-auto max-w-3xl px-4">
          <p className="mb-2 text-xs uppercase tracking-[0.25em] text-gold">Zarghoon Jewellers</p>
          <h1 className="font-serif text-4xl">Today&apos;s Gold Rates</h1>
          <p className="mt-3 text-sm text-ivory/70">Updated by our team throughout the day. Confirm the final rate with our showroom before purchase.</p>
        </div>
      </section>

      <GoldRateBar rates={rates} disclaimer={settings.gold_rate_disclaimer} />

      <section className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
        <SectionHeading eyebrow="Trend" title="24K Gold Rate — Last 30 Updates" />
        <div className="mt-8 rounded-sm border border-charcoal/10 bg-white p-6">
          <GoldRateHistoryChart data={chartData} />
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 pb-16 sm:px-6 lg:px-8">
        <div className="overflow-x-auto rounded-sm border border-charcoal/10">
          <table className="w-full min-w-[500px] text-left text-sm">
            <thead className="bg-ivory-dark/60">
              <tr>
                <th className="px-4 py-3 text-xs uppercase tracking-wide text-charcoal/50">Date</th>
                <th className="px-4 py-3 text-xs uppercase tracking-wide text-charcoal/50">Rate / Tola</th>
                <th className="px-4 py-3 text-xs uppercase tracking-wide text-charcoal/50">Rate / Gram</th>
                <th className="px-4 py-3 text-xs uppercase tracking-wide text-charcoal/50">Change</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-charcoal/10 bg-white">
              {history24k.slice(0, 10).map((h) => (
                <tr key={h.id}>
                  <td className="px-4 py-3">{formatDate(h.effective_date)}</td>
                  <td className="px-4 py-3">{formatPKR(h.rate_per_tola)}</td>
                  <td className="px-4 py-3">{formatPKR(h.rate_per_gram)}</td>
                  <td className={`px-4 py-3 ${parseFloat(h.rate_change) >= 0 ? "text-green-700" : "text-red-700"}`}>
                    {parseFloat(h.rate_change) >= 0 ? "+" : ""}{formatPKR(h.rate_change)} ({h.percentage_change}%)
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-xs text-charcoal/50">
          Final jewelry prices depend on the exact gross weight and gold purity of each piece — see the Gold Calculator for an item-level estimate.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <LinkButton href="/gold-calculator" variant="gold">Use Gold Calculator</LinkButton>
          <LinkButton href="/products" variant="outline">Browse Products</LinkButton>
        </div>
      </section>
    </div>
  );
}
