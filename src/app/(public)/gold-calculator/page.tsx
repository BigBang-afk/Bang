import type { Metadata } from "next";
import { SectionHeading } from "@/components/ui/section-heading";
import { GoldCalculatorForm } from "./calculator-form";
import { getActiveRateMap } from "@/lib/data/gold-rates";
import { getWebsiteSettings } from "@/lib/data/settings";

export const metadata: Metadata = {
  title: "Gold Calculator",
  description: "Estimate the price of your gold jewelry by purity and weight using the Zarghoon Jewellers gold calculator.",
};

export default async function GoldCalculatorPage() {
  const [activeRates, settings] = await Promise.all([getActiveRateMap(), getWebsiteSettings()]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
      <SectionHeading eyebrow="Estimate Your Price" title="Gold Calculator" description="Enter the gold purity and weight to get an instant price estimate." />
      <div className="mt-12">
        <GoldCalculatorForm activeRates={activeRates} whatsappNumber={settings.whatsapp_number} />
      </div>
    </div>
  );
}
