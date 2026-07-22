import type { Metadata } from "next";
import Link from "next/link";
import { getActiveGoldRates } from "@/lib/data/gold-rates";
import { BaseRateForm, PurityRateCard } from "@/components/admin/gold-rate-form";
import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { GOLD_PURITIES } from "@/lib/constants";
import type { GoldRate } from "@/types/database";

export const metadata: Metadata = { title: "Gold Rates" };

export default async function AdminGoldRatesPage() {
  const rates = await getActiveGoldRates();
  const byPurity = new Map(rates.map((r) => [r.purity, r]));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-2xl text-charcoal">Gold Rate Management</h1>
          <p className="text-sm text-charcoal/60">
            Only one active rate set is used for public product calculations. Every change here is logged to{" "}
            <Link href="/admin/gold-rates/history" className="underline">Gold Rate History</Link>.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader><h2 className="font-serif text-lg">Quick Update — Base 24K Rate</h2></CardHeader>
        <CardBody><BaseRateForm /></CardBody>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {GOLD_PURITIES.map((purity) => {
          const rate = byPurity.get(purity);
          if (!rate) return null;
          return <PurityRateCard key={purity} rate={rate as GoldRate} />;
        })}
      </div>
    </div>
  );
}
